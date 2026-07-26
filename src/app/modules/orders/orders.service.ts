import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { formatPersianTimestamp } from '@ayantaraz/shared';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: [
    'waiting_for_call',
    'waiting_for_payment',
    'canceled',
    'rejected',
    'expired',
  ],
  waiting_for_call: ['waiting_for_payment', 'canceled', 'rejected', 'expired'],
  waiting_for_payment: ['confirmed', 'canceled', 'rejected'],
  confirmed: ['refunded'],
  expired: ['waiting_for_call'],
};

const UNREACHABLE = ['confirmed', 'rejected', 'canceled', 'refunded'];

const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

@Injectable()
export class OrdersService {
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
        entityType: 'order',
        entityId,
        ...(oldValue !== undefined && {
          oldValue: oldValue as Prisma.InputJsonValue,
        }),
        ...(newValue !== undefined && {
          newValue: newValue as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async create(
    data: {
      courseId?: number;
      itemType?: string;
      itemId?: number;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      phone?: string;
      amount?: number;
      note?: string;
    },
    userId?: number,
  ) {
    const courseId = data.courseId ?? data.itemId;
    if (!courseId) {
      throw new HttpException('شناسه دوره الزامی است', HttpStatus.BAD_REQUEST);
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course || course.status !== 'published') {
      throw new HttpException(
        'دوره یافت نشد یا قابل خرید نیست',
        HttpStatus.NOT_FOUND,
      );
    }

    let effectiveUserId = userId;
    let firstName = data.firstName || '';
    let lastName = data.lastName || '';
    let phoneNumber = data.phoneNumber || data.phone || '';

    if (!effectiveUserId) {
      if (!phoneNumber)
        throw new HttpException(
          'شماره تلفن الزامی است',
          HttpStatus.BAD_REQUEST,
        );
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

    if (!phoneNumber)
      throw new HttpException('شماره تلفن الزامی است', HttpStatus.BAD_REQUEST);

    return this.prisma.$transaction(async (tx) => {
      const recent = await tx.order.findFirst({
        where: {
          userId: effectiveUserId,
          itemType: 'course',
          itemId: courseId,
          status: {
            in: ['pending', 'waiting_for_call', 'waiting_for_payment'],
          },
          createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
        },
      });
      if (recent) {
        throw new HttpException(
          'درخواست خرید برای این دوره قبلاً ثبت شده است',
          HttpStatus.CONFLICT,
        );
      }

      const count = await tx.order.count({
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

      const order = await tx.order.create({
        data: {
          userId: effectiveUserId,
          itemType: 'course',
          itemId: courseId,
          amount: course.price,
          status: 'pending',
          firstName,
          lastName,
          phoneNumber,
          internalNotes: data.note
            ? this.formatNote('', `یادداشت کاربر: ${data.note}`, 'کاربر')
            : '',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: effectiveUserId,
          action: 'order_create',
          entityType: 'order',
          entityId: order.id,
          newValue: {
            courseId: courseId,
            phone: phoneNumber,
          },
        },
      });

      return order;
    });
  }

  async list(
    userId: number,
    role: string,
    statusFilter?: string,
    page?: number,
    limit?: number,
  ) {
    const skip = (page && (page - 1) * (limit || 20)) || 0;
    const take = limit || 20;
    const p = page || 1;

    const where: Prisma.OrderWhereInput = {};
    if (role === 'user') {
      where.userId = userId;
    } else if (statusFilter) {
      where.status = statusFilter as OrderStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, phone: true, firstName: true, lastName: true },
          },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          verifiedBy: { select: { id: true, firstName: true, lastName: true } },
          enrollments: { select: { id: true, isActive: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: p,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getById(id: number, userId: number, role: string) {
    const where: Prisma.OrderWhereInput = { id };
    if (role === 'user') where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: {
          select: { id: true, phone: true, firstName: true, lastName: true },
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true } },
        enrollments: { select: { id: true, isActive: true } },
      },
    });
    if (!order) throw new HttpException('سفارش یافت نشد', HttpStatus.NOT_FOUND);
    return order;
  }

  async updateStatus(
    id: number,
    dto: {
      status: OrderStatus;
      internalNotes?: string;
      adminNote?: string;
      paymentReference?: string;
      paymentRef?: string;
      assignedToId?: number;
    },
    userId: number,
    userRole: string,
  ) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing)
      throw new HttpException('سفارش یافت نشد', HttpStatus.NOT_FOUND);

    if (
      UNREACHABLE.includes(existing.status) &&
      existing.status !== 'confirmed'
    ) {
      throw new HttpException(
        'این سفارش در وضعیت نهایی قرار دارد',
        HttpStatus.BAD_REQUEST,
      );
    }

    const from = existing.status;
    const to = dto.status;

    if (from === 'confirmed' && to !== 'refunded') {
      throw new HttpException(
        'سفارش تایید شده فقط قابل بازگشت وجه است',
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

    if (
      userRole !== 'admin' &&
      ['rejected', 'confirmed', 'refunded'].includes(to)
    ) {
      throw new HttpException(
        'فقط مدیر می‌تواند این تغییر وضعیت را انجام دهد',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const txUpdateData: Prisma.OrderUpdateInput = { status: to };

      if (to === 'confirmed') {
        const paymentRef = dto.paymentReference || dto.paymentRef;
        if (!paymentRef) {
          throw new HttpException(
            'ثبت مرجع پرداخت برای تایید الزامی است',
            HttpStatus.BAD_REQUEST,
          );
        }
        txUpdateData.paymentReference = paymentRef;
        txUpdateData.verifiedBy = { connect: { id: userId } };
        txUpdateData.verifiedAt = new Date();
        txUpdateData.confirmedAt = new Date();

        const existingEnrollment = await tx.enrollment.findFirst({
          where: { userId: existing.userId, courseId: existing.itemId },
        });
        if (!existingEnrollment) {
          await tx.enrollment.create({
            data: {
              userId: existing.userId,
              courseId: existing.itemId,
              orderId: id,
              isActive: true,
            },
          });
        } else if (!existingEnrollment.isActive) {
          await tx.enrollment.update({
            where: { id: existingEnrollment.id },
            data: { isActive: true, orderId: id },
          });
        }
      }

      if (to === 'refunded' && existing.status === 'confirmed') {
        await tx.enrollment.updateMany({
          where: { orderId: id },
          data: { isActive: false },
        });
      }

      if (to === 'rejected') txUpdateData.rejectedAt = new Date();
      if (to === 'canceled') txUpdateData.canceledAt = new Date();
      if (to === 'expired') txUpdateData.expiredAt = new Date();
      if (dto.assignedToId !== undefined)
        txUpdateData.assignedTo = { connect: { id: dto.assignedToId } };

      const noteContent = dto.internalNotes || dto.adminNote;
      if (noteContent !== undefined) {
        const actor = await tx.user.findUnique({
          where: { id: userId },
        });
        const actorName =
          `${actor?.firstName ?? ''} ${actor?.lastName ?? ''}`.trim() ||
          `کاربر #${userId}`;
        txUpdateData.internalNotes = this.formatNote(
          existing.internalNotes || '',
          noteContent,
          actorName,
        );
      }

      const order = await tx.order.update({
        where: { id },
        data: txUpdateData,
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: `order_status_${to}`,
          entityType: 'order',
          entityId: id,
          oldValue: { status: from },
          newValue: {
            status: to,
            paymentReference: dto.paymentReference,
          },
        },
      });

      return order;
    });
  }

  async assign(
    id: number,
    assigneeId: number,
    userId: number,
    userRole: string,
  ) {
    if (userRole !== 'admin')
      throw new HttpException(
        'فقط مدیر می‌تواند ارجاع دهد',
        HttpStatus.FORBIDDEN,
      );
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing)
      throw new HttpException('سفارش یافت نشد', HttpStatus.NOT_FOUND);
    const order = await this.prisma.order.update({
      where: { id },
      data: { assignedToId: assigneeId },
    });
    await this.audit(
      userId,
      'order_assign',
      id,
      { previousAssignee: existing.assignedToId ?? undefined },
      { newAssignee: assigneeId },
    );
    return order;
  }

  async addNote(id: number, note: string, userId: number, userRole: string) {
    const where: Prisma.OrderWhereInput = { id };
    if (userRole === 'user') where.userId = userId;
    const existing = await this.prisma.order.findFirst({ where });
    if (!existing)
      throw new HttpException('سفارش یافت نشد', HttpStatus.NOT_FOUND);
    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    const actorName =
      `${actor?.firstName ?? ''} ${actor?.lastName ?? ''}`.trim() ||
      `کاربر #${userId}`;
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        internalNotes: this.formatNote(
          existing.internalNotes || '',
          note,
          actorName,
        ),
      },
    });
    await this.audit(userId, 'order_note_added', id, undefined, {
      noteLength: note.length,
    });
    return order;
  }

  async getAuditLog(id: number, userId: number, userRole: string) {
    if (userRole === 'user') {
      const order = await this.prisma.order.findFirst({
        where: { id, userId },
      });
      if (!order)
        throw new HttpException('سفارش یافت نشد', HttpStatus.NOT_FOUND);
    }
    return this.prisma.auditLog.findMany({
      where: { entityType: 'order', entityId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async cancelByUser(id: number, userId: number) {
    const existing = await this.prisma.order.findFirst({
      where: { id, userId },
    });
    if (!existing)
      throw new HttpException('سفارش یافت نشد', HttpStatus.NOT_FOUND);
    if (existing.status !== 'pending') {
      throw new HttpException(
        'فقط سفارش‌های در انتظار بررسی قابل لغو هستند',
        HttpStatus.FORBIDDEN,
      );
    }
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: 'canceled', canceledAt: new Date() },
    });
    await this.audit(
      userId,
      'order_status_canceled',
      id,
      { status: existing.status },
      { status: 'canceled' },
    );
    return order;
  }
}
