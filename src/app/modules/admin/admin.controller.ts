import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@Roles(UserRole.admin, UserRole.content_manager)
export class AdminController {
  constructor(
    private admin: AdminService,
    private prisma: PrismaService,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const [
      totalUsers,
      totalContents,
      totalCourses,
      totalOrders,
      totalConsultations,
      pendingOrders,
      pendingConsultations,
      draftContents,
      recentAudits,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.content.count(),
      this.prisma.course.count(),
      this.prisma.order.count(),
      this.prisma.consultationRequest.count(),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.consultationRequest.count({ where: { status: 'pending' } }),
      this.prisma.content.count({ where: { status: 'draft' } }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { phone: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalContents,
        totalCourses,
        totalOrders,
        totalConsultations,
        pendingOrders,
        pendingConsultations,
        draftContents,
      },
      recentAudits,
    };
  }

  @Get('users')
  @Roles(UserRole.admin)
  async listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.admin.listUsers(
      page || 1,
      limit || 20,
      search,
      role,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
  }

  @Get('users/:id')
  @Roles(UserRole.admin)
  async getUserDetail(@Param('id', ParseIntPipe) id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) return { error: 'کاربر یافت نشد' };

    const [orders, consultations, enrollments, auditLogs] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.consultationRequest.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.enrollment.findMany({
        where: { userId: id, isActive: true },
        include: { course: { select: { title: true } } },
      }),
      this.prisma.auditLog.findMany({
        where: { actorId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return { user, orders, consultations, enrollments, auditLogs };
  }

  @Patch('users/:id/role')
  @Roles(UserRole.admin)
  async changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: UserRole,
    @CurrentUser('id') actorId: number,
  ) {
    return this.admin.changeUserRole(id, role, actorId);
  }

  @Patch('users/:id/block')
  @Roles(UserRole.admin)
  async toggleUserBlock(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') actorId: number,
  ) {
    return this.admin.toggleUserBlock(id, actorId);
  }

  @Get('logs')
  @Roles(UserRole.admin)
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: number,
    @Query('actorId') actorId?: number,
  ) {
    const p = page || 1;
    const l = limit || 20;
    const skip = (p - 1) * l;
    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (actorId) where.actorId = actorId;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, phone: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      data,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  @Get('settings')
  @Roles(UserRole.admin)
  async getSettings() {
    return this.admin.getSettings();
  }

  @Patch('settings/:key')
  @Roles(UserRole.admin)
  async updateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
    @CurrentUser('id') actorId: number,
  ) {
    return this.admin.updateSetting(key, value, actorId);
  }
}
