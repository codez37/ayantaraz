import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async list(
    page = 1,
    limit = 50,
    filters?: { action?: string; entityType?: string; userId?: number },
  ) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters?.action) where.action = { contains: filters.action };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.userId) where.actorId = filters.userId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
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
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
