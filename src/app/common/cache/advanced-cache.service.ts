import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Redis } from 'ioredis';
import * as redis from 'redis';

@Injectable()
export class AdvancedCacheService implements OnModuleDestroy {
  private redisClient: Redis;
  private readonly defaultTTL: number = 300; // 5 minutes

  constructor(@Inject('CACHE_MANAGER') private cacheManager: Cache) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);
    if (cached) return cached;

    const result = await fn();
    await this.cacheManager.set(key, result, ttl || this.defaultTTL);
    return result;
  }

  async getWithFallback<T>(
    key: string,
    fn: () => Promise<T>,
    fallbackFn?: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    try {
      return await this.getOrSet(key, fn, ttl);
    } catch (error) {
      if (fallbackFn) {
        return fallbackFn();
      }
      throw error;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redisClient.keys(`${pattern}*`);
    for (const key of keys) {
      await this.cacheManager.del(key);
    }
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    await this.invalidatePattern(prefix);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl || this.defaultTTL);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.cacheManager.get(key);
    return value !== null && value !== undefined;
  }

  async increment(key: string, value: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + value;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, value: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current - value;
    await this.set(key, newValue);
    return newValue;
  }

  async getMany<T>(keys: string[]): Promise<(T | undefined)[]> {
    const results = [];
    for (const key of keys) {
      const value = await this.get<T>(key);
      results.push(value);
    }
    return results;
  }

  async setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }
  }

  async delMany(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.del(key);
    }
  }

  async getTTL(key: string): Promise<number | null> {
    const ttl = await this.redisClient.ttl(key);
    return ttl >= 0 ? ttl : null;
  }

  async setWithTTL<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.set(key, value, ttl);
  }

  async lock(key: string, ttl: number = 60): Promise<boolean> {
    const result = await this.redisClient.set(key, 'locked', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  async unlock(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async withLock<T>(key: string, fn: () => Promise<T>, ttl: number = 60): Promise<T> {
    const locked = await this.lock(key, ttl);
    if (!locked) {
      throw new Error('Could not acquire lock');
    }

    try {
      return await fn();
    } finally {
      await this.unlock(key);
    }
  }
}
