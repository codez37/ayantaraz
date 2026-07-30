import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

import { PrismaModule } from './prisma/prisma.module';

// Infrastructure Module
import { PrismaUserRepository } from './infrastructure/persistence/prisma/prisma-user.repository';
import { PrismaContentRepository } from './infrastructure/persistence/prisma/prisma-content.repository';

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
import { TaxEngineModule } from './modules/tax-engine/tax-engine.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
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
        const redisUrl = process.env.REDIS_URL;
        const store = redisUrl
          ? new Keyv(new KeyvRedis(redisUrl, { namespace: 'cache', useUnlink: true }))
          : undefined;
        return {
          stores: store ? [store] : undefined,
          ttl: 300,
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
    TaxEngineModule,
  ],
  controllers: [],
  providers: [
    // Repository bindings
    PrismaUserRepository,
    PrismaContentRepository,

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
    PrismaUserRepository,
    PrismaContentRepository,
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
