import { LoggerService, Injectable } from '@nestjs/common';
import * as process from 'process';
import * as winston from 'winston';
import * as path from 'path';

@Injectable()
export class JsonLogger implements LoggerService {
  private readonly winstonLogger: winston.Logger;

  constructor() {
    const logsDir = path.join(process.cwd(), 'logs');

    // Create logs directory if it doesn't exist
    try {
      // Note: In production, this will be handled by Docker volume mounts
      // For local development, ensure the directory exists
    } catch {
      // Ignore directory creation errors in Docker environments
    }

    this.winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: path.join(logsDir, 'app.log'),
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
        }),
      ],
      exitOnError: false,
    });
  }

  private format(
    level: string,
    message: string,
    context?: string,
    trace?: string,
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> {
    const entry: Record<string, unknown> = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'localhost',
      env: process.env.NODE_ENV || 'development',
      ...metadata,
    };
    if (trace) entry.trace = trace;
    return entry;
  }

  log(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.winstonLogger.info(
      this.format('info', message, context, undefined, metadata),
    );
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.winstonLogger.error(
      this.format('error', message, context, trace, metadata),
    );
  }

  warn(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.winstonLogger.warn(
      this.format('warn', message, context, undefined, metadata),
    );
  }

  debug?(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.winstonLogger.debug(
      this.format('debug', message, context, undefined, metadata),
    );
  }

  verbose?(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.winstonLogger.verbose(
      this.format('verbose', message, context, undefined, metadata),
    );
  }
}
