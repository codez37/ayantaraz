import { UserRole } from '@prisma/client';
import { User } from '../domain/user.entity';
import { PaginationOptions, PaginationResult } from '../types/pagination.types';

export interface IUserRepository {
  // Find operations
  findById(id: number): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(options: PaginationOptions & { role?: UserRole; isActive?: boolean }): Promise<PaginationResult<User>>;

  // Create operations
  create(data: {
    phone: string;
    email?: string;
    firstName: string;
    lastName: string;
    password: string;
    role?: UserRole;
  }): Promise<User>;

  // Update operations
  update(id: number, data: Partial<{
    phone: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    isStaff: boolean;
    password: string;
  }>): Promise<User>;

  // Delete operations
  delete(id: number): Promise<void>;

  // Utility operations
  existsByPhone(phone: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  countByRole(role: UserRole): Promise<number>;

  // Update last login
  updateLastLogin(id: number): Promise<User>;
}
