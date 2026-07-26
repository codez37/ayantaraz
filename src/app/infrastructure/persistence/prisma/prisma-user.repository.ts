import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IUserRepository } from '../../../core/repositories/user.repository.interface';
import { User } from '../../../core/domain/user.entity';
import { UserRole } from '@prisma/client';
import { PaginationOptions, PaginationResult, createPagination } from '../../../core/types/pagination.types';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return new User(
      user.id,
      user.phone,
      user.email,
      user.firstName,
      user.lastName,
      user.role,
      user.isActive,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
      user.isStaff,
    );
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) return null;

    return new User(
      user.id,
      user.phone,
      user.email,
      user.firstName,
      user.lastName,
      user.role,
      user.isActive,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
      user.isStaff,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return new User(
      user.id,
      user.phone,
      user.email,
      user.firstName,
      user.lastName,
      user.role,
      user.isActive,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
      user.isStaff,
    );
  }

  async findAll(options: PaginationOptions & { role?: UserRole; isActive?: boolean }): Promise<PaginationResult<User>> {
    const { page = 1, limit = 10, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    const where: any = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const result = users.map(user =>
      new User(
        user.id,
        user.phone,
        user.email,
        user.firstName,
        user.lastName,
        user.role,
        user.isActive,
        user.createdAt,
        user.updatedAt,
        user.lastLoginAt,
        user.isStaff,
      )
    );

    return createPagination(result, total, options);
  }

  async create(data: {
    phone: string;
    email?: string;
    firstName: string;
    lastName: string;
    password: string;
    role?: UserRole;
  }): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        phone: data.phone,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        role: data.role || UserRole.user,
      },
    });

    return new User(
      user.id,
      user.phone,
      user.email,
      user.firstName,
      user.lastName,
      user.role,
      user.isActive,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
      user.isStaff,
    );
  }

  async update(id: number, data: Partial<{
    phone: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    isStaff: boolean;
  }>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return new User(
      user.id,
      user.phone,
      user.email,
      user.firstName,
      user.lastName,
      user.role,
      user.isActive,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
      user.isStaff,
    );
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { phone },
    });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.prisma.user.count({
      where: { role },
    });
  }

  async updateLastLogin(id: number): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });

    return new User(
      user.id,
      user.phone,
      user.email,
      user.firstName,
      user.lastName,
      user.role,
      user.isActive,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
      user.isStaff,
    );
  }
}
