import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from '../content.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { UploadService } from '../../upload/upload.service';

describe('ContentService', () => {
  let service: ContentService;

  const mockPrisma = {
    content: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };

  const mockUploadService = {
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();
    service = module.get<ContentService>(ContentService);
  });

  describe('create', () => {
    it('should create content as draft', async () => {
      const input = {
        contentType: 'article',
        title: 'Test Article',
        slug: 'test-article',
        body: 'Body',
      };
      const expected = { id: 1, ...input, status: 'draft', authorId: 1 };
      mockPrisma.content.create.mockResolvedValue(expected);

      const result = await service.create(input, 1);
      expect(result.status).toBe('draft');
      expect(mockPrisma.content.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should allow draft → review', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: 1,
        status: 'draft',
        authorId: 1,
      });
      mockPrisma.content.update.mockResolvedValue({ id: 1, status: 'review' });

      const result = await service.updateStatus(
        1,
        'review',
        1,
        'content_manager',
      );
      expect(result.status).toBe('review');
    });

    it('should reject draft → archived (not admin)', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: 1,
        status: 'draft',
        authorId: 1,
      });
      await expect(
        service.updateStatus(1, 'archived', 1, 'content_manager'),
      ).rejects.toThrow();
    });

    it('should reject archive → published (invalid transition)', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: 1,
        status: 'archived',
        authorId: 1,
      });
      await expect(
        service.updateStatus(1, 'published', 1, 'admin'),
      ).rejects.toThrow();
    });
  });

  describe('getBySlug', () => {
    it('should return published content for public', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: 1,
        slug: 'test',
        status: 'published',
        visibility: 'public',
      });
      const result = await service.getBySlug('test');
      expect(result).toBeTruthy();
    });

    it('should hide draft from non-admin', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: 1,
        slug: 'test',
        status: 'draft',
        visibility: 'public',
      });
      await expect(service.getBySlug('test')).rejects.toThrow();
    });

    it('should require auth for authenticated visibility', async () => {
      mockPrisma.content.findUnique.mockResolvedValue({
        id: 1,
        slug: 'test',
        status: 'published',
        visibility: 'authenticated',
      });
      await expect(service.getBySlug('test')).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should return paginated results', async () => {
      mockPrisma.content.findMany.mockResolvedValue([{ id: 1, title: 'A' }]);
      mockPrisma.content.count.mockResolvedValue(1);
      const result = await service.list({ page: 1, limit: 20 });
      expect(result.contents).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
