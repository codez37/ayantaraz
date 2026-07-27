import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from '../content.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

// Mock PrismaService
const mockPrismaService = {
  content: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should return paginated contents', async () => {
      const mockContents = [
        { id: 1, title: 'Test Content 1', slug: 'test-1' },
        { id: 2, title: 'Test Content 2', slug: 'test-2' },
      ];
      const mockCount = 2;

      mockPrismaService.content.findMany.mockResolvedValue(mockContents);
      mockPrismaService.content.count.mockResolvedValue(mockCount);

      const result = await service.getAll({ page: 1, limit: 10 });
      expect(result).toEqual({
        data: mockContents,
        meta: {
          total: mockCount,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    });

    it('should handle empty result', async () => {
      mockPrismaService.content.findMany.mockResolvedValue([]);
      mockPrismaService.content.count.mockResolvedValue(0);

      const result = await service.getAll({ page: 1, limit: 10 });
      expect(result).toEqual({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    });
  });

  describe('getById', () => {
    it('should return content by id', async () => {
      const mockContent = { id: 1, title: 'Test Content', slug: 'test' };
      mockPrismaService.content.findUnique.mockResolvedValue(mockContent);

      const result = await service.getById(1);
      expect(result).toEqual(mockContent);
    });

    it('should throw error when content not found', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.getById(999)).rejects.toThrow(
        new HttpException('Content not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('create', () => {
    it('should create new content', async () => {
      const createData = {
        title: 'New Content',
        contentType: 'article',
        slug: 'new-content',
      };
      const mockContent = { id: 1, ...createData };

      mockPrismaService.content.create.mockResolvedValue(mockContent);
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 1 });

      const result = await service.create(createData, 1);
      expect(result).toEqual(mockContent);
    });
  });

  describe('update', () => {
    it('should update existing content', async () => {
      const updateData = { title: 'Updated Content' };
      const mockContent = { id: 1, title: 'Updated Content', slug: 'updated' };

      mockPrismaService.content.findUnique.mockResolvedValue({ id: 1, title: 'Old Content' });
      mockPrismaService.content.update.mockResolvedValue(mockContent);
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 1 });

      const result = await service.update(1, updateData, 1);
      expect(result).toEqual(mockContent);
    });

    it('should throw error when content not found', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.update(999, {}, 1)).rejects.toThrow(
        new HttpException('Content not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('delete', () => {
    it('should delete content', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue({ id: 1, title: 'Test' });
      mockPrismaService.content.delete.mockResolvedValue({ id: 1 });
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 1 });

      const result = await service.delete(1, 1);
      expect(result).toEqual({ message: 'Content deleted successfully' });
    });

    it('should throw error when content not found', async () => {
      mockPrismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(
        new HttpException('Content not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
