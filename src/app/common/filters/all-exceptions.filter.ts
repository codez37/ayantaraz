import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiException } from '../exceptions/http-exception';

interface ExceptionResponse {
  message: string;
  code: string;
  errors?: any[];
  retryAfter?: number;
}

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
      const exceptionResponse = exception.getResponse() as ExceptionResponse;
      message = exceptionResponse.message || message;
      code = exceptionResponse.code || code;
      errors = exceptionResponse.errors || errors;
      retryAfter = exceptionResponse.retryAfter;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as ExceptionResponse).message || message;
      code = (exceptionResponse as ExceptionResponse).code || code;
      errors = (exceptionResponse as ExceptionResponse).errors || errors;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = 400;
      message = this.handlePrismaError(exception);
      code = 'PRISMA_ERROR';
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = 400;
      message = 'Validation error';
      code = 'VALIDATION_ERROR';
      errors = exception.errors.map((err: any) => ({
        field: err.path?.join('.') || '',
        message: err.message || '',
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
        user: (request.user as any)?.id,
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
        return 'Another operation is in progress';
      case 'P2019':
        return 'Row not found';
      case 'P2020':
        return 'Value out of range';
      case 'P2021':
        return 'Table does not exist';
      case 'P2022':
        return 'Column does not exist';
      case 'P2023':
        return 'Inconsistent column data';
      case 'P2024':
        return 'Timed out fetching a new connection';
      case 'P2026':
        return 'Connected to database but connection was closed';
      case 'P2027':
        return 'Multiple databases not supported';
      case 'P2028':
        return 'Transaction API error';
      case 'P2030':
        return 'Provided query is not a valid query';
      case 'P2031':
        return 'Prisma needs to perform transactions';
      case 'P2033':
        return 'A number used in the query did not fit into a 64 bit signed integer';
      default:
        return `Database error: ${error.code}`;
    }
  }
}
