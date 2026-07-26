import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { escape } from 'validator';

/**
 * XSS Protection Middleware
 * Sanitizes user input to prevent Cross-Site Scripting attacks
 */
@Injectable()
export class XssProtectionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      this.sanitizeObject(req.query);
    }

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      this.sanitizeObject(req.body);
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      this.sanitizeObject(req.params);
    }

    // Sanitize headers (except for known safe headers)
    if (req.headers) {
      const safeHeaders = [
        'content-type',
        'content-length',
        'authorization',
        'user-agent',
        'accept',
        'accept-encoding',
        'accept-language',
        'host',
        'origin',
        'referer',
        'connection',
        'cookie',
        'x-requested-with',
        'x-api-key',
        'x-csrf-token',
      ];

      for (const headerName of Object.keys(req.headers)) {
        const lowerHeader = headerName.toLowerCase();
        if (!safeHeaders.includes(lowerHeader)) {
          const headerValue = req.headers[headerName];
          if (typeof headerValue === 'string') {
            req.headers[headerName] = escape(headerValue);
          } else if (Array.isArray(headerValue)) {
            req.headers[headerName] = headerValue.map((v) => 
              typeof v === 'string' ? escape(v) : v
            );
          }
        }
      }
    }

    next();
  }

  /**
   * Recursively sanitize all string values in an object
   * @param obj Object to sanitize
   */
  private sanitizeObject(obj: Record<string, any>): void {
    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'string') {
        obj[key] = escape(value);
      } else if (Array.isArray(value)) {
        obj[key] = value.map((item) => 
          typeof item === 'string' ? escape(item) : item
        );
      } else if (typeof value === 'object') {
        this.sanitizeObject(value);
      }
    }
  }
}
