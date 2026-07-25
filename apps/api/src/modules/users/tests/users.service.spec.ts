import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: { deleteMany: jest.fn() },
    session: { deleteMany: jest.fn() },
  };

  const mockUser = {
    id: 1,
    phone: '09123456789',
    firstName: 'Ali',
    lastName: 'Rezaei',
    role: 'user',
    isActive: true,
    isStaff: false,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('findByPhone', () => {
    it('should find user by phone number', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findByPhone('09123456789');
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { phone: '09123456789' },
      });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findByPhone('09999999999');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findById(1);
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user with default role and isActive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      const result = await service.create('09123456789', 'Ali', 'Rezaei');
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          phone: '09123456789',
          firstName: 'Ali',
          lastName: 'Rezaei',
          role: 'user',
          isActive: true,
        },
      });
    });

    it('should default firstName and lastName to empty string', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      await service.create('09123456789');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          phone: '09123456789',
          firstName: '',
          lastName: '',
          role: 'user',
          isActive: true,
        },
      });
    });

    it('should throw if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.create('09123456789')).rejects.toThrow(
        'already exists',
      );
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, firstName: 'New' });
      const result = await service.update(1, { firstName: 'New' });
      expect(result.firstName).toBe('New');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstName: 'New' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update(999, { firstName: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('should return paginated users with default params', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);
      const result = await service.list(1, 10);
      expect(result).toEqual({
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should calculate skip correctly for page 2', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      await service.list(2, 10);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by role when provided', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      await service.list(1, 10, 'admin' as any);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'admin' } }),
      );
    });

    it('should filter by isActive when provided', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      await service.list(1, 10, undefined, true);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should filter by both role and isActive', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      await service.list(1, 10, 'admin' as any, true);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'admin', isActive: true },
        }),
      );
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft-delete by setting isActive to false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });
      const result = await service.delete(1);
      expect(result.isActive).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('hardDelete', () => {
    it('should delete refresh tokens, sessions, then the user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      const result = await service.hardDelete(1);
      expect(result).toEqual(mockUser);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.hardDelete(999)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('findAdmins', () => {
    it('should return active admin users', async () => {
      const admins = [{ ...mockUser, role: 'admin' }];
      mockPrisma.user.findMany.mockResolvedValue(admins);
      const result = await service.findAdmins();
      expect(result).toEqual(admins);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'admin', isActive: true },
        select: expect.objectContaining({ id: true, phone: true }),
      });
    });
  });

  describe('isAdmin', () => {
    it('should return true for an active admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: 'admin',
        isActive: true,
      });
      expect(await service.isAdmin('09123456789')).toBe(true);
    });

    it('should return false for a non-admin user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      expect(await service.isAdmin('09123456789')).toBe(false);
    });

    it('should return false for an inactive admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: 'admin',
        isActive: false,
      });
      expect(await service.isAdmin('09123456789')).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await service.isAdmin('09999999999')).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return profile object for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getProfile(1);
      expect(result).toEqual({
        id: mockUser.id,
        phone: mockUser.phone,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
        isStaff: mockUser.isStaff,
        lastLoginAt: mockUser.lastLoginAt,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update firstName and lastName from dto', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'NewName',
      });
      const result = await service.updateProfile(1, {
        firstName: 'NewName',
        lastName: 'NewLast',
      });
      expect(result.firstName).toBe('NewName');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstName: 'NewName', lastName: 'NewLast' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateProfile(999, { firstName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, role: 'admin' });
      const result = await service.updateUserRole(1, 'admin' as any);
      expect(result.role).toBe('admin');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { role: 'admin' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateUserRole(999, 'admin' as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('blockUser / unblockUser', () => {
    it('should block a user (set isActive false)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });
      const result = await service.blockUser(1);
      expect(result.isActive).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
    });

    it('should unblock a user (set isActive true)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: true });
      const result = await service.unblockUser(1);
      expect(result.isActive).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: true },
      });
    });

    it('should throw NotFoundException when blocking non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.blockUser(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when unblocking non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.unblockUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('search', () => {
    it('should search by phone, firstName, and lastName with OR', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.search('ali', 5);
      expect(result).toEqual([mockUser]);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { phone: { contains: 'ali' } },
            { firstName: { contains: 'ali', mode: 'insensitive' } },
            { lastName: { contains: 'ali', mode: 'insensitive' } },
          ],
          isActive: true,
        },
        take: 5,
        select: expect.objectContaining({
          id: true,
          phone: true,
          firstName: true,
        }),
      });
    });

    it('should default limit to 10', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      await service.search('test');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update lastLoginAt to current time', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);
      await service.updateLastLogin(1);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });
});
