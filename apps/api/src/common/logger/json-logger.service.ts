import { LoggerService, LogLevel } from '@nestjs/common';
import winstonLogger from './winston.logger';

export class JsonLogger implements LoggerService {
  private readonly context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  log(message: string, context?: string, metadata?: Record<string, unknown>) {
    const logContext = context || this.context;
    winstonLogger.info(message, {
      context: logContext,
      ...metadata,
    });
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ) {
    const logContext = context || this.context;
    winstonLogger.error(message, {
      context: logContext,
      trace,
      ...metadata,
    });
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>) {
    const logContext = context || this.context;
    winstonLogger.warn(message, {
      context: logContext,
      ...metadata,
    });
  }

  debug?(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ) {
    const logContext = context || this.context;
    winstonLogger.debug(message, {
      context: logContext,
      ...metadata,
    });
  }

  verbose?(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ) {
    const logContext = context || this.context;
    winstonLogger.verbose(message, {
      context: logContext,
      ...metadata,
    });
  }

  setLogLevels(levels: LogLevel[]) {
    // Winston logger is configured at creation time
    // To change levels dynamically, you would need to reconfigure the logger
  }

  isLevelEnabled(level: LogLevel): boolean {
    const currentLevel = process.env.LOG_LEVEL || 'info';
    const levels: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose'];
    const currentIndex = levels.indexOf(currentLevel as LogLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex <= currentIndex;
  }
}
