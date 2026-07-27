import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../session.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Mock PrismaService
const mockPrismaService = {
  oTP: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  session: {
    updateMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock JwtService
const mockJwtService = {
  sign: jest.fn(() => 'test-token'),
  verify: jest.fn(() => ({ sub: '1', role: 'user' })),
};

// Mock SessionService
const mockSessionService = {
  validateSession: jest.fn(() => ({ id: 1, revokedAt: null })),
  updateSession: jest.fn(),
  revokeSessions: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
      SMS_API_KEY: 'test-api-key',
      SMS_TIMEOUT_MS: '5000',
    };
    return config[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalizePhone', () => {
    it('should normalize phone with +98 prefix', () => {
      expect(service.normalizePhone('+989123456789')).toBe('09123456789');
    });

    it('should normalize phone with 0098 prefix', () => {
      expect(service.normalizePhone('00989123456789')).toBe('09123456789');
    });

    it('should normalize phone with 98 prefix (12 digits)', () => {
      expect(service.normalizePhone('989123456789')).toBe('09123456789');
    });

    it('should return phone as-is if already normalized', () => {
      expect(service.normalizePhone('09123456789')).toBe('09123456789');
    });
  });

  describe('requestOtp', () => {
    it('should throw error for invalid phone number', async () => {
      await expect(service.requestOtp('123')).rejects.toThrow(
        new HttpException('Invalid phone number', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw error when OTP request limit reached', async () => {
      mockPrismaService.oTP.count.mockResolvedValue(10); // More than OTP_REQUEST_LIMIT
      await expect(service.requestOtp('09123456789')).rejects.toThrow(
        new HttpException(
          'Max OTP requests reached. Wait 10 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it('should create OTP and return success message', async () => {
      mockPrismaService.oTP.count.mockResolvedValue(0);
      mockPrismaService.oTP.create.mockResolvedValue({ id: 1 });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 1 });
      
      // Mock sendSms to return true
      jest.spyOn(service as any, 'sendSmsInternal').mockResolvedValue(true);

      const result = await service.requestOtp('09123456789');
      expect(result).toEqual({ message: 'OTP sent successfully' });
    });
  });

  describe('verifyOtp', () => {
    it('should throw error for invalid phone or code', async () => {
      await expect(service.verifyOtp('123', '123456')).rejects.toThrow(
        new HttpException('OTP verification failed', HttpStatus.UNAUTHORIZED),
      );
    });

    it('should throw error when OTP is blocked', async () => {
      mockPrismaService.oTP.count.mockResolvedValue(5); // More than OTP_MAX_ATTEMPTS
      await expect(service.verifyOtp('09123456789', '123456')).rejects.toThrow(
        new HttpException('OTP verification failed', HttpStatus.UNAUTHORIZED),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should throw error when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens(999, 'refresh-token')).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should return new tokens when refresh token is valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1, role: 'user' });
      mockSessionService.validateSession.mockResolvedValue({ id: 1, revokedAt: null });
      mockSessionService.updateSession.mockResolvedValue({ id: 1 });

      const result = await service.refreshTokens(1, 'refresh-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('logout', () => {
    it('should revoke sessions and return success message', async () => {
      mockSessionService.revokeSessions.mockResolvedValue({ count: 1 });
      const result = await service.logout(1);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
