import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircuitBreakerService } from './circuit-breaker.service';

/**
 * Database Circuit Breaker Service
 * Wraps Prisma operations with circuit breaker protection
 */
@Injectable()
export class DatabaseCircuitBreakerService {
  private readonly logger = new Logger(DatabaseCircuitBreakerService.name);
  private readonly DATABASE_CIRCUIT_NAME = 'database';

  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * Execute a Prisma query with circuit breaker protection
   * @param operation Prisma operation to execute
   * @param fallback Optional fallback value or function
   * @returns Promise with the result or fallback
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: T | (() => Promise<T>),
  ): Promise<T> {
    const result = await this.circuitBreaker.execute(
      this.DATABASE_CIRCUIT_NAME,
      operation,
      fallback,
    );

    if (!result.success && !result.isFallback) {
      this.logger.error(
        `Database operation failed: ${result.error?.message}`,
        DatabaseCircuitBreakerService.name,
      );
      throw result.error;
    }

    if (result.isFallback) {
      this.logger.warn(
        `Using fallback for database operation`,
        DatabaseCircuitBreakerService.name,
      );
    }

    return result.data as T;
  }

  /**
   * Check database health with circuit breaker
   */
  async checkHealth(): Promise<boolean> {
    try {
      const result = await this.circuitBreaker.execute(
        this.DATABASE_CIRCUIT_NAME,
        async () => {
          await this.prisma.$queryRaw`SELECT 1`;
          return true;
        },
        false, // Fallback to false if database is down
      );

      return result.data as boolean;
    } catch {
      return false;
    }
  }

  /**
   * Get database circuit stats
   */
  getStats() {
    return this.circuitBreaker.getStats(this.DATABASE_CIRCUIT_NAME);
  }

  /**
   * Reset the database circuit
   */
  reset(): void {
    this.circuitBreaker.reset(this.DATABASE_CIRCUIT_NAME);
  }

  /**
   * Force open the database circuit (for testing)
   */
  open(): void {
    this.circuitBreaker.open(this.DATABASE_CIRCUIT_NAME);
  }

  /**
   * Force close the database circuit
   */
  close(): void {
    this.circuitBreaker.close(this.DATABASE_CIRCUIT_NAME);
  }
}
