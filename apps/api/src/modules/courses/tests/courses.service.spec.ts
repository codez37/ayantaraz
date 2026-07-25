import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from '../courses.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('CoursesService', () => {
  let service: CoursesService;

  const mockCourse = {
    id: 1,
    title: 'Tax Basics',
    slug: 'tax-basics',
    price: 100000,
    status: 'published',
    authorId: 2,
    createdAt: new Date(),
  };

  const mockPrisma = {
    course: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    courseVideo: { findMany: jest.fn(), findUnique: jest.fn() },
    enrollment: { findMany: jest.fn(), findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CoursesService>(CoursesService);
  });

  describe('list', () => {
    it('should list published courses without enrollment flags for guests', async () => {
      mockPrisma.course.findMany.mockResolvedValueOnce([mockCourse]);
      const result = await service.list();
      expect(result).toEqual([mockCourse]);
      expect(mockPrisma.enrollment.findMany).not.toHaveBeenCalled();
    });

    it('should annotate isEnrolled for an authenticated user', async () => {
      mockPrisma.course.findMany.mockResolvedValueOnce([mockCourse]);
      mockPrisma.enrollment.findMany.mockResolvedValueOnce([{ courseId: 1 }]);
      const result = await service.list(1);
      expect((result[0] as any).isEnrolled).toBe(true);
    });

    it('should mark un-enrolled courses as isEnrolled=false', async () => {
      mockPrisma.course.findMany.mockResolvedValueOnce([mockCourse]);
      mockPrisma.enrollment.findMany.mockResolvedValueOnce([]);
      const result = await service.list(1);
      expect((result[0] as any).isEnrolled).toBe(false);
    });
  });

  describe('myCourses', () => {
    it('should return enrolled courses with isEnrolled=true', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValueOnce([
        { course: mockCourse },
      ]);
      const result = await service.myCourses(1);
      expect(result).toHaveLength(1);
      expect(result[0].isEnrolled).toBe(true);
    });
  });

  describe('getBySlug', () => {
    it('should throw NOT_FOUND when the course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValueOnce(null);
      await expect(service.getBySlug('missing')).rejects.toThrow(HttpException);
      await expect(service.getBySlug('missing')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should only expose sample videos to guests', async () => {
      mockPrisma.course.findUnique.mockResolvedValueOnce({
        ...mockCourse,
        author: { id: 2, firstName: 'A', lastName: 'B' },
      });
      mockPrisma.courseVideo.findMany.mockResolvedValueOnce([
        { id: 10, isSample: true },
      ]);
      const result = await service.getBySlug('tax-basics');
      expect(result.isEnrolled).toBe(false);
      expect(mockPrisma.courseVideo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isSample: true,
            status: 'published',
          }),
        }),
      );
    });

    it('should expose all published videos to enrolled users', async () => {
      mockPrisma.course.findUnique.mockResolvedValueOnce({
        ...mockCourse,
        author: { id: 2, firstName: 'A', lastName: 'B' },
      });
      mockPrisma.enrollment.findUnique.mockResolvedValueOnce({
        isActive: true,
      });
      mockPrisma.courseVideo.findMany.mockResolvedValueOnce([
        { id: 10, isSample: true },
        { id: 11, isSample: false },
      ]);
      const result = await service.getBySlug('tax-basics', 1);
      expect(result.isEnrolled).toBe(true);
      expect(mockPrisma.courseVideo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ isSample: true }),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a course and write an audit log entry', async () => {
      mockPrisma.course.create.mockResolvedValueOnce(mockCourse);
      mockPrisma.auditLog.create.mockResolvedValueOnce({});
      const result = await service.create(
        { title: 'Tax Basics', slug: 'tax-basics', price: 100000 },
        2,
      );
      expect(result).toEqual(mockCourse);
      expect(mockPrisma.course.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ authorId: 2 }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'course_create',
          entityType: 'course',
          entityId: 1,
          actorId: 2,
        }),
      });
    });
  });

  describe('getVideo', () => {
    it('should throw NOT_FOUND when the video does not exist', async () => {
      mockPrisma.courseVideo.findUnique.mockResolvedValueOnce(null);
      await expect(service.getVideo(99)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should allow guests to view sample videos', async () => {
      mockPrisma.courseVideo.findUnique.mockResolvedValueOnce({
        id: 10,
        isSample: true,
        courseId: 1,
        course: mockCourse,
      });
      const result = await service.getVideo(10);
      expect(result.id).toBe(10);
    });

    it('should require login for non-sample videos', async () => {
      mockPrisma.courseVideo.findUnique.mockResolvedValueOnce({
        id: 11,
        isSample: false,
        courseId: 1,
        course: mockCourse,
      });
      await expect(service.getVideo(11)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it('should forbid non-sample videos to non-enrolled users', async () => {
      mockPrisma.courseVideo.findUnique.mockResolvedValueOnce({
        id: 11,
        isSample: false,
        courseId: 1,
        course: mockCourse,
      });
      mockPrisma.enrollment.findUnique.mockResolvedValueOnce({
        isActive: false,
      });
      await expect(service.getVideo(11, 1)).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('should allow enrolled users to view non-sample videos', async () => {
      mockPrisma.courseVideo.findUnique.mockResolvedValueOnce({
        id: 11,
        isSample: false,
        courseId: 1,
        course: mockCourse,
      });
      mockPrisma.enrollment.findUnique.mockResolvedValueOnce({
        isActive: true,
      });
      const result = await service.getVideo(11, 1);
      expect(result.id).toBe(11);
    });
  });
});
