'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { sanitizeHtml } from '@/lib/sanitize';
import { setPageMeta, injectJsonLd } from '@/lib/seo';
import type { Content } from '@/types';

const SITE_URL = 'https://ayantaraz.ir';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState<Content | null>(null);

  useEffect(() => {
    api
      .get<Content>(`/content/${slug}`)
      .then((a) => {
        setArticle(a);

        setPageMeta({
          title: a.title,
          description: a.summary || a.body?.replace(/<[^>]*>/g, '').slice(0, 320) || a.title,
          url: `${SITE_URL}/articles/${a.slug}`,
          image: a.thumbnailUrl || undefined,
          type: 'article',
          publishedAt: a.publishedAt || undefined,
        });

        injectJsonLd({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title,
          description: a.summary || a.body?.replace(/<[^>]*>/g, '').slice(0, 320),
          url: `${SITE_URL}/articles/${a.slug}`,
          mainEntityOfPage: `${SITE_URL}/articles/${a.slug}`,
          datePublished: a.publishedAt ? new Date(a.publishedAt).toISOString() : undefined,
          dateModified: a.updatedAt ? new Date(a.updatedAt).toISOString() : undefined,
          author: { '@type': 'Organization', name: 'آیان تراز', url: SITE_URL },
          publisher: {
            '@type': 'Organization',
            name: 'آیان تراز',
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
          },
          image: a.thumbnailUrl || undefined,
          keywords: a.tags || undefined,
          inLanguage: 'fa',
        });

        injectJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'صفحه اصلی', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'مقالات', item: `${SITE_URL}/articles` },
            { '@type': 'ListItem', position: 3, name: a.title },
          ],
        });
      })
      .catch(() => setArticle(null));
  }, [slug]);

  if (!article) return <div className="text-center py-16 text-gray-400">در حال بارگذاری...</div>;

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-4">{article.title}</h1>
      <p className="text-gray-500 mb-8">{new Date(article.publishedAt!).toLocaleDateString('fa-IR')}</p>
      <div
        className="prose prose-lg max-w-none text-gray-200 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_p]:text-gray-300 [&_li]:text-gray-300"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body) }}
      />
    </article>
  );
}
