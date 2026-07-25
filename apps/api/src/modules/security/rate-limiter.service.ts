import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
}
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimiterService.name);
  private redisClient: RedisClientType | null = null;
  private readonly configs: Map<string, RateLimitConfig> = new Map();
  private readonly failOpen: boolean;

  constructor(private configService: ConfigService) {
    this.failOpen =
      this.configService.get<string>('RATE_LIMITER_FAIL_OPEN') !== 'false';
    this.initializeRedis();
    this.configs.set('default', {
      windowMs: 60 * 1000,
      max: 100,
      message: 'Too many requests',
      keyPrefix: 'rl:default:',
    });
    this.configs.set('auth', {
      windowMs: 60 * 1000,
      max: 3,
      message: 'Too many auth attempts. Please wait 1 minute.',
      keyPrefix: 'rl:auth:',
    });
    this.configs.set('otp', {
      windowMs: 5 * 60 * 1000,
      max: 1,
      message: 'Too many OTP requests. Please wait 5 minutes.',
      keyPrefix: 'rl:otp:',
    });
    this.configs.set('short', {
      windowMs: 1000,
      max: 10,
      message: 'Too many requests',
      keyPrefix: 'rl:short:',
    });
    this.configs.set('api', {
      windowMs: 60 * 1000,
      max: 60,
      message: 'API rate limit exceeded',
      keyPrefix: 'rl:api:',
    });
    this.configs.set('chatbot', {
      windowMs: 60 * 1000,
      max: 20,
      message: 'Chatbot rate limit exceeded',
      keyPrefix: 'rl:chatbot:',
    });
    this.configs.set('tax_engine', {
      windowMs: 60 * 1000,
      max: 20,
      message: 'Tax engine rate limit exceeded',
      keyPrefix: 'rl:tax_engine:',
    });
  }

  async onModuleDestroy() {
    if (this.redisClient)
      try {
        await this.redisClient.quit();
        this.logger.log('Redis client disconnected');
      } catch (error) {
        this.logger.error(
          `Error disconnecting Redis: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
  }

  private initializeRedis(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'redis';
    const redisPort = parseInt(
      this.configService.get<string>('REDIS_PORT') || '6379',
    );
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    try {
      this.redisClient = createClient({
        url: redisUrl || `redis://${redisHost}:${redisPort}`,
        password: redisPassword,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
        },
      });
      this.redisClient.on('error', (error) =>
        this.logger.error(`Redis error: ${error.message}`),
      );
      this.redisClient.on('connect', () =>
        this.logger.log('Connected to Redis for rate limiting'),
      );
      this.redisClient.connect().catch((error) => {
        this.logger.error(
          `Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.redisClient = null;
      });
    } catch (error) {
      this.logger.error(
        `Failed to initialize Redis: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.redisClient = null;
    }
  }

  async check(
    identifier: string,
    configName: string = 'default',
  ): Promise<RateLimitResult> {
    const config = this.configs.get(configName) || this.configs.get('default')!;
    if (!this.redisClient)
      return this.failOpen
        ? {
            allowed: true,
            remaining: config.max,
            resetTime: new Date(Date.now() + config.windowMs),
          }
        : {
            allowed: false,
            remaining: 0,
            resetTime: new Date(Date.now() + config.windowMs),
          };

    try {
      const key = `${config.keyPrefix}${identifier}`;
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const multi = this.redisClient.multi();
      multi.zRemRangeByScore(key, 0, windowStart);
      multi.zAdd(key, { score: now, value: now.toString() });
      multi.zCard(key);
      multi.expire(key, Math.ceil(config.windowMs / 1000));
      const results = await multi.exec();
      const currentCount = results[2] as unknown as number;
      const allowed = currentCount < config.max;
      const remaining = Math.max(0, config.max - currentCount - 1);
      const resetTime = new Date(now + config.windowMs);
      if (!allowed)
        this.logger.warn(
          `Rate limit exceeded for ${identifier} on ${configName}: ${currentCount}/${config.max}`,
        );
      return { allowed, remaining, resetTime };
    } catch (error) {
      return this.failOpen
        ? {
            allowed: true,
            remaining: config.max,
            resetTime: new Date(Date.now() + config.windowMs),
          }
        : {
            allowed: false,
            remaining: 0,
            resetTime: new Date(Date.now() + config.windowMs),
          };
    }
  }

  async increment(
    identifier: string,
    configName: string = 'default',
  ): Promise<RateLimitResult> {
    const config = this.configs.get(configName) || this.configs.get('default')!;
    if (!this.redisClient)
      return this.failOpen
        ? {
            allowed: true,
            remaining: config.max,
            resetTime: new Date(Date.now() + config.windowMs),
          }
        : {
            allowed: false,
            remaining: 0,
            resetTime: new Date(Date.now() + config.windowMs),
          };

    try {
      const key = `${config.keyPrefix}${identifier}`;
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const multi = this.redisClient.multi();
      multi.zRemRangeByScore(key, 0, windowStart);
      multi.zAdd(key, { score: now, value: now.toString() });
      multi.zCard(key);
      multi.expire(key, Math.ceil(config.windowMs / 1000));
      const results = await multi.exec();
      const currentCount = results[2] as unknown as number;
      const allowed = currentCount <= config.max;
      const remaining = Math.max(0, config.max - currentCount);
      const resetTime = new Date(now + config.windowMs);
      return { allowed, remaining, resetTime };
    } catch (error) {
      return this.failOpen
        ? {
            allowed: true,
            remaining: config.max,
            resetTime: new Date(Date.now() + config.windowMs),
          }
        : {
            allowed: false,
            remaining: 0,
            resetTime: new Date(Date.now() + config.windowMs),
          };
    }
  }

  async reset(
    identifier: string,
    configName: string = 'default',
  ): Promise<void> {
    const config = this.configs.get(configName) || this.configs.get('default')!;
    const key = `${config.keyPrefix}${identifier}`;
    if (this.redisClient)
      try {
        await this.redisClient.del(key);
        this.logger.debug(`Rate limit reset for ${identifier}`);
      } catch (error) {
        this.logger.error(
          `Failed to reset rate limit: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
  }

  async getRemaining(
    identifier: string,
    configName: string = 'default',
  ): Promise<number> {
    const config = this.configs.get(configName) || this.configs.get('default')!;
    const key = `${config.keyPrefix}${identifier}`;
    if (!this.redisClient) return config.max;
    try {
      const count = await this.redisClient.zCard(key);
      return Math.max(0, config.max - count);
    } catch (error) {
      this.logger.error(
        `Failed to get remaining: ${error instanceof Error ? error.message : String(error)}`,
      );
      return config.max;
    }
  }

  addConfig(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
    this.logger.log(`Added rate limit config: ${name}`);
  }
  isRedisAvailable(): boolean {
    return this.redisClient !== null;
  }
}
