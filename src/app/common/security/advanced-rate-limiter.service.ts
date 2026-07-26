import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import * as redis from 'redis';

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

@Injectable()
export class AdvancedRateLimiterService implements OnModuleDestroy {
  private rateLimiter: RateLimiterRedis;
  private rateLimiterSlow: RateLimiterRedis;
  private rateLimiterAuth: RateLimiterRedis;

  constructor() {
    const redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    // Main rate limiter: 100 requests per minute
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rate_limit',
      points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') / 1000,
      blockDuration: 60, // block for 60 seconds if exceeded
    });

    // Slow endpoint rate limiter: 10 requests per second
    this.rateLimiterSlow = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rate_limit_slow',
      points: 10,
      duration: 1,
      blockDuration: 5,
    });

    // Auth endpoint rate limiter: 5 requests per minute
    this.rateLimiterAuth = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rate_limit_auth',
      points: 5,
      duration: 60,
      blockDuration: 60,
    });
  }

  async onModuleDestroy() {
    // Redis client will be closed by the connection pool
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
    } catch (error) {
      return {
        allowed: false,
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
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
    } catch (error) {
      return {
        allowed: false,
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
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
    } catch (error) {
      return {
        allowed: false,
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
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
      resetIn: status ? Math.ceil(status.msBeforeNext / 1000) : 0,
    };
  }

  async resetRateLimit(ip: string): Promise<void> {
    await this.rateLimiter.delete(`${ip}:default`);
    await this.rateLimiter.delete(`${ip}:slow`);
    await this.rateLimiter.delete(`${ip}:auth`);
  }

  async resetAllRateLimits(): Promise<void> {
    await this.rateLimiter.deleteAll();
    await this.rateLimiterSlow.deleteAll();
    await this.rateLimiterAuth.deleteAll();
  }
}
