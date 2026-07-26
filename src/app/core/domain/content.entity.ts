import { ContentType, ContentStatus, ContentVisibility } from '@prisma/client';

export class Content {
  constructor(
    public readonly id: number,
    public contentType: ContentType,
    public title: string,
    public slug: string,
    public summary: string,
    public body: string,
    public metaDescription: string,
    public tags: string,
    public mediaUrl: string | null,
    public thumbnailUrl: string | null,
    public duration: number,
    public fileSize: number,
    public pageCount: number,
    public authorId: number | null,
    public reviewedBy: number | null,
    public categoryId: number | null,
    public status: ContentStatus,
    public visibility: ContentVisibility,
    public publishedAt: Date | null,
    public archivedAt: Date | null,
    public reviewedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get isPublished(): boolean {
    return this.status === ContentStatus.published && this.publishedAt !== null;
  }

  get isPublic(): boolean {
    return this.visibility === ContentVisibility.public;
  }

  get isVisibleToUser(): boolean {
    return (
      this.isPublic ||
      this.visibility === ContentVisibility.authenticated ||
      this.visibility === ContentVisibility.course_only
    );
  }

  get wordCount(): number {
    return this.body.split(/\s+/).filter(word => word.length > 0).length;
  }

  get readingTime(): number {
    return Math.ceil(this.wordCount / 200);
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      contentType: this.contentType,
      title: this.title,
      slug: this.slug,
      summary: this.summary,
      body: this.body,
      metaDescription: this.metaDescription,
      tags: this.tags.split(','),
      mediaUrl: this.mediaUrl,
      thumbnailUrl: this.thumbnailUrl,
      duration: this.duration,
      fileSize: this.fileSize,
      pageCount: this.pageCount,
      authorId: this.authorId,
      reviewedBy: this.reviewedBy,
      categoryId: this.categoryId,
      status: this.status,
      visibility: this.visibility,
      publishedAt: this.publishedAt,
      isPublished: this.isPublished,
      isPublic: this.isPublic,
      wordCount: this.wordCount,
      readingTime: this.readingTime,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
