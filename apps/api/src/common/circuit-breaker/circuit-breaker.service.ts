import { Injectable, Logger } from '@nestjs/common';

/**
 * Circuit Breaker State
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit Breaker Options
 */
export interface CircuitBreakerOptions {
  /** Maximum number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds to wait before trying again (recovery timeout) */
  recoveryTimeout: number;
  /** Minimum number of successes required in HALF_OPEN state to close the circuit */
  successThreshold?: number;
  /** Whether to enable automatic recovery */
  autoRecover?: boolean;
}

/**
 * Default Circuit Breaker Options
 */
const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 seconds
  successThreshold: 2,
  autoRecover: true,
};

/**
 * Circuit Breaker Statistics
 */
export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextAttempt?: Date;
}

/**
 * Result of a circuit breaker operation
 */
export interface CircuitResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  state: CircuitState;
  isFallback: boolean;
}

/**
 * Generic Circuit Breaker Service
 * Implements the Circuit Breaker pattern to prevent cascading failures
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits: Map<string, CircuitStateData> = new Map();

  constructor(private readonly options: CircuitBreakerOptions = DEFAULT_OPTIONS) {}

  /**
   * Execute an operation with circuit breaker protection
   * @param name Unique name for the circuit
   * @param operation The async operation to execute
   * @param fallback Optional fallback function to use when circuit is open
   * @returns Promise with CircuitResult containing the operation result or fallback
   */
  async execute<T>(
    name: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T> | T,
  ): Promise<CircuitResult<T>> {
    const circuit = this.getOrCreateCircuit(name);

    // Check if circuit is OPEN
    if (circuit.state === 'OPEN') {
      const now = Date.now();
      
      // Check if recovery timeout has passed
      if (circuit.nextAttempt && now >= circuit.nextAttempt.getTime()) {
        circuit.state = 'HALF_OPEN';
        this.logger.log(
          `Circuit "${name}" moving from OPEN to HALF_OPEN`,
          CircuitBreakerService.name,
        );
      } else {
        // Circuit is still OPEN, use fallback if available
        if (fallback) {
          this.logger.warn(
            `Circuit "${name}" is OPEN, using fallback. Next attempt at ${circuit.nextAttempt?.toISOString()}`,
            CircuitBreakerService.name,
          );
          try {
            const fallbackResult = 
              typeof fallback === 'function' 
                ? await (fallback as () => Promise<T>)()
                : fallback;
            return {
              success: true,
              data: fallbackResult,
              state: circuit.state,
              isFallback: true,
            };
          } catch (fallbackError) {
            return {
              success: false,
              error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
              state: circuit.state,
              isFallback: true,
            };
          }
        }
        
        return {
          success: false,
          error: new Error(`Circuit "${name}" is OPEN`),
          state: circuit.state,
          isFallback: false,
        };
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(circuit);
      
      return {
        success: true,
        data: result,
        state: circuit.state,
        isFallback: false,
      };
    } catch (error) {
      this.recordFailure(circuit);
      
      // If circuit is now OPEN and fallback is available, try fallback
      if (circuit.state === 'OPEN' && fallback) {
        try {
          const fallbackResult = 
            typeof fallback === 'function'
              ? await (fallback as () => Promise<T>)()
              : fallback;
          return {
            success: true,
            data: fallbackResult,
            state: circuit.state,
            isFallback: true,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
            state: circuit.state,
            isFallback: true,
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        state: circuit.state,
        isFallback: false,
      };
    }
  }

  /**
   * Get the current state of a circuit
   * @param name Circuit name
   * @returns Circuit statistics
   */
  getStats(name: string): CircuitStats {
    const circuit = this.circuits.get(name);
    if (!circuit) {
      return {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
      };
    }

    return {
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      lastFailure: circuit.lastFailure,
      lastSuccess: circuit.lastSuccess,
      nextAttempt: circuit.nextAttempt,
    };
  }

  /**
   * Reset a circuit to CLOSED state
   * @param name Circuit name
   */
  reset(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.state = 'CLOSED';
      circuit.failures = 0;
      circuit.successes = 0;
      circuit.lastFailure = undefined;
      circuit.lastSuccess = undefined;
      circuit.nextAttempt = undefined;
      this.logger.log(`Circuit "${name}" reset to CLOSED`, CircuitBreakerService.name);
    }
  }

  /**
   * Force open a circuit
   * @param name Circuit name
   */
  open(name: string): void {
    const circuit = this.getOrCreateCircuit(name);
    circuit.state = 'OPEN';
    circuit.nextAttempt = new Date(Date.now() + this.options.recoveryTimeout);
    this.logger.warn(`Circuit "${name}" forced OPEN`, CircuitBreakerService.name);
  }

  /**
   * Force close a circuit
   * @param name Circuit name
   */
  close(name: string): void {
    const circuit = this.getOrCreateCircuit(name);
    circuit.state = 'CLOSED';
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.nextAttempt = undefined;
    this.logger.log(`Circuit "${name}" forced CLOSED`, CircuitBreakerService.name);
  }

  /**
   * Get all circuit names
   */
  getCircuitNames(): string[] {
    return Array.from(this.circuits.keys());
  }

  /**
   * Get all circuit stats
   */
  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    for (const name of this.circuits.keys()) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  /**
   * Internal: Get or create a circuit
   */
  private getOrCreateCircuit(name: string): CircuitStateData {
    let circuit = this.circuits.get(name);
    if (!circuit) {
      circuit = {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        lastFailure: undefined,
        lastSuccess: undefined,
        nextAttempt: undefined,
      };
      this.circuits.set(name, circuit);
    }
    return circuit;
  }

  /**
   * Internal: Record a successful operation
   */
  private recordSuccess(circuit: CircuitStateData): void {
    circuit.successes++;
    circuit.lastSuccess = new Date();

    // If in HALF_OPEN state and enough successes, close the circuit
    if (circuit.state === 'HALF_OPEN') {
      const successThreshold = this.options.successThreshold || DEFAULT_OPTIONS.successThreshold;
      if (circuit.successes >= successThreshold) {
        circuit.state = 'CLOSED';
        circuit.failures = 0;
        circuit.successes = 0;
        this.logger.log(
          `Circuit "${Array.from(this.circuits.entries()).find(([_, c]) => c === circuit)?.[0]}" recovered and CLOSED`,
          CircuitBreakerService.name,
        );
      }
    }
  }

  /**
   * Internal: Record a failed operation
   */
  private recordFailure(circuit: CircuitStateData): void {
    circuit.failures++;
    circuit.lastFailure = new Date();

    // Check if we should open the circuit
    if (circuit.state === 'CLOSED' && circuit.failures >= this.options.failureThreshold) {
      circuit.state = 'OPEN';
      circuit.nextAttempt = new Date(Date.now() + this.options.recoveryTimeout);
      this.logger.error(
        `Circuit "${Array.from(this.circuits.entries()).find(([_, c]) => c === circuit)?.[0]}" OPENED due to ${circuit.failures} failures`,
        CircuitBreakerService.name,
      );
    }

    // If in HALF_OPEN state and a failure occurs, open the circuit again
    if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'OPEN';
      circuit.nextAttempt = new Date(Date.now() + this.options.recoveryTimeout);
      circuit.successes = 0; // Reset successes on failure in HALF_OPEN
      this.logger.error(
        `Circuit "${Array.from(this.circuits.entries()).find(([_, c]) => c === circuit)?.[0]}" re-OPENED after failure in HALF_OPEN`,
        CircuitBreakerService.name,
      );
    }
  }
}

/**
 * Internal circuit state data
 */
interface CircuitStateData {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextAttempt?: Date;
}
