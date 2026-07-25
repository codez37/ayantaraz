import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<HealthService>(HealthService);
  });

  describe('checkHealth', () => {
    it('should report healthy when database is up', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      const result = await service.checkHealth();
      expect(result.status).toBe('healthy');
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.cache.status).toBe('up');
      expect(result.checks.memory.status).toBe('ok');
      expect(result.checks.memory.usagePercent).toBeLessThanOrEqual(100);
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.version).toBeDefined();
    });

    it('should report unhealthy when database is down', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(
        new Error('connection refused'),
      );
      const result = await service.checkHealth();
      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.database.responseTime).toBe(0);
    });

    it('should use RSS memory and total system memory for usage percent', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      const result = await service.checkHealth();
      const mem = process.memoryUsage();
      const os = require('os');
      expect(result.checks.memory.used).toBe(mem.rss);
      expect(result.checks.memory.total).toBe(os.totalmem());
      const expectedPercent = parseFloat(
        ((mem.rss / os.totalmem()) * 100).toFixed(2),
      );
      expect(result.checks.memory.usagePercent).toBeCloseTo(expectedPercent, 2);
    });

    it('should classify memory as critical when usage exceeds 90%', async () => {
      const os = require('os');
      const realTotalmem = os.totalmem;
      os.totalmem = () => 100;
      try {
        mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
        const result = await service.checkHealth();
        expect(result.checks.memory.status).toBe('critical');
        expect(result.status).toBe('degraded');
      } finally {
        os.totalmem = realTotalmem;
      }
    });
  });

  describe('checkDatabase', () => {
    it('should return connected=true on success', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      const result = await service.checkDatabase();
      expect(result.connected).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return connected=false with error message on failure', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('boom'));
      const result = await service.checkDatabase();
      expect(result.connected).toBe(false);
      expect(result.error).toBe('boom');
      expect(result.responseTime).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return current process memory metrics', async () => {
      const result = await service.getMetrics();
      expect(result.memory.heapUsed).toBeGreaterThan(0);
      expect(result.memory.heapTotal).toBeGreaterThan(0);
      expect(result.memory.external).toBeGreaterThanOrEqual(0);
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.cpu.usage).toBe(0);
      expect(result.connections).toEqual({ active: 0, total: 0 });
    });
  });

  describe('ping', () => {
    it('should return pong with a timestamp and uptime', async () => {
      const result = await service.ping();
      expect(result.message).toBe('pong');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });

  describe('ready', () => {
    it('should report ready when database is reachable', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      const result = await service.ready();
      expect(result.ready).toBe(true);
      expect(result.checks.database).toBe(true);
      expect(result.checks.cache).toBe(true);
    });

    it('should report not ready when database is unreachable', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('down'));
      const result = await service.ready();
      expect(result.ready).toBe(false);
      expect(result.checks.database).toBe(false);
    });
  });

  describe('getInfo', () => {
    it('should return runtime environment info', async () => {
      const result = await service.getInfo();
      expect(result.nodeVersion).toBe(process.version);
      expect(result.cpuCores).toBeGreaterThan(0);
      expect(result.totalMemory).toBeGreaterThan(0);
    });
  });
});
