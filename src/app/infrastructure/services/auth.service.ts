import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { IAuthService } from '../../core/services/auth.service.interface';
import { User } from '../../core/domain/user.entity';
import { IUserRepository } from '../../core/repositories/user.repository.interface';
import { PrismaUserRepository } from '../persistence/prisma/prisma-user.repository';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private userRepository: IUserRepository,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        phone: user.phone,
        role: user.role,
      },
      {
        expiresIn: process.env.JWT_EXPIRATION || '15m',
        secret: process.env.JWT_SECRET,
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
      },
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
        secret: process.env.JWT_REFRESH_SECRET,
      },
    );

    // Save refresh token to database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<{
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.sub,
          expiresAt: { gt: new Date() },
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return { user, tokens };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateAccessToken(token: string): Promise<{ sub: number; phone: string; role: string }> {
    try {
      return this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async validateRefreshToken(token: string): Promise<{ sub: number }> {
    try {
      return this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async invalidateRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async invalidateAllRefreshTokens(userId: number): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
