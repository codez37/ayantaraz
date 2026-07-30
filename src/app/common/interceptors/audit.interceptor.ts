import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (data) => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        // Skip audit logging for health check and options requests
        if (request.url.includes('/health') || request.method === 'OPTIONS') {
          return;
        }

        try {
          await this.prisma.auditLog.create({
            data: {
              action: `${request.method} ${request.url}`,
              actorId: request.user?.id,
              entityType: 'http',
              newValue: {
                statusCode,
                duration,
                userAgent: request.headers['user-agent'],
                requestBody: this.sanitizeRequestBody(request.body),
                responseBody: this.sanitizeResponseBody(data),
                metadata: {
                  path: request.url,
                  method: request.method,
                  params: request.params,
                  query: request.query,
                },
              },
              ipAddress: request.ip,
            },
          });
        } catch (error) {
          // Don't fail the request if audit logging fails
          console.error('Failed to create audit log:', error);
        }
      }),
    );
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return null;

    const sensitiveFields = ['password', 'token', 'refreshToken', 'accessToken', 'oldPassword', 'newPassword'];

    if (typeof body === 'object') {
      const sanitized: any = {};
      for (const key in body) {
        if (sensitiveFields.includes(key)) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = body[key];
        }
      }
      return sanitized;
    }

    return body;
  }

  private sanitizeResponseBody(data: any): any {
    if (!data) return null;

    const sensitiveFields = ['password', 'token', 'refreshToken', 'accessToken'];

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        if (sensitiveFields.includes(key)) {
          sanitized[key] = '***';
        } else if (typeof data[key] === 'object') {
          sanitized[key] = this.sanitizeResponseBody(data[key]);
        } else {
          sanitized[key] = data[key];
        }
      }
      return sanitized;
    }

    return data;
  }
}
