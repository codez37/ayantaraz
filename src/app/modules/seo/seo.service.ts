import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const BASE_URL = 'https://ayantaraz.ir';

interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority: number;
}

export interface SchemaOrgBase {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSitemap(): Promise<SitemapEntry[]> {
    const today = new Date().toISOString();

    const staticPages: SitemapEntry[] = [
      {
        url: BASE_URL,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 1.0,
      },
      {
        url: `${BASE_URL}/about`,
        lastModified: today,
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: `${BASE_URL}/services`,
        lastModified: today,
        changeFrequency: 'monthly',
        priority: 0.9,
      },
      {
        url: `${BASE_URL}/contact`,
        lastModified: today,
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: `${BASE_URL}/faq`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${BASE_URL}/articles`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${BASE_URL}/courses`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${BASE_URL}/consultation`,
        lastModified: today,
        changeFrequency: 'monthly',
        priority: 0.9,
      },
      {
        url: `${BASE_URL}/tax-consultant`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${BASE_URL}/videos`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      {
        url: `${BASE_URL}/minibooks`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.7,
      },
    ];

    const [contents, courses] = await Promise.all([
      this.prisma.content.findMany({
        where: { status: 'published', visibility: 'public' },
        select: {
          contentType: true,
          slug: true,
          updatedAt: true,
          publishedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.course.findMany({
        where: { status: 'published' },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const contentEntries: SitemapEntry[] = contents.map(
      (c: {
        contentType: string;
        slug: string;
        updatedAt: Date | null;
        publishedAt: Date | null;
      }) => {
        let path: string;
        let priority: number;
        let changeFreq: SitemapEntry['changeFrequency'];

        switch (c.contentType) {
          case 'article':
            path = `/articles/${c.slug}`;
            priority = 0.6;
            changeFreq = 'weekly';
            break;
          case 'video':
            path = `/videos/${c.slug}`;
            priority = 0.5;
            changeFreq = 'monthly';
            break;
          case 'minibook':
            path = `/minibooks/${c.slug}`;
            priority = 0.5;
            changeFreq = 'monthly';
            break;
          default:
            path = `/${c.slug}`;
            priority = 0.4;
            changeFreq = 'monthly';
        }

        return {
          url: `${BASE_URL}${path}`,
          lastModified: (
            c.updatedAt ||
            c.publishedAt ||
            new Date()
          ).toISOString(),
          changeFrequency: changeFreq,
          priority,
        };
      },
    );

    const courseEntries: SitemapEntry[] = courses.map(
      (c: {
        slug: string;
        updatedAt: Date | null;
        publishedAt: Date | null;
      }) => ({
        url: `${BASE_URL}/courses/${c.slug}`,
        lastModified: (
          c.updatedAt ||
          c.publishedAt ||
          new Date()
        ).toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }),
    );

    return [...staticPages, ...contentEntries, ...courseEntries];
  }

  generateOrganizationSchema(): SchemaOrgBase {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'آیان تراز',
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      description: 'ارائه خدمات حسابداری، مشاوره مالیاتی و آموزش مالی',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+98-913-429-2329',
        contactType: 'customer service',
        availableLanguage: 'fa',
      },
      sameAs: ['https://instagram.com/samtaxco', 'https://t.me/samtax'],
    };
  }

  generateWebSiteSchema(): SchemaOrgBase {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: BASE_URL,
      name: 'آیان تراز',
      description: 'خدمات حسابداری، مشاوره مالیاتی و آموزش مالی',
      inLanguage: 'fa',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };
  }

  generateArticleSchema(article: {
    title: string;
    slug: string;
    summary?: string;
    body?: string;
    publishedAt?: Date | string | null;
    updatedAt?: Date | string | null;
    thumbnailUrl?: string;
    tags?: string;
  }): SchemaOrgBase {
    const url = `${BASE_URL}/articles/${article.slug}`;
    const description = article.summary || article.body?.slice(0, 320) || '';

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description,
      url,
      mainEntityOfPage: url,
      datePublished: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : undefined,
      dateModified: article.updatedAt
        ? new Date(article.updatedAt).toISOString()
        : undefined,
      author: { '@type': 'Organization', name: 'آیان تراز', url: BASE_URL },
      publisher: {
        '@type': 'Organization',
        name: 'آیان تراز',
        logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
      },
      image: article.thumbnailUrl || undefined,
      keywords: article.tags || undefined,
      inLanguage: 'fa',
    };
  }

  generateVideoSchema(video: {
    title: string;
    slug: string;
    summary?: string;
    duration?: number;
    thumbnailUrl?: string;
    publishedAt?: Date | string | null;
  }): SchemaOrgBase {
    const url = `${BASE_URL}/videos/${video.slug}`;
    const isoDuration = video.duration
      ? `PT${Math.floor(video.duration / 60)}M${video.duration % 60}S`
      : undefined;

    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: video.title,
      description: video.summary || video.title,
      url,
      embedUrl: url,
      thumbnailUrl: video.thumbnailUrl || undefined,
      duration: isoDuration,
      uploadDate: video.publishedAt
        ? new Date(video.publishedAt).toISOString()
        : undefined,
      publisher: {
        '@type': 'Organization',
        name: 'آیان تراز',
        logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo.png` },
      },
      inLanguage: 'fa',
    };
  }

  generateMinibookSchema(minibook: {
    title: string;
    slug: string;
    summary?: string;
    thumbnailUrl?: string;
    pageCount?: number;
    publishedAt?: Date | string | null;
  }): SchemaOrgBase {
    const url = `${BASE_URL}/minibooks/${minibook.slug}`;

    return {
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: minibook.title,
      description: minibook.summary || minibook.title,
      url,
      image: minibook.thumbnailUrl || undefined,
      numberOfPages: minibook.pageCount || undefined,
      author: { '@type': 'Organization', name: 'آیان تراز' },
      datePublished: minibook.publishedAt
        ? new Date(minibook.publishedAt).toISOString()
        : undefined,
      inLanguage: 'fa',
    };
  }

  generateCourseSchema(course: {
    title: string;
    slug: string;
    description?: string;
    price?: number;
    publishedAt?: Date | string | null;
  }): SchemaOrgBase {
    const url = `${BASE_URL}/courses/${course.slug}`;

    return {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description: course.description || course.title,
      url,
      provider: {
        '@type': 'Organization',
        name: 'آیان تراز',
        url: BASE_URL,
      },
      offers: {
        '@type': 'Offer',
        price: course.price || 0,
        priceCurrency: 'IRR',
        availability: 'https://schema.org/InStock',
      },
      inLanguage: 'fa',
    };
  }

  generateBreadcrumbSchema(
    items: { name: string; url: string }[],
  ): SchemaOrgBase {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
      })),
    };
  }

  generateFAQSchema(
    faqs: { question: string; answer: string }[],
  ): SchemaOrgBase {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
  }
}
