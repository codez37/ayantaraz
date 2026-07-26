import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserRole, Prisma } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<User | null> {
    this.logger.debug(`Finding user by phone: ${phone}`);
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async findById(id: number): Promise<User | null> {
    this.logger.debug(`Finding user by ID: ${id}`);
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(
    phone: string,
    firstName?: string,
    lastName?: string,
  ): Promise<User> {
    this.logger.log(`Creating new user with phone: ${phone}`);
    const existingUser = await this.findByPhone(phone);
    if (existingUser) {
      this.logger.warn(`User with phone ${phone} already exists`);
      throw new Error('User with this phone number already exists');
    }
    return this.prisma.user.create({
      data: {
        phone,
        firstName: firstName || '',
        lastName: lastName || '',
        role: 'user',
        isActive: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      role?: UserRole;
      isActive?: boolean;
    },
  ): Promise<User> {
    this.logger.log(`Updating user ${id}`);
    const user = await this.findById(id);
    if (!user) {
      this.logger.error(`User ${id} not found`);
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async list(
    page: number = 1,
    limit: number = 10,
    role?: UserRole,
    isActive?: boolean,
  ): Promise<{
    users: Partial<User>[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.debug(`Listing users - page: ${page}, limit: ${limit}`);
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isStaff: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      users: users,
      total,
      page,
      limit,
    };
  }

  async delete(id: number): Promise<User> {
    this.logger.log(`Deleting user ${id}`);
    const user = await this.findById(id);
    if (!user) {
      this.logger.error(`User ${id} not found`);
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async hardDelete(id: number): Promise<User> {
    this.logger.warn(`Hard deleting user ${id}`);
    const user = await this.findById(id);
    if (!user) {
      this.logger.error(`User ${id} not found`);
      throw new NotFoundException('User not found');
    }
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.session.deleteMany({ where: { userId: id } });
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findAdmins(): Promise<Partial<User>[]> {
    this.logger.debug('Finding admin users');
    return this.prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async isAdmin(phone: string): Promise<boolean> {
    const user = await this.findByPhone(phone);
    return user?.role === 'admin' && user.isActive;
  }

  async getProfile(userId: number): Promise<any> {
    this.logger.debug(`Getting profile for user ${userId}`);
    const user = await this.findById(userId);
    if (!user) {
      this.logger.error(`User ${userId} not found`);
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isStaff: user.isStaff,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<User> {
    this.logger.log(`Updating profile for user ${userId}`);
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });
  }

  async listUsers(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    users: Partial<User>[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.list(page, limit);
  }

  async updateUserRole(id: number, role: UserRole): Promise<User> {
    this.logger.log(`Updating role for user ${id} to ${role}`);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { role: role },
    });
  }

  async blockUser(id: number): Promise<User> {
    this.logger.log(`Blocking user ${id}`);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async unblockUser(id: number): Promise<User> {
    this.logger.log(`Unblocking user ${id}`);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async search(query: string, limit: number = 10): Promise<Partial<User>[]> {
    this.logger.debug(`Searching users with query: ${query}`);
    return this.prisma.user.findMany({
      where: {
        OR: [
          { phone: { contains: query } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: limit,
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  async updateLastLogin(userId: number): Promise<User> {
    this.logger.debug(`Updating last login for user ${userId}`);
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
