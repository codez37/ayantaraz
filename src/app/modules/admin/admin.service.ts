import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [users, contents, consultations, orders, conversations] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.content.count(),
        this.prisma.consultationRequest.count(),
        this.prisma.order.count(),
        this.prisma.chatConversation.count(),
      ]);

    const recentUsers = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    return {
      stats: { users, contents, consultations, orders, conversations },
      recentUsers,
    };
  }

  async listUsers(
    page: number,
    limit: number,
    search?: string,
    role?: string,
    isActive?: boolean,
  ) {
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
        { phone: { contains: search } },
      ];
    }
    if (role) where.role = role as import('@prisma/client').UserRole;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
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
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async changeUserRole(userId: number, role: UserRole, actorId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpException('کاربر یافت نشد', HttpStatus.NOT_FOUND);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, phone: true, role: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'admin:change_role',
        entityType: 'user',
        entityId: userId,
        oldValue: { role: user.role },
        newValue: { role },
      },
    });
    return updated;
  }

  async toggleUserBlock(userId: number, actorId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpException('کاربر یافت نشد', HttpStatus.NOT_FOUND);

    if (user.role === 'admin') {
      throw new HttpException(
        'امکان مسدود کردن مدیر اصلی وجود ندارد',
        HttpStatus.FORBIDDEN,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, phone: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: user.isActive ? 'admin:block_user' : 'admin:unblock_user',
        entityType: 'user',
        entityId: userId,
        oldValue: { isActive: user.isActive },
        newValue: { isActive: !user.isActive },
      },
    });
    return updated;
  }

  private readonly ALLOWED_SETTINGS = new Set([
    'site_name',
    'site_description',
    'contact_email',
    'contact_phone',
    'maintenance_mode',
    'tax_law_version',
    'default_tax_year',
    'max_upload_size',
  ]);

  async updateSetting(key: string, value: string, actorId: number) {
    // Validate key against allowlist
    if (!this.ALLOWED_SETTINGS.has(key)) {
      throw new HttpException(
        'کلید تنظیمات نامعتبر است',
        HttpStatus.BAD_REQUEST,
      );
    }

    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, updatedBy: actorId },
      update: { value, updatedBy: actorId },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'admin:update_setting',
        entityType: 'system_setting',
        entityId: setting.id,
        newValue: { key, value },
      },
    });
    return setting;
  }

  async getSettings() {
    return this.prisma.systemSetting.findMany();
  }
}
