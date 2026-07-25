'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setPageMeta, injectJsonLd } from '@/lib/seo';
import type { Content } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://api:3001';
const SITE_URL = 'https://ayantaraz.ir';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const faDigits = (n: number) => n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  return `${faDigits(m)}:${faDigits(s).padStart(2, '۰')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fa-IR');
}

export default function VideoDetailPage() {
  const { slug } = useParams();
  const [video, setVideo] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const d = await api.get<Content>(`/content/${slug}`);
        setVideo(d);

        setPageMeta({
          title: d.title,
          description: d.summary || `${d.title} - ویدیوی آموزشی آیان تراز`,
          url: `${SITE_URL}/videos/${d.slug}`,
          image: d.thumbnailUrl || undefined,
          type: 'video.other',
          publishedAt: d.publishedAt || undefined,
        });

        const isoDuration = d.duration ? `PT${Math.floor(d.duration / 60)}M${d.duration % 60}S` : undefined;

        injectJsonLd({
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: d.title,
          description: d.summary || d.title,
          url: `${SITE_URL}/videos/${d.slug}`,
          embedUrl: `${SITE_URL}/videos/${d.slug}`,
          thumbnailUrl: d.thumbnailUrl || undefined,
          duration: isoDuration,
          uploadDate: d.publishedAt ? new Date(d.publishedAt).toISOString() : undefined,
          publisher: {
            '@type': 'Organization',
            name: 'آیان تراز',
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
          },
          inLanguage: 'fa',
        });

        injectJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'صفحه اصلی', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'ویدیوها', item: `${SITE_URL}/videos` },
            { '@type': 'ListItem', position: 3, name: d.title },
          ],
        });
      } catch {}
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!video)
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-lg">ویدیو یافت نشد.</p>
        <Link href="/videos" className="text-[#C9A227] hover:underline">
          بازگشت به ویدیوها
        </Link>
      </div>
    );

  const mediaUrl = video.mediaUrl?.startsWith('http') ? video.mediaUrl : `${API_BASE}${video.mediaUrl}`;
  const thumbUrl = video.thumbnailUrl?.startsWith('http') ? video.thumbnailUrl : `${API_BASE}${video.thumbnailUrl}`;

  return (
    <div dir="rtl" className="min-h-screen bg-[#121212]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/videos"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#C9A227] transition mb-6 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          بازگشت به ویدیوها
        </Link>

        <div className="aspect-video bg-black rounded-xl overflow-hidden mb-6">
          {video.mediaUrl ? (
            <video
              src={mediaUrl}
              controls
              className="w-full h-full"
              poster={video.thumbnailUrl ? thumbUrl : undefined}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#C9A227]/20 to-[#FFA000]/10 flex items-center justify-center">
              <svg className="w-20 h-20 text-[#C9A227]/30" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>

        <div className="bg-[#1C1C1C] border border-[#C9A227]/10 rounded-xl p-6">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {video.categoryName && (
              <span className="bg-[#C9A227]/20 text-[#FFB71A] text-xs px-2.5 py-1 rounded-full">
                {video.categoryName}
              </span>
            )}
            {video.duration > 0 && (
              <span className="text-gray-400 text-xs flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {formatDuration(video.duration)}
              </span>
            )}
            <span className="text-gray-500 text-xs">{formatDate(video.createdAt)}</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">{video.title}</h1>

          {video.summary && <p className="text-gray-400 leading-relaxed mb-4">{video.summary}</p>}

          {video.author && (
            <p className="text-xs text-gray-500">
              مدرس: {video.author.firstName} {video.author.lastName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
