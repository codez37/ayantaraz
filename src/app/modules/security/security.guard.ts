import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RateLimiterService } from './rate-limiter.service';

export const RATE_LIMIT_TIER_KEY = 'rateLimitTier';

@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly logger = new Logger(SecurityGuard.name);
  constructor(
    private reflector: Reflector,
    private rateLimiter: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);
    const userId = (request.user as { id?: number })?.id?.toString();
    const identifier = userId || ip;
    const routePath = this.getRoutePath(context);
    const configName = this.getRateLimitConfig(context, routePath);

    try {
      const result = await this.rateLimiter.increment(identifier, configName);
      if (!result.allowed) {
        this.logger.warn(
          `Rate limit exceeded for ${identifier} on ${routePath}: ${result.remaining} remaining`,
        );
        return false;
      }

      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Tier', configName);
      response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      response.setHeader(
        'X-RateLimit-Reset',
        Math.ceil(result.resetTime.getTime() / 1000).toString(),
      );
    } catch (err) {
      this.logger.error(
        `Rate limit check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  private getRoutePath(context: ExecutionContext): string {
    try {
      const request = context.switchToHttp().getRequest();
      return request.route?.path || request.path || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private getRateLimitConfig(
    context: ExecutionContext,
    routePath: string,
  ): string {
    const tier = this.reflector.getAllAndOverride<string>(RATE_LIMIT_TIER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (tier) return tier;
    if (
      routePath.includes('/auth/') ||
      routePath.includes('/login') ||
      routePath.includes('/otp')
    )
      return 'auth';
    if (routePath.startsWith('/api/')) return 'api';
    return 'default';
  }
}
