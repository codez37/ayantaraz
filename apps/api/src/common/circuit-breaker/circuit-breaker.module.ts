import { DynamicModule, Module, Provider } from '@nestjs/common';
import { CircuitBreakerService, CircuitBreakerOptions } from './circuit-breaker.service';

/**
 * Circuit Breaker Module
 * Provides circuit breaker functionality for fault tolerance
 */
@Module({})
export class CircuitBreakerModule {
  /**
   * Register the circuit breaker module with custom options
   * @param options Circuit breaker configuration options
   * @returns Dynamic module
   */
  static forRoot(options: CircuitBreakerOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: CircuitBreakerService,
        useValue: new CircuitBreakerService(options),
      },
    ];

    return {
      module: CircuitBreakerModule,
      providers,
      exports: [CircuitBreakerService],
      global: true,
    };
  }

  /**
   * Register the circuit breaker module with async configuration
   * @param useFactory Factory function to create options
   * @returns Dynamic module
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<CircuitBreakerOptions> | CircuitBreakerOptions;
    inject?: any[];
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'CIRCUIT_BREAKER_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      {
        provide: CircuitBreakerService,
        useFactory: (config: CircuitBreakerOptions) => new CircuitBreakerService(config),
        inject: ['CIRCUIT_BREAKER_OPTIONS'],
      },
    ];

    return {
      module: CircuitBreakerModule,
      providers,
      exports: [CircuitBreakerService],
      global: true,
    };
  }
}
