import { Injectable, LoggerService, OnModuleDestroy } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as { combine, timestamp, printf, colorize, json, errors } from 'winston';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class StructuredLoggerService implements LoggerService, OnModuleDestroy {
  private logger: winston.Logger;
  private readonly logDir = path.join(process.cwd(), 'logs');

  constructor() {
    this.ensureLogDirectory();
    this.logger = this.createLogger();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private createLogger(): winston.Logger {
    const logFormat = printf(({ level, message, timestamp, stack, context, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        context,
        ...meta,
        ...(stack ? { stack } : {}),
      });
    });

    const consoleTransport = new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        logFormat,
      ),
    });

    const errorTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json(),
      ),
    });

    const combinedTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: combine(
        timestamp(),
        json(),
      ),
    });

    const httpTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'http',
      format: combine(
        timestamp(),
        json(),
      ),
    });

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json(),
      ),
      transports: [
        consoleTransport,
        errorTransport,
        combinedTransport,
        httpTransport,
      ],
      exceptionHandlers: [errorTransport],
      rejectionHandlers: [errorTransport],
      exitOnError: false,
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, stack: trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug?(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose?(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  http(message: string, context?: string) {
    this.logger.http(message, { context });
  }

  createContextLogger(context: string) {
    return {
      log: (message: string) => this.log(message, context),
      error: (message: string, trace?: string) => this.error(message, trace, context),
      warn: (message: string) => this.warn(message, context),
      debug: (message: string) => this.debug?.(message, context),
      verbose: (message: string) => this.verbose?.(message, context),
      http: (message: string) => this.http(message, context),
    };
  }

  async onModuleDestroy() {
    await this.logger.end();
  }
}
