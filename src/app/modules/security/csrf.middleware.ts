import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../../modules/auth/auth.constants';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string;
    const headerToken = req.headers[CSRF_HEADER_NAME.toLowerCase()] as string;
    const csrfToken = headerToken || cookieToken;

    if (!csrfToken) {
      this.logger.warn(
        `CSRF validation failed: No token in request to ${req.method} ${req.url}`,
      );
      return res.status(403).json({
        statusCode: 403,
        message: 'CSRF token missing',
        error: 'Forbidden',
      });
    }

    if (headerToken && cookieToken && headerToken !== cookieToken) {
      this.logger.warn(
        `CSRF validation failed: Token mismatch for ${req.method} ${req.url}`,
      );
      return res.status(403).json({
        statusCode: 403,
        message: 'CSRF token mismatch',
        error: 'Forbidden',
      });
    }

    next();
  }
}
