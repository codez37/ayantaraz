import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Content,
  ContentStatus,
  ContentType,
  ContentVisibility,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

type ContentListFilters = {
  type?: string;
  status?: string;
  visibility?: string;
  categoryId?: number;
  search?: string;
  tags?: string;
  page?: number;
  limit?: number;
  userId?: number;
  userRole?: string;
};

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContentDto, userId: number): Promise<Content> {
    const slug = dto.slug?.trim() || this.generateSlug(dto.title);
    this.logger.log(`Creating content: ${dto.title}`);

    const content = await this.prisma.content.create({
      data: {
        contentType: dto.contentType,
        title: dto.title,
        slug,
        summary: dto.summary ?? '',
        body: dto.body ?? '',
        metaDescription: dto.metaDescription ?? '',
        tags: dto.tags ?? '',
        mediaUrl: dto.mediaUrl ?? '',
        thumbnailUrl: dto.thumbnailUrl ?? '',
        duration: dto.duration ?? 0,
        fileSize: dto.fileSize ?? 0,
        pageCount: dto.pageCount ?? 0,
        visibility: dto.visibility ?? ContentVisibility.public,
        categoryId: dto.categoryId ?? null,
        authorId: userId,
        status: ContentStatus.draft,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'content:create',
        entityType: 'content',
        entityId: content.id,
        newValue: {
          id: content.id,
          title: content.title,
          status: content.status,
        },
      },
    });

    return content;
  }

  async list(filters: ContentListFilters = {}) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 100);
    const where: Record<string, unknown> = {};

    if (this.isEnumValue(ContentType, filters.type))
      where.contentType = filters.type;
    if (this.isEnumValue(ContentStatus, filters.status))
      where.status = filters.status;
    if (this.isEnumValue(ContentVisibility, filters.visibility))
      where.visibility = filters.visibility;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.tags)
      where.tags = { contains: filters.tags, mode: 'insensitive' };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
        { body: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (!this.canManage(filters.userRole)) {
      where.status = ContentStatus.published;
      where.visibility = filters.userId
        ? { in: [ContentVisibility.public, ContentVisibility.authenticated] }
        : ContentVisibility.public;
    }

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          category: true,
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return { contents, total, page, limit };
  }

  async getBySlug(
    slug: string,
    userId?: number,
    userRole?: string,
  ): Promise<Content> {
    const content = await this.prisma.content.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        category: true,
      },
    });
    if (!content) throw new NotFoundException('Content not found');
    this.assertReadable(content, userId, userRole);
    return content;
  }

  async update(
    id: number,
    dto: UpdateContentDto,
    userId: number,
    userRole: string,
  ): Promise<Content> {
    const content = await this.getManagedContent(id, userId, userRole);
    const data: UpdateContentDto & {
      reviewedBy?: number;
      reviewedAt?: Date;
      publishedAt?: Date | null;
      archivedAt?: Date | null;
    } = { ...dto };
    if (dto.title && !dto.slug) data.slug = this.generateSlug(dto.title);
    if (dto.status) this.applyStatusMetadata(data, dto.status, userId);

    return this.prisma.content.update({ where: { id: content.id }, data });
  }

  async updateStatus(
    id: number,
    status: ContentStatus,
    userId: number,
    userRole: string,
  ): Promise<Content> {
    const content = await this.getManagedContent(id, userId, userRole);
    this.validateStatusTransition(content.status, status, userRole);
    const data: {
      status: ContentStatus;
      reviewedBy?: number;
      reviewedAt?: Date;
      publishedAt?: Date | null;
      archivedAt?: Date | null;
    } = { status };
    this.applyStatusMetadata(data, status, userId);
    return this.prisma.content.update({ where: { id }, data });
  }

  async archive(
    id: number,
    userId: number,
    userRole: string,
  ): Promise<Content> {
    return this.updateStatus(id, ContentStatus.archived, userId, userRole);
  }

  private async getManagedContent(
    id: number,
    userId: number,
    userRole: string,
  ): Promise<Content> {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');
    if (
      !this.canManage(userRole) ||
      (userRole === UserRole.content_manager && content.authorId !== userId)
    ) {
      throw new ForbiddenException('Not allowed to manage this content');
    }
    return content;
  }

  private assertReadable(
    content: Content,
    userId?: number,
    userRole?: string,
  ): void {
    if (this.canManage(userRole)) return;
    if (content.status !== ContentStatus.published)
      throw new NotFoundException('Content not found');
    if (content.visibility === ContentVisibility.public) return;
    if (content.visibility === ContentVisibility.authenticated && userId)
      return;
    throw new ForbiddenException('Not allowed to view this content');
  }

  private applyStatusMetadata(
    data: {
      status?: ContentStatus;
      reviewedBy?: number;
      reviewedAt?: Date;
      publishedAt?: Date | null;
      archivedAt?: Date | null;
    },
    status: ContentStatus,
    userId: number,
  ): void {
    if (status === ContentStatus.published) {
      data.reviewedBy = userId;
      data.reviewedAt = new Date();
      data.publishedAt = new Date();
      data.archivedAt = null;
    }
    if (status === ContentStatus.archived) data.archivedAt = new Date();
  }

  private canManage(role?: string): boolean {
    return role === UserRole.admin || role === UserRole.content_manager;
  }

  private validateStatusTransition(
    current: ContentStatus,
    target: ContentStatus,
    userRole: string,
  ): void {
    const isAdmin = userRole === UserRole.admin;
    const transitions: Record<string, ContentStatus[]> = isAdmin
      ? {
          draft: [
            ContentStatus.review,
            ContentStatus.published,
            ContentStatus.archived,
          ],
          review: [
            ContentStatus.published,
            ContentStatus.archived,
            ContentStatus.draft,
          ],
          published: [ContentStatus.archived],
          archived: [ContentStatus.draft],
        }
      : {
          draft: [ContentStatus.review],
          review: [ContentStatus.published, ContentStatus.draft],
          published: [],
          archived: [],
        };
    const allowed = transitions[current] || [];
    if (!allowed.includes(target)) {
      throw new ForbiddenException(
        `Cannot transition from ${current} to ${target}`,
      );
    }
  }

  private isEnumValue<T extends Record<string, string>>(
    values: T,
    value?: string,
  ): value is T[keyof T] {
    return Boolean(value && Object.values(values).includes(value));
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
