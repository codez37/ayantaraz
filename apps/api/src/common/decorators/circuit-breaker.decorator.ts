import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { CircuitBreakerInterceptor } from '../interceptors/circuit-breaker.interceptor';

/**
 * Circuit Breaker Decorator
 * Applies circuit breaker protection to controller methods
 * 
 * @param options Circuit breaker options
 * @returns Decorator function
 * 
 * @example
 * ```typescript
 * @CircuitBreaker({ failureThreshold: 5, recoveryTimeout: 30000 })
 * @Get('/data')
 * async getData() {
 *   return this.service.getData();
 * }
 * ```
 */
export function CircuitBreaker(options?: {
  circuitName?: string;
  failureThreshold?: number;
  recoveryTimeout?: number;
  fallback?: any;
}) {
  return applyDecorators(
    UseInterceptors(new CircuitBreakerInterceptor(options)),
  );
}
