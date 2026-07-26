import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    code: string,
    errors?: any[],
    retryAfter?: number,
  ) {
    super(
      {
        status: false,
        statusCode,
        message,
        code,
        errors: errors || [],
        timestamp: new Date().toISOString(),
        ...(retryAfter ? { retryAfter } : {}),
      },
      statusCode,
    );
  }
}

export class BadRequestException extends ApiException {
  constructor(message: string, errors?: any[]) {
    super(message, HttpStatus.BAD_REQUEST, 'BAD_REQUEST', errors);
  }
}

export class UnauthorizedException extends ApiException {
  constructor(message: string = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends ApiException {
  constructor(message: string = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

export class NotFoundException extends ApiException {
  constructor(message: string = 'Not Found') {
    super(message, HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }
}

export class ConflictException extends ApiException {
  constructor(message: string = 'Conflict') {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}

export class RateLimitException extends ApiException {
  constructor(message: string = 'Too Many Requests', retryAfter?: number) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED', undefined, retryAfter);
  }
}

export class InternalServerErrorException extends ApiException {
  constructor(message: string = 'Internal Server Error') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableException extends ApiException {
  constructor(message: string = 'Service Unavailable', retryAfter?: number) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE', undefined, retryAfter);
  }
}

export class ValidationException extends ApiException {
  constructor(message: string = 'Validation failed', errors?: any[]) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', errors);
  }
}
