import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StructuredLoggerService } from '../logger/structured-logger.service';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  constructor(private logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    const contextLogger = this.logger.createContextLogger('Request');

    contextLogger.http(`Incoming request: ${request.method} ${request.url}`, {
      method: request.method,
      url: request.url,
      headers: this.sanitizeHeaders(request.headers),
      body: this.sanitizeBody(request.body),
      query: request.query,
      params: request.params,
      user: request.user?.id,
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        contextLogger.http(`Request completed: ${request.method} ${request.url}`, {
          statusCode: context.switchToHttp().getResponse().statusCode,
          duration: `${duration}ms`,
          dataLength: JSON.stringify(data).length,
        });
      }),
    );
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};
    
    const sanitized: any = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
    
    for (const key in headers) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = headers[key];
      }
    }
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};
    
    if (typeof body === 'object') {
      const sanitized: any = {};
      const sensitiveFields = ['password', 'token', 'refreshToken', 'accessToken'];
      
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
}
