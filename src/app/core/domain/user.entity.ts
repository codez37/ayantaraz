import { UserRole } from '@prisma/client';

export class User {
  constructor(
    public readonly id: number,
    public phone: string,
    public email: string | null,
    public firstName: string,
    public lastName: string,
    public role: UserRole,
    public isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public lastLoginAt?: Date | null,
    public isStaff: boolean = false,
  ) {}

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  isAdmin(): boolean {
    return this.role === UserRole.admin;
  }

  isStaffUser(): boolean {
    return this.isStaff || this.isAdmin();
  }

  canAccess(resource: string, action: 'read' | 'write' | 'delete'): boolean {
    const permissions: Record<UserRole, string[]> = {
      [UserRole.user]: ['read'],
      [UserRole.consultant]: ['read', 'write'],
      [UserRole.content_manager]: ['read', 'write'],
      [UserRole.admin]: ['read', 'write', 'delete'],
    };

    return permissions[this.role]?.includes(action) || false;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      phone: this.phone,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      fullName: this.fullName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      isStaff: this.isStaff,
    };
  }
}
