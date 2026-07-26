import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiException } from '../exceptions/http-exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let errors: any[] = [];
    let retryAfter: number | undefined;

    if (exception instanceof ApiException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse.message || message;
      code = exceptionResponse.code || code;
      errors = exceptionResponse.errors || errors;
      retryAfter = exceptionResponse.retryAfter;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : exceptionResponse['message'] || message;
      code = exceptionResponse['code'] || code;
      errors = exceptionResponse['errors'] || errors;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = 400;
      message = this.handlePrismaError(exception);
      code = 'PRISMA_ERROR';
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = 400;
      message = 'Validation error';
      code = 'VALIDATION_ERROR';
      errors = exception.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
    } else if (exception instanceof Error) {
      message = exception.message;
      code = 'UNHANDLED_ERROR';
    }

    this.logger.error(
      `${status} - ${message}`,
      { 
        exception: exception instanceof Error ? exception.stack : String(exception),
        path: request.url,
        method: request.method,
        body: request.body,
        query: request.query,
        params: request.params,
        user: request.user?.id,
      }
    );

    response.status(status).json({
      status: false,
      statusCode: status,
      message,
      code,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(retryAfter ? { retryAfter } : {}),
    });
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): string {
    switch (error.code) {
      case 'P2002':
        return 'Unique constraint violation';
      case 'P2014':
        return 'Invalid relation';
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Foreign key constraint violation';
      case 'P2001':
        return 'Record already exists';
      case 'P2011':
        return 'Null constraint violation';
      case 'P2012':
        return 'Missing required value';
      case 'P2015':
        return 'Related record not found';
      case 'P2016':
        return 'Query interpretation error';
      case 'P2017':
        return 'Records not connected';
      case 'P2018':
        return 'Connected records were not found';
      case 'P2019':
        return 'Input error';
      case 'P2020':
        return 'Value out of range';
      case 'P2021':
        return 'Table does not exist';
      case 'P2022':
        return 'Column does not exist';
      case 'P2023':
        return 'Inconsistent column data';
      case 'P2024':
        return 'Timed out fetching a new connection from the connection pool';
      case 'P2026':
        return 'The current database provider does not support a feature';
      case 'P2027':
        return 'Multiple errors occurred';
      default:
        return error.message;
    }
  }
}
