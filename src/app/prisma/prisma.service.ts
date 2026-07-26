import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { retry } from '../common/utils/retry';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
          pool: {
            max_connections: parseInt(process.env.DB_POOL_MAX_CONNECTIONS || '20'),
            min_connections: parseInt(process.env.DB_POOL_MIN_CONNECTIONS || '5'),
            max_requests_per_connection: parseInt(process.env.DB_POOL_MAX_REQUESTS_PER_CONNECTION || '50'),
            idle_timeout_ms: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '10000'),
            connection_timeout_ms: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '10000'),
          },
        },
      },
    });
  }

  async onModuleInit() {
    try {
      // استفاده از Retry Logic برای اتصال به Database
      await retry(
        async () => {
          await this.$connect();
        },
        10, // 10 بار تلاش
        5000  // 5 ثانیه فاصله بین تلاش‌ها
      );
      this.logger.log('[32m✅ Database connection established[0m');
    } catch (error) {
      this.logger.error('[31m❌ Database connection failed after retries[0m', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('[32m✅ Database connection closed[0m');
    } catch (error) {
      this.logger.error('[31m❌ Error closing database connection[0m', error);
    }
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey as keyof this];
        if (model && typeof model === 'object' && 'deleteMany' in model) {
          return (model as { deleteMany: () => Promise<unknown> }).deleteMany();
        }
        return Promise.resolve();
      }),
    );
  }

  async executeRaw(query: string, params?: any[]) {
    try {
      // اضافه کردن Query Timeout
      const timeout = setTimeout(() => {
        throw new Error('Query timeout after 10 seconds');
      }, 10000);

      const result = await this.$executeRawUnsafe(query, ...(params || []));
      clearTimeout(timeout);
      return result;
    } catch (error) {
      this.logger.error('[31m❌ Raw query execution failed[0m', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      await this.$queryRaw`SELECT 1`;
      return { status: 'healthy', database: 'connected' };
    } catch (error) {
      this.logger.error('[31m❌ Database health check failed[0m', error);
      return { status: 'unhealthy', database: 'disconnected', error: error.message };
    }
  }

  async startTransaction() {
    return this.$transaction([]);
  }

  async withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      return fn(tx);
    });
  }
}
