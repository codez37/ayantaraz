import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { createClient, RedisClientType } from 'redis';

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

@Injectable()
export class AdvancedRateLimiterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdvancedRateLimiterService.name);
  private redisClient: RedisClientType;
  private rateLimiter: RateLimiterRedis;
  private rateLimiterSlow: RateLimiterRedis;
  private rateLimiterAuth: RateLimiterRedis;

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://redis:6379',
    });

    // Main rate limiter: 100 requests per minute
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redisClient as any,
      keyPrefix: 'rate_limit',
      points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') / 1000,
      blockDuration: 60, // block for 60 seconds if exceeded
    });

    // Slow endpoint rate limiter: 10 requests per second
    this.rateLimiterSlow = new RateLimiterRedis({
      storeClient: this.redisClient as any,
      keyPrefix: 'rate_limit_slow',
      points: 10,
      duration: 1,
      blockDuration: 5,
    });

    // Auth endpoint rate limiter: 5 requests per minute
    this.rateLimiterAuth = new RateLimiterRedis({
      storeClient: this.redisClient as any,
      keyPrefix: 'rate_limit_auth',
      points: 5,
      duration: 60,
      blockDuration: 60,
    });
  }

  async onModuleInit() {
    if (this.redisClient.isOpen) return;
    try {
      await this.redisClient.connect();
      this.logger.log('Rate limiter Redis connected');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Rate limiter Redis connection failed', message);
      if (process.env.RATE_LIMITER_FAIL_OPEN !== 'true') {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.redisClient.quit();
    } catch {
      // ignore shutdown errors
    }
  }

  async checkRateLimit(ip: string, endpoint: string = 'default'): Promise<RateLimitResult> {
    const key = `${ip}:${endpoint}`;

    try {
      await this.rateLimiter.consume(key);
      const remaining = await this.rateLimiter.get(key);
      return {
        allowed: true,
        remaining: remaining?.remainingPoints || 0,
      };
    } catch (error: unknown) {
      const res = error as RateLimiterRes;
      return {
        allowed: false,
        retryAfter: Math.ceil((res.msBeforeNext || 0) / 1000),
      };
    }
  }

  async checkSlowEndpoint(ip: string): Promise<RateLimitResult> {
    try {
      await this.rateLimiterSlow.consume(ip);
      const remaining = await this.rateLimiterSlow.get(ip);
      return {
        allowed: true,
        remaining: remaining?.remainingPoints || 0,
      };
    } catch (error: unknown) {
      const res = error as RateLimiterRes;
      return {
        allowed: false,
        retryAfter: Math.ceil((res.msBeforeNext || 0) / 1000),
      };
    }
  }

  async checkAuthEndpoint(ip: string): Promise<RateLimitResult> {
    try {
      await this.rateLimiterAuth.consume(ip);
      const remaining = await this.rateLimiterAuth.get(ip);
      return {
        allowed: true,
        remaining: remaining?.remainingPoints || 0,
      };
    } catch (error: unknown) {
      const res = error as RateLimiterRes;
      return {
        allowed: false,
        retryAfter: Math.ceil((res.msBeforeNext || 0) / 1000),
      };
    }
  }

  async getRateLimitStatus(ip: string): Promise<{
    limit: number;
    remaining: number;
    resetIn: number;
  }> {
    const key = `${ip}:default`;
    const status = await this.rateLimiter.get(key);

    return {
      limit: this.rateLimiter.points,
      remaining: status?.remainingPoints || this.rateLimiter.points,
      resetIn: status ? Math.ceil((status.msBeforeNext || 0) / 1000) : 0,
    };
  }

  async resetRateLimit(ip: string): Promise<void> {
    await this.rateLimiter.delete(`${ip}:default`);
    await this.rateLimiter.delete(`${ip}:slow`);
    await this.rateLimiter.delete(`${ip}:auth`);
  }

  async resetAllRateLimits(): Promise<void> {
    // This is a best-effort reset of known keys. For a full reset, use Redis key scanning.
    this.logger.warn('resetAllRateLimits is a best-effort operation; use Redis SCAN for complete cleanup');
  }
}
