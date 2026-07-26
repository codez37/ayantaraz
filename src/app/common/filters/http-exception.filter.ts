import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  error?: string;
  stack?: string;
  path: string;
  method: string;
  correlationId?: string;
}

interface ValidationError {
  constraints?: Record<string, string>;
  children?: ValidationError[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { correlationId?: string }>();
    const response = ctx.getResponse<Response>();
    const isProduction = process.env.NODE_ENV === 'production';
    const correlationId = request.correlationId || '-';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      errorType = exception.constructor.name;
      if (typeof res === 'string') message = res;
      else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = Array.isArray(resObj.message)
          ? resObj.message
          : typeof resObj.message === 'string'
            ? resObj.message
            : message;
        errorType = (resObj.error as string) || errorType;
      }
    } else if (Array.isArray(exception) && exception.length > 0) {
      // Check if any entry has validation constraints
      const hasValidationErrors = exception.some(
        (err) =>
          typeof err === 'object' && err !== null && 'constraints' in err,
      );

      if (hasValidationErrors) {
        status = HttpStatus.BAD_REQUEST;
        errorType = 'ValidationError';

        // Collect and flatten constraint messages from all validation errors
        const allMessages: string[] = [];

        for (const err of exception) {
          if (typeof err === 'object' && err !== null && 'constraints' in err) {
            const validationErr = err as ValidationError;
            // Add constraints from this error
            if (validationErr.constraints) {
              allMessages.push(...Object.values(validationErr.constraints));
            }
            // Recursively check children
            if (validationErr.children && validationErr.children.length > 0) {
              for (const child of validationErr.children) {
                if (child.constraints) {
                  allMessages.push(...Object.values(child.constraints));
                }
              }
            }
          }
        }

        message = allMessages.length > 0 ? allMessages : String(exception);
      } else {
        message = String(exception);
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorType = exception.constructor.name;
      message = exception.message;
      this.logger.error(
        JSON.stringify({
          type: 'unhandled',
          correlationId,
          message: exception.message,
          stack: isProduction ? undefined : exception.stack,
          timestamp: new Date().toISOString(),
        }),
      );
    } else {
      message = String(exception);
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: errorType,
    };
    if (correlationId !== '-') body.correlationId = correlationId;
    if (!isProduction && exception instanceof Error)
      body.stack = exception.stack;

    this.logger.error(
      JSON.stringify({
        type: 'http-error',
        correlationId,
        statusCode: status,
        message: Array.isArray(message) ? message.join('; ') : message,
        path: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      }),
    );
    response.status(status).json(body);
  }
}
