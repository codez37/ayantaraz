import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

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
            max_connections: parseInt(process.env.DB_POOL_MAX_CONNECTIONS || '50'),
            min_connections: parseInt(process.env.DB_POOL_MIN_CONNECTIONS || '10'),
            max_requests_per_connection: parseInt(process.env.DB_POOL_MAX_REQUESTS_PER_CONNECTION || '100'),
            idle_timeout_ms: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000'),
            connection_timeout_ms: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '5000'),
          },
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connection established');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('✅ Database connection closed');
    } catch (error) {
      this.logger.error('❌ Error closing database connection', error);
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
      return await this.$executeRawUnsafe(query, ...(params || []));
    } catch (error) {
      this.logger.error('❌ Raw query execution failed', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      await this.$queryRaw`SELECT 1`;
      return { status: 'healthy', database: 'connected' };
    } catch (error) {
      this.logger.error('❌ Database health check failed', error);
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
