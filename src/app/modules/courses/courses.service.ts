import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async list(userId?: number) {
    const courses = await this.prisma.course.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
    });
    if (!userId) return courses;
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, isActive: true },
      select: { courseId: true },
    });
    const enrolledIds = new Set(enrollments.map((e) => e.courseId));
    return courses.map((c) => ({ ...c, isEnrolled: enrolledIds.has(c.id) }));
  }

  async myCourses(userId: number) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, isActive: true },
      include: { course: true },
    });
    return enrollments.map((e) => ({ ...e.course, isEnrolled: true }));
  }

  async getBySlug(slug: string, userId?: number) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!course) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    let isEnrolled = false;
    if (userId) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
      });
      isEnrolled = enrollment?.isActive || false;
    }

    const videos = await this.prisma.courseVideo.findMany({
      where: {
        courseId: course.id,
        status: 'published',
        ...(isEnrolled ? {} : { isSample: true }),
      },
      orderBy: { sortOrder: 'asc' },
    });

    return { ...course, videos, isEnrolled };
  }

  async create(data: Prisma.CourseCreateInput, authorId: number) {
    const course = await this.prisma.course.create({
      data: { ...data, authorId } as Prisma.CourseCreateInput,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: authorId,
        action: 'course_create',
        entityType: 'course',
        entityId: course.id,
        newValue: {
          title: course.title,
          price: course.price,
        },
      },
    });

    return course;
  }

  async getVideo(id: number, userId?: number) {
    const video = await this.prisma.courseVideo.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!video) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    if (!video.isSample) {
      if (!userId)
        throw new HttpException('Login required', HttpStatus.UNAUTHORIZED);
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: video.courseId } },
      });
      if (!enrollment?.isActive) {
        throw new HttpException(
          'Not enrolled in this course',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    return video;
  }
}
