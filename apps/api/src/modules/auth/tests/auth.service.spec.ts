import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { SessionService } from '../session.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  beforeAll(() => {
    // Mock environment variables for tests
    process.env.SMS_API_KEY = 'test_sms_key';
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
    process.env.FILE_ENCRYPTION_KEY = 'test_encryption_key';
    process.env.SESSION_SECRET = 'test_session_secret';
  });
  let authService: AuthService;

  const mockTx = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    session: {
      updateMany: jest.fn(),
    },
  };

  const mockPrisma = {
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
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
  };

  const mockSessionService = {
    create: jest.fn(),
    revokeAll: jest.fn(),
    getActiveSession: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SessionService, useValue: mockSessionService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('normalizePhone', () => {
    it('should keep valid 09 format', () => {
      expect(authService.normalizePhone('09123456789')).toBe('09123456789');
    });

    it('should convert +98 to 0', () => {
      expect(authService.normalizePhone('+989123456789')).toBe('09123456789');
    });

    it('should convert 0098 to 0', () => {
      expect(authService.normalizePhone('00989123456789')).toBe('09123456789');
    });

    it('should strip spaces and dashes', () => {
      expect(authService.normalizePhone('0912 345 6789')).toBe('09123456789');
    });
  });

  describe('requestOtp', () => {
    it('should reject invalid phone', async () => {
      await expect(authService.requestOtp('123')).rejects.toThrow();
    });

    it('should reject when resend limit exceeded', async () => {
      mockPrisma.oTP.count.mockResolvedValueOnce(3);
      await expect(authService.requestOtp('09123456789')).rejects.toThrow();
    });

    it('should reject when phone is blocked', async () => {
      mockPrisma.oTP.count.mockResolvedValueOnce(0);
      mockPrisma.oTP.count.mockResolvedValueOnce(5);
      await expect(authService.requestOtp('09123456789')).rejects.toThrow();
    });

    it('should create OTP and return message on success', async () => {
      mockPrisma.oTP.count.mockResolvedValueOnce(0);
      mockPrisma.oTP.count.mockResolvedValueOnce(0);
      mockPrisma.oTP.create.mockResolvedValue({ id: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Mock the private sendSms method to return true
      jest.spyOn(authService as any, 'sendSms').mockResolvedValue(true);

      const result = await authService.requestOtp('09123456789');
      expect(result.message).toBeDefined();
      expect(mockPrisma.oTP.create).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should reject invalid phone format', async () => {
      await expect(authService.verifyOtp('123', '123456')).rejects.toThrow(
        'Verification failed',
      );
    });

    it('should reject invalid code format', async () => {
      await expect(authService.verifyOtp('09123456789', 'abc')).rejects.toThrow(
        'Verification failed',
      );
    });

    it('should reject blocked phone', async () => {
      mockPrisma.oTP.count.mockResolvedValueOnce(5);
      await expect(
        authService.verifyOtp('09123456789', '123456'),
      ).rejects.toThrow('Verification failed');
    });

    it('should reject expired OTP', async () => {
      mockPrisma.oTP.count.mockResolvedValueOnce(0);
      mockPrisma.oTP.findFirst.mockResolvedValueOnce(null);
      await expect(
        authService.verifyOtp('09123456789', '123456'),
      ).rejects.toThrow('Verification failed');
    });

    it('should reject wrong code', async () => {
      const wrongHash = authService['hashToken']('000000');
      mockPrisma.oTP.count.mockResolvedValueOnce(0);
      mockPrisma.oTP.findFirst.mockResolvedValueOnce({
        id: 1,
        codeHash: wrongHash,
        attempts: 0,
        status: 'active',
        expiresAt: new Date(Date.now() + 300000),
      });
      jest
        .spyOn(
          authService as unknown as { hashToken: (s: string) => string },
          'hashToken',
        )
        .mockReturnValueOnce('different-hash');

      await expect(
        authService.verifyOtp('09123456789', '123456'),
      ).rejects.toThrow('Verification failed');
    });

    it('should create new user on first login', async () => {
      mockPrisma.oTP.count.mockResolvedValueOnce(0);
      const correctHash = authService['hashToken']('123456');
      mockPrisma.oTP.findFirst.mockResolvedValueOnce({
        id: 1,
        codeHash: correctHash,
        attempts: 0,
        status: 'active',
        expiresAt: new Date(Date.now() + 300000),
      });
      mockPrisma.oTP.updateMany.mockResolvedValue({ count: 1 });
      mockTx.user.findUnique.mockResolvedValueOnce(null);
      mockTx.user.create.mockResolvedValueOnce({
        id: 1,
        phone: '09123456789',
        role: 'user',
      });
      mockTx.user.update.mockResolvedValueOnce({
        id: 1,
        phone: '09123456789',
        role: 'user',
        firstName: '',
        lastName: '',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
      });
      mockTx.auditLog.create.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockSessionService.create.mockResolvedValue({});

      const result = await authService.verifyOtp('09123456789', '123456');
      expect(result.isNew).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should login existing user', async () => {
      mockPrisma.oTP.count.mockResolvedValueOnce(0);
      const correctHash = authService['hashToken']('123456');
      mockPrisma.oTP.findFirst.mockResolvedValueOnce({
        id: 1,
        codeHash: correctHash,
        attempts: 0,
        status: 'active',
        expiresAt: new Date(Date.now() + 300000),
      });
      mockPrisma.oTP.updateMany.mockResolvedValue({ count: 1 });
      mockTx.user.findUnique.mockResolvedValueOnce({
        id: 1,
        phone: '09123456789',
        role: 'user',
        firstName: 'علی',
        lastName: '',
        isActive: true,
      });
      mockTx.user.update.mockResolvedValueOnce({
        id: 1,
        phone: '09123456789',
        role: 'user',
        firstName: 'علی',
        lastName: '',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
      });
      mockTx.auditLog.create.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockSessionService.create.mockResolvedValue({});

      const result = await authService.verifyOtp('09123456789', '123456');
      expect(result.isNew).toBe(false);
    });
  });

  describe('logout', () => {
    it('should revoke sessions and tokens', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });
      mockSessionService.revokeAll.mockResolvedValue(undefined);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await authService.logout(1);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, isRevoked: false },
        data: { isRevoked: true },
      });
      expect(mockSessionService.revokeAll).toHaveBeenCalledWith(1);
    });
  });
});
