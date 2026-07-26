import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private maskAuthHeader(auth?: string): string {
    return auth ? `Bearer ${auth.slice(0, 20)}...${auth.slice(-4)}` : 'none';
  }
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    return typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : request.ip || request.connection.remoteAddress || 'unknown';
  }
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { correlationId?: string }>();
    const { method, url: originalUrl, headers } = request;
    const correlationId = request.correlationId || '-';
    const start = Date.now();
    const safeAuth = this.maskAuthHeader(headers?.authorization);
    const clientIp = this.getClientIp(request);
    this.logger.log(
      JSON.stringify({
        type: 'request',
        correlationId,
        method,
        url: originalUrl,
        auth: safeAuth,
        ip: clientIp,
        timestamp: new Date().toISOString(),
      }),
    );
    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse<Response>();
          const ms = Date.now() - start;
          this.logger.log(
            JSON.stringify({
              type: 'response',
              correlationId,
              method,
              url: originalUrl,
              statusCode: response.statusCode,
              durationMs: ms,
              timestamp: new Date().toISOString(),
            }),
          );
        },
        error: (error: Error) => {
          const ms = Date.now() - start;
          const response = ctx.getResponse<Response>();
          const status =
            error && typeof error === 'object' && 'status' in error
              ? (error as { status: number }).status
              : response.statusCode || 500;
          this.logger.error(
            JSON.stringify({
              type: 'error',
              correlationId,
              method,
              url: originalUrl,
              statusCode: status,
              durationMs: ms,
              message: error.message,
              stack:
                process.env.NODE_ENV !== 'production' ? error.stack : undefined,
              timestamp: new Date().toISOString(),
            }),
          );
        },
      }),
    );
  }
}
