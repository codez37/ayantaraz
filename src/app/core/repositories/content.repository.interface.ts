import { ContentType, ContentStatus, ContentVisibility } from '@prisma/client';
import { Content } from '../domain/content.entity';
import { PaginationOptions, PaginationResult } from '../types/pagination.types';

export interface IContentRepository {
  // Find operations
  findById(id: number): Promise<Content | null>;
  findBySlug(slug: string): Promise<Content | null>;
  findAll(options: PaginationOptions & {
    type?: ContentType;
    status?: ContentStatus;
    visibility?: ContentVisibility;
    categoryId?: number;
    authorId?: number;
    search?: string;
  }): Promise<PaginationResult<Content>>;

  // Create operations
  create(data: {
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
  }): Promise<Content>;

  // Update operations
  update(id: number, data: Partial<{
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
  }>): Promise<Content>;

  // Delete operations
  delete(id: number): Promise<void>;

  // Utility operations
  existsBySlug(slug: string): Promise<boolean>;
  countByType(type: ContentType): Promise<number>;
  countByStatus(status: ContentStatus): Promise<number>;
  countByCategory(categoryId: number): Promise<number>;

  // Publish/Unpublish
  publish(id: number): Promise<Content>;
  unpublish(id: number): Promise<Content>;

  // Archive/Unarchive
  archive(id: number): Promise<Content>;
  unarchive(id: number): Promise<Content>;
}
