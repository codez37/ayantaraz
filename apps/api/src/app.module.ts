import { MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Redis } from 'ioredis';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContentModule } from './modules/content/content.module';
import { HealthModule } from './modules/health/health.module';
import { UploadModule } from './modules/upload/upload.module';
import { SecurityModule } from './modules/security/security.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';

import { CombinedAuthGuard } from './common/guards/combined-auth.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { JsonLogger } from './common/logger/json-logger.service';

const logger = new JsonLogger();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 3 },
        { name: 'medium', ttl: 60000, limit: 20 },
        { name: 'long', ttl: 3600000, limit: 100 },
        { name: 'auth', ttl: 60000, limit: 3 },
        { name: 'otp', ttl: 300000, limit: 1 },
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'redis',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          retryStrategy: (times) => {
            const delay = Math.min(times * 100, 5000);
            logger.log(`Redis reconnect attempt ${times}, waiting ${delay}ms`, 'Redis');
            return delay;
          },
          enableOfflineQueue: true,
        });

        try {
          const pingResult = await redis.ping();
          if (pingResult !== 'PONG') {
            throw new Error('Redis ping failed');
          }
          logger.log('Redis connection established', 'Redis');
        } catch (err) {
          logger.error(
            'Redis connection failed',
            err instanceof Error ? err.stack : String(err),
            'Redis'
          );
          throw err;
        }

        return {
          store: redis,
          ttl: 300,
        };
      },
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContentModule,
    HealthModule,
    UploadModule,
    SecurityModule,
    ChatbotModule,
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: CombinedAuthGuard },
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }

  async onModuleInit() {
    logger.log('Application module initialized', 'AppModule');
  }
}
