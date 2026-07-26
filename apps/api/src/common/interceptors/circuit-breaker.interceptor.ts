import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

/**
 * Circuit Breaker Interceptor
 * Implements the Circuit Breaker pattern for HTTP requests
 */
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CircuitBreakerInterceptor.name);

  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly options?: {
      circuitName?: string;
      failureThreshold?: number;
      recoveryTimeout?: number;
      fallback?: any;
    },
  ) {}

  /**
   * Intercept the request and apply circuit breaker logic
   * @param context Execution context
   * @param next Call handler
   * @returns Observable with the response or fallback
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const circuitName = this.options?.circuitName || this.getCircuitName(context);
    const fallback = this.options?.fallback;

    return next.handle().pipe(
      map((data) => {
        // Record success
        this.circuitBreaker.getStats(circuitName); // This ensures the circuit exists
        return data;
      }),
      catchError((error) => {
        this.logger.error(
          `Circuit breaker intercepted error for ${circuitName}: ${error.message}`,
        );

        // Record failure
        const circuit = this.circuitBreaker.getStats(circuitName);
        
        // If circuit is open and we have a fallback, use it
        if (circuit.state === 'OPEN' && fallback !== undefined) {
          this.logger.warn(`Using fallback for circuit ${circuitName}`);
          return throwError(() => {
            const err = new Error('Circuit breaker fallback');
            (err as any).fallback = fallback;
            (err as any).circuitState = circuit.state;
            return err;
          });
        }

        // Re-throw the original error
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get circuit name from context
   * @param context Execution context
   * @returns Circuit name based on controller and method
   */
  private getCircuitName(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const controller = context.getClass().name;
    const method = context.getHandler().name;
    return `${controller}.${method}`;
  }
}
