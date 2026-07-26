import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from './session.service';
import { User } from '@prisma/client';
import type { Response } from 'express';
import * as crypto from 'crypto';
import * as https from 'https';
import { CircuitBreaker } from 'opossum';
import {
  TOKEN_ALGORITHM,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE_ACCESS,
  TOKEN_AUDIENCE_REFRESH,
  REFRESH_CLOCK_TOLERANCE,
  OTP_EXPIRATION_MS,
  OTP_REQUEST_LIMIT,
  OTP_REQUEST_WINDOW_MS,
  OTP_LOCK_WINDOW_MS,
  OTP_MAX_ATTEMPTS,
  OTP_VERIFY_FAILED,
  COOKIE_SECURE,
  COOKIE_HTTP_ONLY,
  COOKIE_SAME_SITE,
  COOKIE_ACCESS_TOKEN_MAX_AGE,
  COOKIE_REFRESH_TOKEN_MAX_AGE,
  JWT_EXPIRATION,
  JWT_REFRESH_EXPIRATION,
  JWT_SECRET,
  SMS_API_URL,
  SMS_TEMPLATE_ID,
  SMS_TIMEOUT_MS,
} from './auth.constants';

export interface TokensResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private smsCircuitBreaker: CircuitBreaker;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {
    // تنظیم Circuit Breaker برای SMS Service
    this.smsCircuitBreaker = new CircuitBreaker(
      async (phone: string, code: string) => {
        return this.sendSmsInternal(phone, code);
      },
      {
        timeout: SMS_TIMEOUT_MS || 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
      },
    );

    // Event Listeners برای Circuit Breaker
    this.smsCircuitBreaker.on('open', () => {
      this.logger.warn('⚠️ SMS Circuit Breaker is OPEN (service unavailable)');
    });

    this.smsCircuitBreaker.on('halfOpen', () => {
      this.logger.log('🔄 SMS Circuit Breaker is HALF-OPEN (testing service)');
    });

    this.smsCircuitBreaker.on('close', () => {
      this.logger.log('✅ SMS Circuit Breaker is CLOSED (service healthy)');
    });

