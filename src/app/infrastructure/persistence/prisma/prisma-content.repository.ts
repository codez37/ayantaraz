import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IContentRepository } from '../../../core/repositories/content.repository.interface';
import { Content } from '../../../core/domain/content.entity';
import { ContentType, ContentStatus, ContentVisibility } from '@prisma/client';
import { PaginationOptions, PaginationResult, createPagination } from '../../../core/types/pagination.types';

@Injectable()
export class PrismaContentRepository implements IContentRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: number): Promise<Content | null> {
    const content = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!content) return null;

    return new Content(
      content.id,
      content.contentType,
      content.title,
      content.slug,
      content.summary,
      content.body,
      content.metaDescription,
      content.tags,
      content.mediaUrl,
      content.thumbnailUrl,
      content.duration,
      content.fileSize,
      content.pageCount,
      content.authorId,
      content.reviewedBy,
      content.categoryId,
      content.status,
      content.visibility,
      content.publishedAt,
      content.archivedAt,
      content.reviewedAt,
      content.createdAt,
      content.updatedAt,
    );
  }

  async findBySlug(slug: string): Promise<Content | null> {
    const content = await this.prisma.content.findUnique({
      where: { slug },
    });

    if (!content) return null;

    return new Content(
      content.id,
      content.contentType,
      content.title,
      content.slug,
      content.summary,
      content.body,
      content.metaDescription,
      content.tags,
      content.mediaUrl,
      content.thumbnailUrl,
      content.duration,
      content.fileSize,
      content.pageCount,
      content.authorId,
      content.reviewedBy,
      content.categoryId,
      content.status,
      content.visibility,
      content.publishedAt,
      content.archivedAt,
      content.reviewedAt,
      content.createdAt,
      content.updatedAt,
    );
  }

  async findAll(options: PaginationOptions & {
    type?: ContentType;
    status?: ContentStatus;
    visibility?: ContentVisibility;
    categoryId?: number;
    authorId?: number;
    search?: string;
  }): Promise<PaginationResult<Content>> {
    const { page = 1, limit = 10, sortBy = 'publishedAt', sortOrder = 'desc', ...filters } = options;

    const where: any = {};
    if (filters.type) where.contentType = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.visibility) where.visibility = filters.visibility;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
        { tags: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.content.count({ where }),
    ]);

    const result = contents.map((content: any) =>
      new Content(
        content.id,
        content.contentType,
        content.title,
        content.slug,
        content.summary,
        content.body,
        content.metaDescription,
        content.tags,
        content.mediaUrl,
        content.thumbnailUrl,
        content.duration,
        content.fileSize,
        content.pageCount,
        content.authorId,
        content.reviewedBy,
        content.categoryId,
        content.status,
        content.visibility,
        content.publishedAt,
        content.archivedAt,
        content.reviewedAt,
        content.createdAt,
        content.updatedAt,
      )
    );

    return createPagination(result, total, options);
  }

  async create(data: {
    contentType: ContentType;
    title: string;
    slug: string;
    summary?: string;
    body: string;
    metaDescription?: string;
    tags?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    fileSize?: number;
    pageCount?: number;
    authorId?: number;
    categoryId?: number;
    status?: ContentStatus;
    visibility?: ContentVisibility;
    publishedAt?: Date;
  }): Promise<Content> {
    const content = await this.prisma.content.create({
      data,
    });

    return new Content(
      content.id,
      content.contentType,
      content.title,
      content.slug,
      content.summary,
      content.body,
      content.metaDescription,
      content.tags,
      content.mediaUrl,
      content.thumbnailUrl,
      content.duration,
      content.fileSize,
      content.pageCount,
      content.authorId,
      content.reviewedBy,
      content.categoryId,
      content.status,
      content.visibility,
      content.publishedAt,
      content.archivedAt,
      content.reviewedAt,
      content.createdAt,
      content.updatedAt,
    );
  }

  async update(id: number, data: Partial<{
    contentType: ContentType;
    title: string;
    slug: string;
    summary: string;
    body: string;
    metaDescription: string;
    tags: string;
    mediaUrl: string;
    thumbnailUrl: string;
    duration: number;
    fileSize: number;
    pageCount: number;
    authorId: number;
    reviewedBy: number;
    categoryId: number;
    status: ContentStatus;
    visibility: ContentVisibility;
    publishedAt: Date;
    archivedAt: Date;
  }>): Promise<Content> {
    const content = await this.prisma.content.update({
      where: { id },
      data,
    });

    return new Content(
      content.id,
      content.contentType,
      content.title,
      content.slug,
      content.summary,
      content.body,
      content.metaDescription,
      content.tags,
      content.mediaUrl,
      content.thumbnailUrl,
      content.duration,
      content.fileSize,
      content.pageCount,
      content.authorId,
      content.reviewedBy,
      content.categoryId,
      content.status,
      content.visibility,
      content.publishedAt,
      content.archivedAt,
      content.reviewedAt,
      content.createdAt,
      content.updatedAt,
    );
  }

  async delete(id: number): Promise<void> {
    await this.prisma.content.delete({
      where: { id },
    });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.content.count({
      where: { slug },
    });
    return count > 0;
  }

  async countByType(type: ContentType): Promise<number> {
    return this.prisma.content.count({
      where: { contentType: type },
    });
  }

  async countByStatus(status: ContentStatus): Promise<number> {
    return this.prisma.content.count({
      where: { status },
    });
  }

  async countByCategory(categoryId: number): Promise<number> {
    return this.prisma.content.count({
      where: { categoryId },
    });
  }

  async publish(id: number): Promise<Content> {
    const content = await this.prisma.content.update({
      where: { id },
      data: {
        status: ContentStatus.published,
        publishedAt: new Date(),
      },
    });

    return new Content(
      content.id,
      content.contentType,
      content.title,
      content.slug,
      content.summary,
      content.body,
      content.metaDescription,
      content.tags,
      content.mediaUrl,
      content.thumbnailUrl,
      content.duration,
      content.fileSize,
      content.pageCount,
      content.authorId,
      content.reviewedBy,
      content.categoryId,
      content.status,
      content.visibility,
      content.publishedAt,
      content.archivedAt,
      content.reviewedAt,
      content.createdAt,
      content.updatedAt,
    );
  }

  async unpublish(id: number): Promise<Content> {
    const content = await this.prisma.content.update({
      where: { id },
      data: {
        status: ContentStatus.draft,
        publishedAt: null,
      },
    });

    return new Content(
      content.id,
      content.contentType,
      content.title,
      content.slug,
      content.summary,
      content.body,
      content.metaDescription,
      content.tags,
      content.mediaUrl,
      content.thumbnailUrl,
      content.duration,
      content.fileSize,
      content.pageCount,
      content.authorId,
      content.reviewedBy,
      content.categoryId,
      content.status,
      content.visibility,
      content.publishedAt,
      content.archivedAt,
      content.reviewedAt,
      content.createdAt,
      content.updatedAt,
    );
  }

  async archive(id: number): Promise<Content> {
    const content = await this.prisma.content.update({
      where: { id },
      data: {
        status: ContentStatus.archived,
        archivedAt: new Date(),
      },
    });

    return new Content(
      content.id,
      content.contentType,
      content.title,
      content.slug,
      content.summary,
      content.body,
      content.metaDescription,
      content.tags,
      content.mediaUrl,
      content.thumbnailUrl,
      content.duration,
      content.fileSize,
      content.pageCount,
      content.authorId,
      content.reviewedBy,
      content.categoryId,
      content.status,
      content.visibility,
      content.publishedAt,
      content.archivedAt,
      content.reviewedAt,
      content.createdAt,
      content.updatedAt,
    );
  }

  async unarchive(id: number): Promise<Content> {
    const content = await this.prisma.content.update({
      where: { id },
      data: {
        status: ContentStatus.draft,
        archivedAt: null,
      },
    });

    return new Content(
      content.id,
      content.contentType,
      content.title,
      content.slug,
      content.summary,
      content.body,
      content.metaDescription,
      content.tags,
      content.mediaUrl,
      content.thumbnailUrl,
      content.duration,
      content.fileSize,
      content.pageCount,
      content.authorId,
      content.reviewedBy,
      content.categoryId,
      content.status,
      content.visibility,
      content.publishedAt,
      content.archivedAt,
      content.reviewedAt,
      content.createdAt,
      content.updatedAt,
    );
  }
}
