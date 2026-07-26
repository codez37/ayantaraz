import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: number } }>();
    const method = req.method;
    const url = req.url;
    const user = req.user;
    const ip = req.ip;

    return next.handle().pipe(
      tap((responseBody: Record<string, unknown>) => {
        if (method !== 'GET' && user?.id) {
          this.prisma.auditLog
            .create({
              data: {
                actorId: user.id,
                action: `${method} ${url}`,
                entityType: (url ?? '').split('/')[2] || 'unknown',
                ipAddress: ip,
                newValue: {
                  method,
                  url,
                  statusCode: responseBody?.statusCode,
                } as Prisma.InputJsonValue,
              },
            })
            .catch((err: Error) => {
              this.logger.error('Audit log failed:', err?.message || err);
            });
        }
      }),
    );
  }
}
