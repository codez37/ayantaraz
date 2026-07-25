import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 1,
    phone: '09120000001',
    firstName: 'Ali',
    lastName: 'Rezaei',
    role: 'user',
    isActive: true,
    isStaff: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  describe('findByPhone / findById', () => {
    it('should find a user by phone', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      const result = await service.findByPhone('09120000001');
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { phone: '09120000001' },
      });
    });

    it('should find a user by id', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      const result = await service.findById(1);
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('create', () => {
    it('should create a new user with default role and active flag', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce(mockUser);

      const result = await service.create('09120000001', 'Ali', 'Rezaei');
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          phone: '09120000001',
          firstName: 'Ali',
          lastName: 'Rezaei',
          role: 'user',
          isActive: true,
        },
      });
    });

    it('should throw when a user with the phone already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      await expect(service.create('09120000001')).rejects.toThrow(
        'already exists',
      );
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.update(999, { firstName: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update an existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce({
        ...mockUser,
        firstName: 'x',
      });
      const result = await service.update(1, { firstName: 'x' });
      expect(result.firstName).toBe('x');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstName: 'x' },
      });
    });
  });

  describe('list', () => {
    it('should return paginated users with total and select only safe fields', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([mockUser]);
      mockPrisma.user.count.mockResolvedValueOnce(1);

      const result = await service.list(1, 10);
      expect(result).toEqual({
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should compute skip from page and limit', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([]);
      mockPrisma.user.count.mockResolvedValueOnce(0);
      await service.list(3, 20);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('should apply role and isActive filters to the where clause', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([]);
      mockPrisma.user.count.mockResolvedValueOnce(0);
      await service.list(1, 10, 'admin', false);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'admin', isActive: false } }),
      );
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft-delete by setting isActive=false', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });
      const result = await service.delete(1);
      expect(result.isActive).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when deleting a missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('hardDelete', () => {
    it('should remove tokens and sessions before deleting the user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.refreshToken.deleteMany.mockResolvedValueOnce({ count: 2 });
      mockPrisma.session.deleteMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.user.delete.mockResolvedValueOnce(mockUser);

      await service.hardDelete(1);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when hard-deleting a missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.hardDelete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('isAdmin', () => {
    it('should return true for an active admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        role: 'admin',
        isActive: true,
      });
      await expect(service.isAdmin('09120000001')).resolves.toBe(true);
    });

    it('should return false for an inactive admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        role: 'admin',
        isActive: false,
      });
      await expect(service.isAdmin('09120000001')).resolves.toBe(false);
    });

    it('should return false for a non-admin user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      await expect(service.isAdmin('09120000001')).resolves.toBe(false);
    });

    it('should return false when no user is found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.isAdmin('00000000000')).resolves.toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return a safe profile projection', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      const result = await service.getProfile(1);
      expect(result).toMatchObject({
        id: 1,
        phone: '09120000001',
        role: 'user',
        isActive: true,
      });
    });

    it('should throw NotFoundException for missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update only firstName/lastName', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce({
        ...mockUser,
        firstName: 'New',
      });
      await service.updateProfile(1, { firstName: 'New', lastName: 'Rezaei' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstName: 'New', lastName: 'Rezaei' },
      });
    });
  });

  describe('blockUser / unblockUser', () => {
    it('should block a user by setting isActive=false', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });
      const result = await service.blockUser(1);
      expect(result.isActive).toBe(false);
    });

    it('should unblock a user by setting isActive=true', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });
      mockPrisma.user.update.mockResolvedValueOnce({
        ...mockUser,
        isActive: true,
      });
      const result = await service.unblockUser(1);
      expect(result.isActive).toBe(true);
    });
  });

  describe('updateUserRole', () => {
    it('should update the role of an existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce({
        ...mockUser,
        role: 'admin',
      });
      const result = await service.updateUserRole(1, 'admin');
      expect(result.role).toBe('admin');
    });
  });

  describe('search', () => {
    it('should search active users by phone or name', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([mockUser]);
      const result = await service.search('0912', 5);
      expect(result).toEqual([mockUser]);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
          take: 5,
        }),
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should set lastLoginAt to the current time', async () => {
      mockPrisma.user.update.mockResolvedValueOnce(mockUser);
      await service.updateLastLogin(1);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });
});
