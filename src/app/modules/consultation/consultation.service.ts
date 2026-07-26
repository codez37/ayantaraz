import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsultationStatus, Prisma } from '@prisma/client';
import { formatPersianTimestamp } from '@ayantaraz/shared';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['contacted', 'scheduled', 'canceled', 'rejected'],
  contacted: ['scheduled', 'completed', 'no_response', 'canceled'],
  scheduled: ['completed', 'canceled'],
  no_response: ['contacted', 'canceled', 'rejected'],
};

const UNREACHABLE = ['completed', 'canceled', 'rejected'];

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

@Injectable()
export class ConsultationService {
  constructor(private prisma: PrismaService) {}

  private formatNote(
    existingNotes: string,
    note: string,
    actorName: string,
  ): string {
    const timestamp = formatPersianTimestamp(new Date());
    const entry = `[${timestamp}] ${actorName}:\n${note}\n---\n`;
    return existingNotes ? existingNotes + '\n' + entry : entry;
  }

  private async audit(
    actorId: number,
    action: string,
    entityId: number,
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'consultation',
        entityId,
        oldValue: (oldValue as Prisma.InputJsonValue) ?? Prisma.DbNull,
        newValue: (newValue as Prisma.InputJsonValue) ?? Prisma.DbNull,
      },
    });
  }

  async create(
    data: {
      subject?: string;
      requestType?: string;
      message?: string;
      description?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      preferredTime?: string;
    },
    userId?: number,
  ) {
    let effectiveUserId = userId;
    let firstName = data.firstName || '';
    let lastName = data.lastName || '';
    let phoneNumber = data.phoneNumber || '';
    const subject = data.subject || data.requestType || 'general';
    const message = data.message || data.description || '';

    if (!effectiveUserId) {
      if (!phoneNumber) {
        throw new HttpException(
          'شماره تلفن الزامی است',
          HttpStatus.BAD_REQUEST,
        );
      }
      let user = await this.prisma.user.findUnique({
        where: { phone: phoneNumber },
      });
      if (!user) {
        user = await this.prisma.user.create({
          data: { phone: phoneNumber, firstName, lastName },
        });
      }
      effectiveUserId = user.id;
      if (!firstName) firstName = user.firstName ?? '';
      if (!lastName) lastName = user.lastName ?? '';
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: effectiveUserId },
      });
      if (!user)
        throw new HttpException('کاربر یافت نشد', HttpStatus.NOT_FOUND);
      if (!firstName) firstName = user.firstName ?? '';
      if (!lastName) lastName = user.lastName ?? '';
      if (!phoneNumber) phoneNumber = user.phone ?? '';
    }

    if (!phoneNumber) {
      throw new HttpException('شماره تلفن الزامی است', HttpStatus.BAD_REQUEST);
    }

    const recent = await this.prisma.consultationRequest.findFirst({
      where: {
        userId: effectiveUserId,
        requestType: subject as import('@prisma/client').ConsultationType,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      },
    });
    if (recent) {
      throw new HttpException(
        'درخواست مشابه قبلاً ثبت شده است. لطفاً منتظر تماس کارشناسان باشید.',
        HttpStatus.CONFLICT,
      );
    }

    const count = await this.prisma.consultationRequest.count({
      where: {
        userId: effectiveUserId,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    });
    if (count >= RATE_LIMIT_MAX) {
      throw new HttpException(
        'تعداد درخواست‌های شما محدود شده است. لطفاً بعداً تلاش کنید.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const consultation = await this.prisma.consultationRequest.create({
      data: {
        userId: effectiveUserId,
        requestType: subject as import('@prisma/client').ConsultationType,
        description: message,
        firstName,
        lastName,
        phoneNumber,
        preferredTime: data.preferredTime || '',
        status: 'pending',
      },
    });

    await this.audit(
      effectiveUserId,
      'consultation_create',
      consultation.id,
      undefined,
      {
        type: data.subject,
        phone: phoneNumber,
      },
    );

    return consultation;
  }

  async list(userId: number, role: string, page?: number, limit?: number) {
    const p = Math.max(1, page || 1);
    const l = Math.min(100, Math.max(1, limit || 20));
    const skip = (p - 1) * l;

    const where: Prisma.ConsultationRequestWhereInput = {};
    if (role === 'user') {
      where.userId = userId;
    } else if (role === 'consultant') {
      where.OR = [{ assignedToId: userId }, { assignedToId: null }];
    }

    const [data, total] = await Promise.all([
      this.prisma.consultationRequest.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, phone: true, firstName: true, lastName: true },
          },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.consultationRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async getById(id: number, userId: number, role: string) {
    const where: Prisma.ConsultationRequestWhereInput = { id };
    if (role === 'user') where.userId = userId;
    if (role === 'consultant') {
      where.OR = [{ assignedToId: userId }, { assignedToId: null }];
    }

    const consultation = await this.prisma.consultationRequest.findFirst({
      where,
      include: {
        user: {
          select: { id: true, phone: true, firstName: true, lastName: true },
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!consultation)
      throw new HttpException('درخواست مشاوره یافت نشد', HttpStatus.NOT_FOUND);
    return consultation;
  }

  async updateStatus(
    id: number,
    dto: {
      status: ConsultationStatus;
      internalNotes?: string;
      assignedToId?: number;
    },
    userId: number,
    userRole: string,
  ) {
    const existing = await this.prisma.consultationRequest.findUnique({
      where: { id },
    });
    if (!existing)
      throw new HttpException('درخواست مشاوره یافت نشد', HttpStatus.NOT_FOUND);

    const from = existing.status;
    const to = dto.status;

    if (UNREACHABLE.includes(from)) {
      throw new HttpException(
        'این درخواست در وضعیت نهایی قرار دارد',
        HttpStatus.BAD_REQUEST,
      );
    }

    const allowed = VALID_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new HttpException(
        'این تغییر وضعیت مجاز نیست',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (to === 'rejected' && userRole !== 'admin') {
      throw new HttpException(
        'فقط مدیر می‌تواند درخواست را رد کند',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      to === 'canceled' &&
      userRole === 'user' &&
      existing.status !== 'pending'
    ) {
      throw new HttpException(
        'فقط درخواست‌های در انتظار بررسی قابل لغو توسط کاربر هستند',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const txUpdateData: Prisma.ConsultationRequestUpdateInput = {
        status: to,
      };

      if (to === 'contacted' && !existing.contactedAt)
        txUpdateData.contactedAt = new Date();
      if (to === 'completed') txUpdateData.completedAt = new Date();
      if (to === 'canceled') txUpdateData.canceledAt = new Date();
      if (dto.assignedToId !== undefined)
        txUpdateData.assignedTo = { connect: { id: dto.assignedToId } };
      if (dto.internalNotes !== undefined) {
        const actor = await tx.user.findUnique({
          where: { id: userId },
        });
        const actorName =
          `${actor?.firstName ?? ''} ${actor?.lastName ?? ''}`.trim() ||
          `کاربر #${userId}`;
        txUpdateData.internalNotes = this.formatNote(
          existing.internalNotes || '',
          dto.internalNotes,
          actorName,
        );
      }

      const consultation = await tx.consultationRequest.update({
        where: { id },
        data: txUpdateData,
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: `consultation_status_${to}`,
          entityType: 'consultation',
          entityId: id,
          oldValue:
            to === 'contacted' || to === 'completed' || to === 'canceled'
              ? { status: from }
              : {
                  status: from,
                  assignedToId: dto.assignedToId,
                },
          newValue: {
            status: to,
            assignedToId: dto.assignedToId,
          },
        },
      });

      return consultation;
    });
  }

  async assign(
    id: number,
    assigneeId: number,
    userId: number,
    userRole: string,
  ) {
    if (userRole !== 'admin' && userRole !== 'consultant') {
      throw new HttpException('دسترسی غیرمجاز', HttpStatus.FORBIDDEN);
    }

    const existing = await this.prisma.consultationRequest.findUnique({
      where: { id },
    });
    if (!existing)
      throw new HttpException('درخواست مشاوره یافت نشد', HttpStatus.NOT_FOUND);

    if (userRole !== 'admin' && assigneeId !== userId) {
      throw new HttpException(
        'فقط مدیر می‌تواند درخواست را به دیگران ارجاع دهد',
        HttpStatus.FORBIDDEN,
      );
    }

    const consultation = await this.prisma.consultationRequest.update({
      where: { id },
      data: { assignedToId: assigneeId },
    });

    await this.audit(
      userId,
      'consultation_assign',
      id,
      { previousAssignee: existing.assignedToId ?? undefined },
      { newAssignee: assigneeId },
    );

    return consultation;
  }

  async addNote(id: number, note: string, userId: number, userRole: string) {
    const where: Prisma.ConsultationRequestWhereInput = { id };
    if (userRole === 'user') where.userId = userId;

    const existing = await this.prisma.consultationRequest.findFirst({ where });
    if (!existing)
      throw new HttpException('درخواست مشاوره یافت نشد', HttpStatus.NOT_FOUND);

    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    const actorName =
      `${actor?.firstName ?? ''} ${actor?.lastName ?? ''}`.trim() ||
      `کاربر #${userId}`;
    const updatedNotes = this.formatNote(
      existing.internalNotes || '',
      note,
      actorName,
    );

    const consultation = await this.prisma.consultationRequest.update({
      where: { id },
      data: { internalNotes: updatedNotes },
    });

    await this.audit(userId, 'consultation_note_added', id, undefined, {
      noteLength: note.length,
    });

    return consultation;
  }

  async getAuditLog(id: number, userId: number, userRole: string) {
    if (userRole === 'user') {
      const req = await this.prisma.consultationRequest.findFirst({
        where: { id, userId },
      });
      if (!req)
        throw new HttpException(
          'درخواست مشاوره یافت نشد',
          HttpStatus.NOT_FOUND,
        );
    }

    return this.prisma.auditLog.findMany({
      where: { entityType: 'consultation', entityId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
