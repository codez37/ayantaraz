import { Controller, Get, Param, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import { SeoService } from './seo.service';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('seo')
export class SeoController {
  constructor(
    private readonly seoService: SeoService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('sitemap.xml')
  async getSitemap(@Res() res: Response) {
    const entries = await this.seoService.generateSitemap();

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      ...entries.map((e) => {
        const images =
          e.url === 'https://ayantaraz.ir'
            ? '\n    <image:image>\n      <image:loc>https://ayantaraz.ir/logo.png</image:loc>\n    </image:image>'
            : '';
        return `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastModified}</lastmod>\n    <changefreq>${e.changeFrequency}</changefreq>\n    <priority>${e.priority}</priority>${images}\n  </url>`;
      }),
      '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  }

  @Public()
  @Get('schema/:type')
  async getSchema(@Param('type') type: string, @Query('slug') slug?: string) {
    switch (type) {
      case 'organization':
        return this.seoService.generateOrganizationSchema();
      case 'website':
        return this.seoService.generateWebSiteSchema();
      case 'article': {
        if (!slug) return null;
        const article = await this.prisma.content.findUnique({
          where: { slug },
          select: {
            title: true,
            slug: true,
            summary: true,
            body: true,
            publishedAt: true,
            updatedAt: true,
            thumbnailUrl: true,
            tags: true,
          },
        });
        return article ? this.seoService.generateArticleSchema(article) : null;
      }
      case 'video': {
        if (!slug) return null;
        const video = await this.prisma.content.findUnique({
          where: { slug },
          select: {
            title: true,
            slug: true,
            summary: true,
            duration: true,
            thumbnailUrl: true,
            publishedAt: true,
          },
        });
        return video ? this.seoService.generateVideoSchema(video) : null;
      }
      case 'minibook': {
        if (!slug) return null;
        const minibook = await this.prisma.content.findUnique({
          where: { slug },
          select: {
            title: true,
            slug: true,
            summary: true,
            thumbnailUrl: true,
            pageCount: true,
            publishedAt: true,
          },
        });
        return minibook
          ? this.seoService.generateMinibookSchema(minibook)
          : null;
      }
      case 'course': {
        if (!slug) return null;
        const course = await this.prisma.course.findUnique({
          where: { slug },
          select: {
            title: true,
            slug: true,
            description: true,
            price: true,
            publishedAt: true,
          },
        });
        return course ? this.seoService.generateCourseSchema(course) : null;
      }
      default:
        return null;
    }
  }
}
