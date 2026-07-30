import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdvancedCacheService } from '../cache/advanced-cache.service';
import { PaginationOptions, PaginationResult, createPagination } from '../../core/types/pagination.types';

@Injectable()
export class QueryOptimizerService {
  constructor(
    private prisma: PrismaService,
    private cacheService: AdvancedCacheService,
  ) {}

  async paginate<T>(
    model: any,
    options: PaginationOptions & { where?: any; orderBy?: any; select?: any; include?: any },
    cacheKey?: string,
    cacheTTL?: number,
  ): Promise<PaginationResult<T>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', ...rest } = options;

    if (cacheKey) {
      const cached = await this.cacheService.get<PaginationResult<T>>(cacheKey);
      if (cached !== null && cached !== undefined) return cached;
    }

    const where = rest.where || {};
    const orderBy = rest.orderBy || { [sortBy]: sortOrder };
    const select = rest.select;
    const include = rest.include;

    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy,
        select,
        include,
        skip: (page - 1) * limit,
        take: limit,
      }),
      model.count({ where }),
    ]);

    const result = createPagination(data, total, options);

    if (cacheKey) {
      await this.cacheService.set(cacheKey, result, cacheTTL || 300);
    }

    return result as PaginationResult<T>;
  }

  async findWithCache<T>(
    model: any,
    key: string,
    options: any,
    ttl: number = 300,
  ): Promise<T[]> {
    const cacheKey = `query:${model.modelName}:${key}:${JSON.stringify(options)}`;
    return this.cacheService.getOrSet(cacheKey, () => model.findMany(options), ttl);
  }

  async findFirstWithCache<T>(
    model: any,
    key: string,
    options: any,
    ttl: number = 300,
  ): Promise<T | null> {
    const cacheKey = `query:${model.modelName}:first:${key}:${JSON.stringify(options)}`;
    return this.cacheService.getOrSet(cacheKey, () => model.findFirst(options), ttl);
  }

  async countWithCache(
    model: any,
    key: string,
    where: any,
    ttl: number = 300,
  ): Promise<number> {
    const cacheKey = `query:${model.modelName}:count:${key}:${JSON.stringify(where)}`;
    return this.cacheService.getOrSet(cacheKey, () => model.count({ where }), ttl);
  }

  async invalidateModelCache(modelName: string): Promise<void> {
    // Invalidate all cache keys for this model
    // This is a simplified approach - in production, use Redis keys pattern matching
    await this.cacheService.clear();
  }

  async invalidateAllCache(): Promise<void> {
    await this.cacheService.clear();
  }

  async batchGet<T>(
    model: any,
    ids: number[],
    options: any = {},
    batchSize: number = 100,
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const batchResults = await model.findMany({
        where: { id: { in: batch } },
        ...options,
      });
      results.push(...batchResults);
    }

    return results;
  }

  async transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      return fn(tx);
    });
  }

  async batchTransaction<T, R>(
    items: T[],
    fn: (item: T, tx: any) => Promise<R>,
    batchSize: number = 100,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await this.prisma.$transaction(async (tx) => {
        return Promise.all(batch.map(item => fn(item, tx)));
      });
      results.push(...batchResults);
    }

    return results;
  }
}
