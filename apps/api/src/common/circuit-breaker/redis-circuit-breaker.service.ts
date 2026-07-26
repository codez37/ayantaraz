import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

/**
 * Redis Circuit Breaker Service
 * Wraps Redis operations with circuit breaker protection
 */
@Injectable()
export class RedisCircuitBreakerService {
  private readonly logger = new Logger(RedisCircuitBreakerService.name);
  private readonly REDIS_CIRCUIT_NAME = 'redis';

  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  /**
   * Execute a Redis operation with circuit breaker protection
   * @param operation Redis operation to execute
   * @param fallback Optional fallback value or function
   * @returns Promise with the result or fallback
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: T | (() => Promise<T>),
  ): Promise<T> {
    const result = await this.circuitBreaker.execute(
      this.REDIS_CIRCUIT_NAME,
      operation,
      fallback,
    );

    if (!result.success && !result.isFallback) {
      this.logger.error(
        `Redis operation failed: ${result.error?.message}`,
        RedisCircuitBreakerService.name,
      );
      throw result.error;
    }

    if (result.isFallback) {
      this.logger.warn(
        `Using fallback for Redis operation`,
        RedisCircuitBreakerService.name,
      );
    }

    return result.data as T;
  }

  /**
   * Check Redis health with circuit breaker
   */
  async checkHealth(): Promise<boolean> {
    try {
      const result = await this.circuitBreaker.execute(
        this.REDIS_CIRCUIT_NAME,
        async () => {
          // This would be replaced with actual Redis ping
          return true;
        },
        false, // Fallback to false if Redis is down
      );

      return result.data as boolean;
    } catch {
      return false;
    }
  }

  /**
   * Get Redis circuit stats
   */
  getStats() {
    return this.circuitBreaker.getStats(this.REDIS_CIRCUIT_NAME);
  }

  /**
   * Reset the Redis circuit
   */
  reset(): void {
    this.circuitBreaker.reset(this.REDIS_CIRCUIT_NAME);
  }

  /**
   * Force open the Redis circuit (for testing)
   */
  open(): void {
    this.circuitBreaker.open(this.REDIS_CIRCUIT_NAME);
  }

  /**
   * Force close the Redis circuit
   */
  close(): void {
    this.circuitBreaker.close(this.REDIS_CIRCUIT_NAME);
  }
}
