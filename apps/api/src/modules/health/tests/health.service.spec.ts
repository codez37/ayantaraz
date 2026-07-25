import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { PrismaService } from '../../../prisma/prisma.service';
import * as os from 'os';

jest.mock('os', () => ({
  ...jest.requireActual('os'),
  totalmem: jest.fn(() => 8 * 1024 * 1024 * 1024),
}));

describe('HealthService', () => {
  let service: HealthService;
  let mockPrisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    mockPrisma = { $queryRaw: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when database is up', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const result = await service.checkHealth();
      expect(result.status).toBe('healthy');
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.cache.status).toBe('up');
      expect(result.checks.memory.status).toBe('ok');
    });

    it('should return unhealthy status when database is down', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      const result = await service.checkHealth();
      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('down');
    });

    it('should include version and uptime in response', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const result = await service.checkHealth();
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should report memory usage with used, total, and usagePercent', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const result = await service.checkHealth();
      expect(result.checks.memory.used).toBeGreaterThan(0);
      expect(result.checks.memory.total).toBeGreaterThan(0);
      expect(result.checks.memory.usagePercent).toBeGreaterThanOrEqual(0);
    });

    it('should set memory status to warning when usage > 70%', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const memSpy = jest
        .spyOn(process, 'memoryUsage')
        .mockReturnValue({ rss: 800, heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0 } as any);
      jest.mocked(os.totalmem).mockReturnValue(1000);

      const result = await service.checkHealth();
      expect(result.checks.memory.status).toBe('warning');
      expect(result.status).toBe('degraded');

      memSpy.mockRestore();
    });

    it('should set memory status to critical when usage > 90%', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const memSpy = jest
        .spyOn(process, 'memoryUsage')
        .mockReturnValue({ rss: 950, heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0 } as any);
      jest.mocked(os.totalmem).mockReturnValue(1000);

      const result = await service.checkHealth();
      expect(result.checks.memory.status).toBe('critical');
      expect(result.status).toBe('degraded');

      memSpy.mockRestore();
    });

    it('should set overall status to unhealthy when DB down even if memory is ok', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB down'));
      const result = await service.checkHealth();
      expect(result.status).toBe('unhealthy');
    });
  });

  describe('checkDatabase', () => {
    it('should return connected=true when query succeeds', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const result = await service.checkDatabase();
      expect(result.connected).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return connected=false with error message when query fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection lost'));
      const result = await service.checkDatabase();
      expect(result.connected).toBe(false);
      expect(result.responseTime).toBe(0);
      expect(result.error).toBe('Connection lost');
    });
  });

  describe('ping', () => {
    it('should return pong message with timestamp and uptime', async () => {
      const result = await service.ping();
      expect(result.message).toBe('pong');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });

  describe('ready', () => {
    it('should return ready=true when database is connected', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const result = await service.ready();
      expect(result.ready).toBe(true);
      expect(result.checks.database).toBe(true);
      expect(result.checks.cache).toBe(true);
    });

    it('should return ready=false when database is not connected', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB down'));
      const result = await service.ready();
      expect(result.ready).toBe(false);
      expect(result.checks.database).toBe(false);
      expect(result.checks.cache).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return memory and cpu metrics', async () => {
      const result = await service.getMetrics();
      expect(result.memory.heapUsed).toBeGreaterThanOrEqual(0);
      expect(result.memory.heapTotal).toBeGreaterThanOrEqual(0);
      expect(result.memory.external).toBeGreaterThanOrEqual(0);
      expect(result.cpu).toBeDefined();
      expect(result.connections).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });

  describe('getInfo', () => {
    it('should return application info with system details', async () => {
      const result = await service.getInfo();
      expect(result.name).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.nodeVersion).toContain('v');
      expect(result.cpuCores).toBeGreaterThan(0);
      expect(result.totalMemory).toBeGreaterThan(0);
    });
  });
});
