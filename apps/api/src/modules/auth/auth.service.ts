import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from './session.service';
import { User } from '@prisma/client';
import type { Response } from 'express';
import * as crypto from 'crypto';
import * as https from 'https';
import {
  TOKEN_ALGORITHM,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE_ACCESS,
  TOKEN_AUDIENCE_REFRESH,
  REFRESH_CLOCK_TOLERANCE,
  OTP_CODE_LENGTH,
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
} from './auth.constants';

export interface TokensResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {}

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
    await this.sendSms(normalized, code);
    return {
      message: 'OTP sent successfully',
    };

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
            action: 'auth:login',
            entityType: 'user',
            entityId: u.id,
            newValue: { phone: normalized, isNew: created },
          },
        });
        return { user: u, isNew: created };
      },
    );
    const tokens = this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    const jti = crypto.randomUUID();
    await this.sessionService.create(user.id, jti, ipAddress, deviceInfo);
    if (res) this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { user: this.sanitizeUser(user), isNew };
  }

  async logout(userId: number, res?: Response): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    await this.sessionService.revokeAll(userId);
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'auth:logout',
        entityType: 'user',
        entityId: userId,
      },
    });
    if (res) this.clearAuthCookies(res);
  }

  async refreshTokens(refreshToken: string, res?: Response) {
    let payload: {
      sub: number;
      phone: string;
      role: string;
      iss?: string;
      aud?: string;
    };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
        algorithms: [TOKEN_ALGORITHM],
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE_REFRESH,
        clockTolerance: REFRESH_CLOCK_TOLERANCE,
      });
    } catch (err: unknown) {
      const errorName = err instanceof Error ? err.name : '';
      throw new HttpException(
        errorName === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (payload.iss !== TOKEN_ISSUER || payload.aud !== TOKEN_AUDIENCE_REFRESH)
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive)
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    const hash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hash,
        userId: user.id,
        isRevoked: false,
        expiresAt: { gte: new Date() },
      },
    });
    if (!stored) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
      await this.sessionService.revokeAll(user.id);
      this.logger.warn(`Refresh token reused for user ${user.id}`);
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });
    const tokens = this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    if (res) this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { tokens, user: this.sanitizeUser(user) };
  }

  async getSessionInfo(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user || !user.isActive) {
      throw new HttpException('Session not found', HttpStatus.UNAUTHORIZED);
    }
    return { user };
  }

  private async storeRefreshToken(
    userId: number,
    token: string,
  ): Promise<void> {
    const hash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hash, expiresAt },
    });
  }

  private generateTokens(user: User): TokensResult {
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      jti: crypto.randomUUID(),
    };
    return {
      accessToken: this.jwtService.sign(payload, {
        algorithm: TOKEN_ALGORITHM,
        expiresIn: JWT_EXPIRATION,
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE_ACCESS,
        header: { typ: 'JWT', alg: TOKEN_ALGORITHM },
      }),
      refreshToken: this.jwtService.sign(payload, {
        algorithm: TOKEN_ALGORITHM,
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: JWT_REFRESH_EXPIRATION,
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE_REFRESH,
        header: { typ: 'JWT', alg: TOKEN_ALGORITHM },
      }),
    };
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: COOKIE_HTTP_ONLY,
      secure: isProduction ? COOKIE_SECURE : false,
      sameSite: COOKIE_SAME_SITE,
      maxAge: COOKIE_ACCESS_TOKEN_MAX_AGE,
      path: '/',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: COOKIE_HTTP_ONLY,
      secure: isProduction ? COOKIE_SECURE : false,
      sameSite: COOKIE_SAME_SITE,
      maxAge: COOKIE_REFRESH_TOKEN_MAX_AGE,
      path: '/',
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
  }


  private async sendSms(phone: string, code: string): Promise<void> {
    const apiKey = process.env.SMS_API_KEY;
    if (!apiKey) {
      throw new Error('SMS_API_KEY is not configured. OTP functionality requires a valid SMS provider API key.');
    }

    try {
      const url = 'https://s.api.ir/api/sw1/SmsOTP';
      const body = JSON.stringify({ code, mobile: phone, templateId: 1 });

      const response = await new Promise<{ status: number; data: string }>((resolve, reject) => {
        const req = https.request(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 10000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => resolve({ status: res.statusCode || 0, data }));
          },
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('SMS provider timeout after 10 seconds'));
        });
        req.write(body);
        req.end();
      });

      if (response.status !== 200) {
        throw new Error(`SMS provider returned HTTP ${response.status}: ${response.data}`);
      }

      const result = JSON.parse(response.data);
      if (result.success === false) {
        throw new Error(`SMS provider rejected request: ${JSON.stringify(result)}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown SMS delivery error';
      this.logger.error(`SMS delivery failed for phone ${phone}: ${errorMessage}`);
      throw new Error('Failed to send SMS. Please try again later or contact support.');
    }
  }
}
