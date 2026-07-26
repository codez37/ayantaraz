import { Module, MiddlewareConsumer, NestModule, Global } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { AbuseTrackerService } from './abuse-tracker.service';
import { SecurityGuard } from './security.guard';
import { InputSanitizationMiddleware } from './input-sanitization.middleware';
import { CsrfController } from './csrf.controller';

@Global()
@Module({
  controllers: [CsrfController],
  providers: [RateLimiterService, AbuseTrackerService, SecurityGuard],
  exports: [RateLimiterService, AbuseTrackerService, SecurityGuard],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(InputSanitizationMiddleware).forRoutes('*');
  }
}
