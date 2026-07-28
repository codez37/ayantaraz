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
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Database connection failed', error as Error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error('Error closing database connection', error as Error);
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
      this.logger.error('Raw query execution failed', error as Error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      await this.$queryRaw`SELECT 1`;
      return { status: 'healthy', database: 'connected' };
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
      return { 
        status: 'unhealthy', 
        database: 'disconnected', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
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
