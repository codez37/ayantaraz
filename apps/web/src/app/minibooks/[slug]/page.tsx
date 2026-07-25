'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setPageMeta, injectJsonLd } from '@/lib/seo';
import type { Content } from '@/types';

const SITE_URL = 'https://ayantaraz.ir';

export default function MinibookDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [minibook, setMinibook] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api
      .get<Content>(`/content/${slug}`)
      .then((d) => {
        setMinibook(d);

        setPageMeta({
          title: d.title,
          description: d.summary || `${d.title} - مینی‌بوک آیان تراز`,
          url: `${SITE_URL}/minibooks/${d.slug}`,
          image: d.thumbnailUrl || undefined,
          type: 'book',
          publishedAt: d.publishedAt || undefined,
        });

        injectJsonLd({
          '@context': 'https://schema.org',
          '@type': 'Book',
          name: d.title,
          description: d.summary || d.title,
          url: `${SITE_URL}/minibooks/${d.slug}`,
          image: d.thumbnailUrl || undefined,
          numberOfPages: d.pageCount || undefined,
          author: { '@type': 'Organization', name: 'آیان تراز' },
          datePublished: d.publishedAt ? new Date(d.publishedAt).toISOString() : undefined,
          inLanguage: 'fa',
        });

        injectJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'صفحه اصلی', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'مینی‌بوک‌ها', item: `${SITE_URL}/minibooks` },
            { '@type': 'ListItem', position: 3, name: d.title },
          ],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!minibook) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">📖</div>
        <h1 className="text-2xl font-black text-white mb-4">مینی‌بوک یافت نشد</h1>
        <Link href="/minibooks" className="btn-gold inline-block mt-4">
          بازگشت به مینی‌بوک‌ها
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/minibooks" className="text-[#C9A227] hover:text-[#FFB71A] text-sm mb-6 inline-block">
        ← بازگشت به مینی‌بوک‌ها
      </Link>

      <article>
        <h1 className="text-3xl font-black text-gold-gradient mb-4">{minibook.title}</h1>

        {minibook.thumbnailUrl && (
          <div className="mb-6 rounded-xl overflow-hidden">
            <img src={minibook.thumbnailUrl} alt={minibook.title} className="w-full h-auto" />
          </div>
        )}

        {minibook.summary && <p className="text-gray-400 text-lg mb-6 leading-relaxed">{minibook.summary}</p>}

        {minibook.body && (
          <div className="prose-dark text-gray-300 leading-relaxed whitespace-pre-wrap">{minibook.body}</div>
        )}

        {minibook.mediaUrl && (
          <div className="mt-8">
            <a href={minibook.mediaUrl} target="_blank" rel="noopener noreferrer" className="btn-gold inline-block">
              📥 دانلود مینی‌بوک
            </a>
          </div>
        )}

        {minibook.pageCount && <p className="text-sm text-gray-500 mt-4">{minibook.pageCount} صفحه</p>}
      </article>
    </div>
  );
}
