import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import redis from 'redis';

import { PrismaModule } from './prisma/prisma.module';

// Core Module
import { IUserRepository, IContentRepository } from './core/repositories';
import { IAuthService } from './core/services';

// Infrastructure Module
import { PrismaUserRepository, PrismaContentRepository } from './infrastructure/persistence/prisma';
import { AuthService } from './infrastructure/services/auth.service';

// Common Module
import { AdvancedCacheService } from './common/cache/advanced-cache.service';
import { QueryOptimizerService } from './common/database/query-optimizer.service';
import { AdvancedRateLimiterService } from './common/security/advanced-rate-limiter.service';
import { InputSanitizationPipe } from './common/security/input-sanitization.pipe';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestLoggerInterceptor, AuditInterceptor } from './common/interceptors';

// Guards
import { JwtAuthGuard, RolesGuard, CombinedAuthGuard } from './common/guards';

// Middleware
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContentModule } from './modules/content/content.module';
import { HealthModule } from './modules/health/health.module';
import { UploadModule } from './modules/upload/upload.module';
import { SecurityModule } from './modules/security/security.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { ConsultationModule } from './modules/consultation/consultation.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { SeoModule } from './modules/seo/seo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.production', '.env'],
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 3 },
        { name: 'medium', ttl: 60000, limit: 20 },
        { name: 'long', ttl: 3600000, limit: 100 },
        { name: 'auth', ttl: 60000, limit: 5 },
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const redisClient = redis.createClient({
          socket: {
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            reconnectStrategy: (retries: number) =>
              Math.min(retries * 100, 5000),
          },
          password: process.env.REDIS_PASSWORD,
          database: parseInt(process.env.REDIS_DB || '0'),
        });

        await redisClient.connect();

        try {
          const pong = await redisClient.ping();
          if (pong !== 'PONG') {
            throw new Error('Redis connection failed: invalid response');
          }
        } catch (err) {
          await redisClient.quit();
          throw new Error(
            'Redis connection failed: ' +
              (err instanceof Error ? err.message : 'Unknown error'),
          );
        }

        return {
          store: redisClient,
          ttl: 300,
          max: 1000,
        };
      },
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 100,
      verboseMemoryLeak: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentModule,
    HealthModule,
    UploadModule,
    SecurityModule,
    ChatbotModule,
    ConsultationModule,
    OrdersModule,
    CoursesModule,
    AdminModule,
    AuditModule,
    SeoModule,
  ],
  controllers: [],
  providers: [
    // Repository bindings
    { provide: IUserRepository, useClass: PrismaUserRepository },
    { provide: IContentRepository, useClass: PrismaContentRepository },
    
    // Service bindings
    { provide: IAuthService, useClass: AuthService },
    
    // Common services
    AdvancedCacheService,
    QueryOptimizerService,
    AdvancedRateLimiterService,
    StructuredLoggerService,
    
    // Guards
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: CombinedAuthGuard },
    
    // Pipes
    InputSanitizationPipe,
    
    // Filters
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    
    // Interceptors
    { provide: APP_INTERCEPTOR, useClass: RequestLoggerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [
    IUserRepository,
    IContentRepository,
    IAuthService,
    AdvancedCacheService,
    QueryOptimizerService,
    AdvancedRateLimiterService,
    StructuredLoggerService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
