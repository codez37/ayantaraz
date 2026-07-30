import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class AdvancedCacheService implements OnModuleDestroy {
  private readonly defaultTTL: number = 300; // 5 minutes

  constructor(@Inject('CACHE_MANAGER') private cacheManager: Cache) {}

  async onModuleDestroy() {
    // Cache manager handles its own cleanup
  }

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;

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

  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl || this.defaultTTL);
  }

  async delete(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async clear(): Promise<void> {
    await this.cacheManager.clear();
  }

  async has(key: string): Promise<boolean> {
    const value = await this.cacheManager.get(key);
    return value !== null && value !== undefined;
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    const results = await Promise.all(
      keys.map((key) => this.cacheManager.get<T>(key)),
    );
    return results;
  }

  async setMany<T>(items: { key: string; value: T; ttl?: number }[]): Promise<void> {
    await Promise.all(
      items.map((item) => this.cacheManager.set(item.key, item.value, item.ttl || this.defaultTTL)),
    );
  }

  async wrapWithCache<T extends any[], R>(
    keyPrefix: string,
    fn: (...args: T) => Promise<R>,
    ttl?: number,
  ): Promise<(...args: T) => Promise<R>> {
    return async (...args: T) => {
      const key = `${keyPrefix}:${args.join(':')}`;
      return this.getOrSet(key, () => fn(...args), ttl);
    };
  }
}
