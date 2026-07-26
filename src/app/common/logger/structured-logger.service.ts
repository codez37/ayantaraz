import { Injectable, LoggerService, OnModuleDestroy } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { combine, timestamp, printf, colorize, json, errors } from 'winston';
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
    const consoleTransport = new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(({ level, message, timestamp, stack, ...meta }) => {
          let logMessage = `${timestamp} [${level}]: ${message}`;
          if (stack) logMessage += `\n${stack}`;
          if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
          }
          return logMessage;
        }),
      ),
    });

    const fileTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      format: combine(
        timestamp(),
        json(),
      ),
    });

    const errorTransport = new DailyRotateFile({
      filename: path.join(this.logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      level: 'error',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json(),
      ),
    });

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      exitOnError: false,
      transports: [consoleTransport, fileTransport, errorTransport],
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug?(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose?(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  createContextLogger(context: string) {
    return {
      log: (message: string) => this.log(message, context),
      error: (message: string, trace?: string) => this.error(message, trace, context),
      warn: (message: string) => this.warn(message, context),
      debug: (message: string) => this.debug?.(message, context),
      verbose: (message: string) => this.verbose?.(message, context),
    };
  }

  onModuleDestroy(): void {
    this.logger.on('finish', () => {
      this.logger.end();
    });
  }
}
