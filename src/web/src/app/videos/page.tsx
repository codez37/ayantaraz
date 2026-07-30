'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import type { Content, PaginatedResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://api:3001';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const faDigits = (n: number) => n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  return `${faDigits(m)}:${faDigits(s).padStart(2, '۰')}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fa-IR');
}

function toPersianViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + ' میلیون';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api.get<PaginatedResponse<Content>>('/content?type=video&status=published&limit=50');
        setVideos(d.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const filtered = videos.filter((v) => v.title.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div dir="rtl" className="min-h-screen bg-[#121212]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gold-gradient mb-3">ویدیوهای آموزشی</h1>
          <p className="text-gray-400 max-w-xl mx-auto">مجموعه ویدیوهای آموزشی حسابداری، مالیات و مدیریت مالی</p>
        </div>

        <div className="relative max-w-md mx-auto mb-10">
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="جستجوی عنوان ویدیو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full pr-12 pl-4 py-3 rounded-xl bg-[#1A1A1A] border border-[#C9A227]/10 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#C9A227]/40 transition"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">ویدیویی یافت نشد.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filtered.map((video) => (
              <Link
                key={video.id}
                href={`/videos/${video.slug}`}
                className="bg-[#1C1C1C] border border-[#C9A227]/10 rounded-xl overflow-hidden hover:border-[#C9A227]/30 transition group block"
              >
                <div className="relative aspect-video bg-gradient-to-br from-[#C9A227]/30 to-[#FFA000]/10 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300 overflow-hidden">
                  {video.thumbnailUrl ? (
                    <Image
                      src={
                        video.thumbnailUrl.startsWith('http') ? video.thumbnailUrl : `${API_BASE}${video.thumbnailUrl}`
                      }
                      alt={video.title}
                      className="w-full h-full object-cover absolute inset-0"
                      fill
                      unoptimized
                    />
                  ) : null}
                  <svg className="w-16 h-16 text-[#C9A227]/50 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {(video.duration ?? 0) > 0 && (
                    <span className="absolute bottom-3 left-3 bg-black/70 text-gray-200 text-xs px-2 py-1 rounded font-mono z-10">
                      {formatDuration(video.duration ?? 0)}
                    </span>
                  )}
                  {video.categoryName && (
                    <span className="absolute top-3 right-3 bg-[#C9A227]/20 text-[#FFB71A] text-xs px-2.5 py-1 rounded-full z-10">
                      {video.categoryName}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-bold text-gray-200 mb-1.5 line-clamp-2 hover:text-[#C9A227] transition leading-snug">
                    {video.title}
                  </h2>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">{video.summary}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {video.mediaUrl && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {formatDuration(video.duration ?? 0)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {toPersianViews(0)} بازدید
                    </span>
                    <span>{formatDate(video.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
