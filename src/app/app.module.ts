import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import redis from 'redis';

import { PrismaModule } from './prisma/prisma.module';
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

import { CombinedAuthGuard } from './common/guards/combined-auth.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.production', '.env'],
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
    ConsultationModule,
    OrdersModule,
    CoursesModule,
    AdminModule,
    AuditModule,
    SeoModule,
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: CombinedAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
