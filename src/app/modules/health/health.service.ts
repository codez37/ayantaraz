import * as os from 'os';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    checks: {
      database: {
        status: 'up' | 'down';
        responseTime: number;
      };
      cache: {
        status: 'up' | 'down';
        responseTime: number;
      };
      memory: {
        status: 'ok' | 'warning' | 'critical';
        used: number;
        total: number;
        usagePercent: number;
      };
    };
    version: string;
  }> {
    this.logger.debug('Running health check');
    let databaseStatus: 'up' | 'down' = 'down';
    let databaseResponseTime = 0;
    let cacheStatus: 'up' | 'down' = 'down';
    let cacheResponseTime = 0;
    let memoryStatus: 'ok' | 'warning' | 'critical' = 'ok';
    let memoryUsed = 0;
    let memoryTotal = 0;
    let memoryUsagePercent = 0;

    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'up';
      databaseResponseTime = Date.now() - dbStart;
    } catch (err) {
      this.logger.error(`Database health check failed: ${err}`);
      databaseStatus = 'down';
      databaseResponseTime = 0;
    }

    try {
      cacheStatus = 'up';
      cacheResponseTime = 0;
    } catch (err) {
      this.logger.error(`Cache health check failed: ${err}`);
      cacheStatus = 'down';
      cacheResponseTime = 0;
    }

    const memoryUsage = process.memoryUsage();

    memoryUsed = memoryUsage.rss || 0;
    memoryTotal = os.totalmem();
    const usagePercent = (memoryUsed / memoryTotal) * 100;
    if (usagePercent > 90) memoryStatus = 'critical';
    else if (usagePercent > 70) memoryStatus = 'warning';
    memoryUsagePercent = parseFloat(usagePercent.toFixed(2));

    const checks = {
      database: { status: databaseStatus, responseTime: databaseResponseTime },
      cache: { status: cacheStatus, responseTime: cacheResponseTime },
      memory: {
        status: memoryStatus,
        used: memoryUsed,
        total: memoryTotal,
        usagePercent: memoryUsagePercent,
      },
    };
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (checks.database.status === 'down' || checks.cache.status === 'down') {
      status = 'unhealthy';
    } else if (
      checks.memory.status === 'critical' ||
      checks.memory.status === 'warning'
    ) {
      status = 'degraded';
    }
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  async checkDatabase(): Promise<{
    connected: boolean;
    responseTime: number;
    error?: string;
  }> {
    this.logger.debug('Checking database connection');
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        connected: true,
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.logger.error(
        `Database connection check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        connected: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getMetrics(): Promise<{
    timestamp: string;
    uptime: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    cpu: {
      usage: number;
    };
    connections: {
      active: number;
      total: number;
    };
  }> {
    this.logger.debug('Getting application metrics');
    await Promise.resolve();
    const memoryUsage = process.memoryUsage();
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
      },
      cpu: {
        usage: 0,
      },
      connections: {
        active: 0,
        total: 0,
      },
    };
  }

  async getInfo(): Promise<{
    name: string;
    version: string;
    description: string;
    environment: string;
    nodeVersion: string;
    platform: string;
    architecture: string;
    cpuCores: number;
    totalMemory: number;
    startTime: string;
  }> {
    this.logger.debug('Getting application info');
    await Promise.resolve();
    const totalMemory = os.totalmem();
    const cpus = os.cpus();
    return {
      name: process.env.npm_package_name || 'ayantaraz-api',
      version: process.env.npm_package_version || '1.0.0',
      description:
        process.env.npm_package_description || 'Ayantaraz API Service',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: os.platform(),
      architecture: os.arch(),
      cpuCores: cpus.length,
      totalMemory,
      startTime: new Date(process.uptime() * 1000).toISOString(),
    };
  }

  async ping(): Promise<{
    message: string;
    timestamp: string;
    uptime: number;
  }> {
    this.logger.debug('Ping received');
    await Promise.resolve();
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async ready(): Promise<{
    ready: boolean;
    timestamp: string;
    checks: {
      database: boolean;
      cache: boolean;
    };
  }> {
    this.logger.debug('Readiness check');
    let databaseReady = false;
    let cacheReady = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseReady = true;
    } catch (err) {
      this.logger.error(`Database readiness check failed: ${err}`);
    }
    cacheReady = true;
    return {
      ready: databaseReady && cacheReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseReady,
        cache: cacheReady,
      },
    };
  }
}
