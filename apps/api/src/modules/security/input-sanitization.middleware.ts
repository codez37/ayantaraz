import {
  Injectable,
  NestMiddleware,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class InputSanitizationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(InputSanitizationMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.body && typeof req.body === 'object')
        this.sanitizeObject(req.body);
      if (req.query && typeof req.query === 'object')
        this.sanitizeObject(req.query);
      if (req.params && typeof req.params === 'object')
        this.sanitizeObject(req.params);
      next();
    } catch (error) {
      this.logger.error(
        `Input sanitization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Invalid input data');
    }
  }

  private sanitizeObject(obj: Record<string, unknown>): void {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'string') {
          obj[key] = this.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          this.sanitizeObject(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
          this.sanitizeArray(value);
        }
      }
    }
  }

  private sanitizeArray(arr: unknown[]): void {
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] === 'string') {
        arr[i] = this.sanitizeString(arr[i] as string);
      } else if (typeof arr[i] === 'object' && arr[i] !== null) {
        this.sanitizeObject(arr[i] as Record<string, unknown>);
      }
    }
  }

  private sanitizeString(value: string): string {
    if (!value) return value;
    value = value.replace(/\x00/g, '');
    value = value.replace(/\$\w+/g, '');
    value = value.trim();
    this.checkForSqlInjection(value);
    this.checkForXss(value);
    return value;
  }

  private checkForSqlInjection(value: string): void {
    const sqlPatterns = [
      /(--\s|#|;|\/\*|\*\/)/i,
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
      /(\b(WAITFOR|DELAY)\b)/i,
      /(\b(XP_|MSSQL_|SP_)\w+)/i,
    ];
    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        this.logger.warn(
          `Potential SQL injection detected: ${value.substring(0, 50)}...`,
        );
        throw new BadRequestException(
          'Invalid input - potential SQL injection detected',
        );
      }
    }
  }

  private checkForXss(value: string): void {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/i,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/i,
    ];
    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        this.logger.warn(
          `Potential XSS detected: ${value.substring(0, 50)}...`,
        );
        throw new BadRequestException('Invalid input - potential XSS detected');
      }
    }
  }
}