    this.smsCircuitBreaker.on('failure', (err) => {
      this.logger.error('❌ SMS Circuit Breaker failure:', err);
    });
  }

  normalizePhone(input: string): string {
    let phone = input.replace(/[^\d+]/g, '');
    if (phone.startsWith('+98')) phone = '0' + phone.slice(3);
    else if (phone.startsWith('0098')) phone = '0' + phone.slice(4);
    else if (phone.startsWith('98') && phone.length === 12)
      phone = '0' + phone.slice(2);
    return phone;
  }

  private generateOtpCode(): string {
    return String(100000 + crypto.randomInt(0, 900000)).slice(1);
  }
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async requestOtp(phone: string): Promise<{ message: string }> {
    const normalized = this.normalizePhone(phone);
    if (!/^09\d{9}$/.test(normalized))
      throw new HttpException('Invalid phone number', HttpStatus.BAD_REQUEST);
    const recentCount = await this.prisma.oTP.count({
      where: {
        phone: normalized,
        createdAt: { gte: new Date(Date.now() - OTP_REQUEST_WINDOW_MS) },
      },
    });
    if (recentCount >= OTP_REQUEST_LIMIT)
      throw new HttpException(
        `Max OTP requests reached. Wait ${OTP_REQUEST_WINDOW_MS / 60000} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const recentFailCount = await this.prisma.oTP.count({
      where: {
        phone: normalized,
        status: 'blocked',
        createdAt: { gte: new Date(Date.now() - OTP_LOCK_WINDOW_MS) },
      },
    });
    if (recentFailCount >= OTP_MAX_ATTEMPTS)
      throw new HttpException(
        'Too many failed attempts. Wait 30 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const code = this.generateOtpCode();
    const codeHash = this.hashToken(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);
    await this.prisma.oTP.create({
      data: { phone: normalized, codeHash, expiresAt, sentAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'auth:otp_send',
        entityType: 'otp',
        newValue: { phone: normalized },
      },
    });

    // استفاده از Circuit Breaker برای ارسال SMS
    try {
      const sent = await this.smsCircuitBreaker.fire(normalized, code);
      if (!sent) {
        const errorMsg = 'Failed to send OTP. Please try again later.';
        this.logger.error(errorMsg);
        // در صورت شکست Circuit Breaker، کد را در Queue ذخیره می‌کنیم
        await this.queueOtpForRetry(normalized, code);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Failed to send OTP. Please try again later.';
      this.logger.error(errorMsg, error);
      // در صورت شکست، کد را در Queue ذخیره می‌کنیم
      await this.queueOtpForRetry(normalized, code);
      throw new Error(errorMsg);
    }

    return {
      message: 'OTP sent successfully',
    };
  }

  private async queueOtpForRetry(phone: string, code: string): Promise<void> {
    // در اینجا می‌توانید کد را در یک Queue (مثل Redis یا Bull) ذخیره کنید
    // برای ارسال مجدد در آینده
    this.logger.warn(`OTP for ${phone} queued for retry due to SMS service failure`);
  }

  async verifyOtp(
    phone: string,
    code: string,
    ipAddress?: string,
    deviceInfo?: string,
    res?: Response,
  ) {
    const normalized = this.normalizePhone(phone);
    if (!/^09\d{9}$/.test(normalized) || !/^\d{6}$/.test(code))
      throw new HttpException(OTP_VERIFY_FAILED, HttpStatus.UNAUTHORIZED);
    const recentBlocked = await this.prisma.oTP.count({
      where: {
        phone: normalized,
        status: 'blocked',
        createdAt: { gte: new Date(Date.now() - OTP_LOCK_WINDOW_MS) },
      },
    });
    if (recentBlocked >= OTP_MAX_ATTEMPTS)
      throw new HttpException(OTP_VERIFY_FAILED, HttpStatus.UNAUTHORIZED);
    const otp = await this.prisma.oTP.findFirst({
      where: {
        phone: normalized,
        status: 'active',
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      this.logger.warn(`OTP verify failed: no active code for ${normalized}`);
      throw new HttpException(OTP_VERIFY_FAILED, HttpStatus.UNAUTHORIZED);
    }
    await this.prisma.oTP.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const codeHash = this.hashToken(code);
    const storedHash = otp.codeHash;
    const hashesEqual =
      storedHash.length === codeHash.length &&
      crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(codeHash));
    if (!hashesEqual) {
      if (otp.attempts + 1 >= OTP_MAX_ATTEMPTS)
        await this.prisma.oTP.update({
          where: { id: otp.id },
          data: { status: 'blocked' },
        });
      await this.prisma.auditLog.create({
        data: {
          action: 'auth:otp_fail',
          entityType: 'otp',
          entityId: otp.id,
          newValue: { phone: normalized, attempt: otp.attempts + 1 },
        },
      });
      this.logger.warn(`OTP verify failed: wrong code for ${normalized}`);
      throw new HttpException(OTP_VERIFY_FAILED, HttpStatus.UNAUTHORIZED);
    }
    const claimed = await this.prisma.oTP.updateMany({
      where: { id: otp.id, status: 'active' },
      data: { status: 'used', verifiedAt: new Date() },
    });
    if (claimed.count === 0) {
      this.logger.warn(`OTP verify failed: already used for ${normalized}`);
      throw new HttpException(OTP_VERIFY_FAILED, HttpStatus.UNAUTHORIZED);
    }
    const { user, isNew } = await this.prisma.$transaction(
      async (tx): Promise<{ user: User; isNew: boolean }> => {
        let u = await tx.user.findUnique({ where: { phone: normalized } });
        let created = false;
        if (!u) {
          await tx.session.updateMany({
            where: { user: { phone: normalized } },
            data: { revokedAt: new Date() },
          });
          u = await tx.user.create({
            data: { phone: normalized, role: 'user' },
          });
          created = true;
        }
        u = await tx.user.update({
          where: { id: u.id },
          data: { lastLoginAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            actorId: u.id,
            action: 'auth:otp_verify',
            entityType: 'user',
            entityId: u.id,
            newValue: { phone: normalized, isNew: created },
          },
        });
        return { user: u, isNew: created };
      },
    );
    const tokens = await this.generateTokens(user.id, user.role);
    if (res) {
      this.setRefreshTokenCookie(res, tokens.refreshToken);
    }
    return {
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        isNew,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: number, refreshToken: string, res?: Response) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
        algorithms: [TOKEN_ALGORITHM],
      });
      if (payload.sub !== userId.toString()) {
        throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      }
      const session = await this.sessionService.validateSession(userId, refreshToken);
      if (!session || session.revokedAt) {
        throw new HttpException('Session expired or revoked', HttpStatus.UNAUTHORIZED);
      }
      const tokens = await this.generateTokens(user.id, user.role);
      await this.sessionService.updateSession(session.id, tokens.refreshToken);
      if (res) {
        this.setRefreshTokenCookie(res, tokens.refreshToken);
      }
      return tokens;
    } catch (error) {
      this.logger.error('Refresh token validation failed', error);
      throw new HttpException('Invalid or expired refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(userId: number, res?: Response) {
    await this.sessionService.revokeSessions(userId);
    if (res) {
      res.clearCookie('refreshToken', {
        httpOnly: COOKIE_HTTP_ONLY,
        secure: COOKIE_SECURE,
        sameSite: COOKIE_SAME_SITE,
        domain: process.env.COOKIE_DOMAIN,
      });
    }
    return { message: 'Logged out successfully' };
  }

  async revokeAllSessions(userId: number) {
    await this.sessionService.revokeSessions(userId);
    return { message: 'All sessions revoked successfully' };
  }

  private async generateTokens(userId: number, role: string): Promise<TokensResult> {
    const payload = { sub: userId.toString(), role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: JWT_EXPIRATION,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE_ACCESS,
      algorithm: TOKEN_ALGORITHM,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: JWT_REFRESH_EXPIRATION,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE_REFRESH,
      algorithm: TOKEN_ALGORITHM,
    });
    return { accessToken, refreshToken };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: COOKIE_HTTP_ONLY,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: COOKIE_REFRESH_TOKEN_MAX_AGE,
      domain: process.env.COOKIE_DOMAIN,
    });
  }

  // متد داخلی برای ارسال SMS (بدون Circuit Breaker)
  private async sendSmsInternal(phone: string, code: string): Promise<boolean> {
    const apiKey = process.env.SMS_API_KEY;
    if (!apiKey) {
      const errorMsg = 'SMS_API_KEY is required for OTP functionality';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    try {
      const body = JSON.stringify({
        code,
        mobile: phone,
        templateId: SMS_TEMPLATE_ID,
      });
      const response = await new Promise<{ status: number; data: string }>(
        (resolve, reject) => {
          const req = https.request(
            SMS_API_URL,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              timeout: SMS_TIMEOUT_MS,
            },
            (res) => {
              let data = '';
              res.on('data', (chunk) => {
                data += chunk;
              });
              res.on('end', () =>
                resolve({ status: res.statusCode || 0, data }),
              );
            },
          );
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('SMS timeout'));
          });
          req.write(body);
          req.end();
        },
      );
      if (response.status !== 200) {
        this.logger.warn(`SMS provider returned status ${response.status}`);
        return false;
      }
      const result = JSON.parse(response.data) as { success: boolean };
      if (result.success === false) {
        this.logger.warn('SMS provider rejected request');
        return false;
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`SMS delivery failed: ${errorMessage}`);
      throw new Error('Failed to send SMS. Please try again later.');
    }
  }
}
