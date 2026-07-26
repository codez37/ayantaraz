import { Controller, Get, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import * as crypto from 'crypto';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_COOKIE_MAX_AGE,
} from '../../modules/auth/auth.constants';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('csrf')
export class CsrfController {
  private readonly logger = new Logger(CsrfController.name);

  @Get()
  getCsrfToken(@Res() res: Response): void {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: CSRF_COOKIE_MAX_AGE,
        path: '/',
      });
      this.logger.debug('CSRF token generated and set in cookie');
      res.json({
        token,
        headerName: CSRF_HEADER_NAME,
        cookieName: CSRF_COOKIE_NAME,
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate CSRF token: ${error instanceof Error ? error.message : String(error)}`,
      );
      res.status(500).json({ error: 'Failed to generate CSRF token' });
    }
  }
}
