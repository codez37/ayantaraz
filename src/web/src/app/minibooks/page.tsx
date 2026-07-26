'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import type { Content, PaginatedResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://api:3001';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return 'نامشخص';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  const faDigits = (n: string) => n.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  return faDigits(size.toFixed(i === 0 ? 0 : 1)) + ' ' + units[i];
}

function formatPageCount(n: number): string {
  return n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
}

export default function MinibooksPage() {
  const [minibooks, setMinibooks] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api.get<PaginatedResponse<Content>>('/content?type=minibook&status=published&limit=50');
        setMinibooks(d.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const filtered = minibooks.filter(
    (b) =>
      b.title.toLowerCase().includes(search.trim().toLowerCase()) ||
      b.summary.toLowerCase().includes(search.trim().toLowerCase()) ||
      (b.categoryName || '').toLowerCase().includes(search.trim().toLowerCase()),
  );

  const imageSrc = (item: Content) => {
    if (item.thumbnailUrl) {
      return item.thumbnailUrl.startsWith('http') ? item.thumbnailUrl : `${API_BASE}${item.thumbnailUrl}`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-gold-gradient text-4xl font-bold mb-3">مینی‌بوک‌های آموزشی</h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
            جزوه‌ها و کتابچه‌های کاربردی در حوزه حسابداری، مالیات و مدیریت مالی — رایگان دانلود کنید
          </p>
        </div>

        <div className="max-w-md mx-auto mb-10">
          <input
            type="text"
            placeholder="جستجوی مینی‌بوک..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full text-right"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>نتیجه‌ای یافت نشد.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((book) => {
              const img = imageSrc(book);
              return (
                <div
                  key={book.id}
                  className="bg-[#1C1C1C] border border-[#C9A227]/10 rounded-xl overflow-hidden group transition-all duration-300 hover:border-[#C9A227]/30 hover:shadow-[0_0_30px_-5px_rgba(212,168,67,0.15)]"
                >
                  <div className="aspect-[3/4] bg-gradient-to-br from-[#C9A227]/20 to-[#1C1C1C] flex items-center justify-center relative overflow-hidden">
                    {img ? (
                      <Image
                        src={img}
                        alt={book.title}
                        className="w-full h-full object-cover absolute inset-0"
                        fill
                        unoptimized
                      />
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center text-4xl select-none drop-shadow-lg">
                        📕
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    {book.categoryName && (
                      <span className="bg-[#C9A227]/20 text-[#C9A227] text-xs px-2 py-0.5 rounded">
                        {book.categoryName}
                      </span>
                    )}

                    <h3 className="text-gray-200 font-bold text-sm mt-2 leading-relaxed line-clamp-2">{book.title}</h3>

                    {book.summary && (
                      <p className="text-gray-500 text-xs mt-1.5 leading-relaxed line-clamp-2">{book.summary}</p>
                    )}

                    <div className="flex items-center gap-3 mt-3 text-gray-500 text-xs">
                      {book.pageCount > 0 && <span>{formatPageCount(book.pageCount)} صفحه</span>}
                      {book.pageCount > 0 && book.fileSize > 0 && <span className="text-[#C9A227]/60">•</span>}
                      {book.fileSize > 0 && <span>{formatFileSize(book.fileSize)}</span>}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#C9A227]/10">
                      <span className="text-gray-500 text-xs">
                        ▲ {book.pageCount > 0 ? formatPageCount(book.pageCount) : '۰'}
                      </span>
                      {book.mediaUrl ? (
                        <a
                          href={book.mediaUrl.startsWith('http') ? book.mediaUrl : `${API_BASE}${book.mediaUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gradient-to-l from-[#C9A227] to-[#FFA000] text-[#121212] text-xs font-bold px-4 py-1.5 rounded-lg transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_20px_-3px_#C9A227]"
                        >
                          دریافت مینی‌بوک
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs">به زودی</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-14 text-center border-t border-[#C9A227]/10 pt-6">
          <p className="text-gray-600 text-xs">مینی‌بوک‌های بیشتری در دست تهیه است · به زودی</p>
        </div>
      </div>
    </div>
  );
}
