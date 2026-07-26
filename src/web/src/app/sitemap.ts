import type { MetadataRoute } from 'next';
import { getImageSitemap } from '@/lib/sitemap-images';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://202.133.91.13';

async function fetchDynamicUrls(): Promise<MetadataRoute.Sitemap> {
  // FIX: Use Docker service name 'api' instead of localhost for production
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://api:3001/api';

  try {
    const res = await fetch(`${apiBase}/content?status=published&visibility=public&limit=100`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const body = await res.json();
    const contents = body.data ?? body ?? [];

    const today = new Date();
    return contents
      .filter((c: { contentType: string }) => c.contentType !== undefined)
      .map((c: { contentType: string; slug: string; updatedAt: string; publishedAt: string }) => {
        const base = BASE_URL;
        let url: string;
        let priority: number;
        let changeFrequency: 'weekly' | 'monthly';

        switch (c.contentType) {
          case 'article':
            url = `${base}/articles/${c.slug}`;
            priority = 0.6;
            changeFrequency = 'weekly';
            break;
          case 'video':
            url = `${base}/videos/${c.slug}`;
            priority = 0.5;
            changeFrequency = 'monthly';
            break;
          case 'minibook':
            url = `${base}/minibooks/${c.slug}`;
            priority = 0.5;
            changeFrequency = 'monthly';
            break;
          default:
            url = `${base}/${c.slug}`;
            priority = 0.5;
            changeFrequency = 'monthly';
        }

        return {
          url,
          lastModified: new Date(c.updatedAt || c.publishedAt || today),
          changeFrequency,
          priority,
        } as MetadataRoute.Sitemap[number];
      });
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 1,
    },
    { url: `${BASE_URL}/about`, lastModified: today, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/services`, lastModified: today, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/contact`, lastModified: today, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/faq`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/articles`, lastModified: today, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/courses`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/consultation`, lastModified: today, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/tax-consultant`, lastModified: today, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/videos`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/minibooks`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const dynamicPages = await fetchDynamicUrls();
  return [...staticPages, ...dynamicPages];
}
