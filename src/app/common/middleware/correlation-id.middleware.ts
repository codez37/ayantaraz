import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

export interface RequestWithCorrelationId extends Request {
  correlationId?: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);
  use(req: RequestWithCorrelationId, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    this.logger.debug(
      `Request started with correlation ID: ${correlationId}`,
      `Method: ${req.method}, Path: ${req.url}`,
    );
    next();
  }
}
