'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Content } from '@/types';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Content[]>([]);

  useEffect(() => {
    api
      .get<{ data: Content[] }>('/content', { type: 'article', status: 'published' })
      .then((res) => setArticles(res.data))
      .catch(() => setArticles([]));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-8">مقالات آموزشی</h1>
      <div className="grid gap-6">
        {articles.map((article) => (
          <Link key={article.id} href={`/articles/${article.slug}`} className="block card-dark p-6">
            <h2 className="text-xl font-bold text-white mb-2">{article.title}</h2>
            <p className="text-gray-400">{article.summary}</p>
            <p className="text-sm text-gray-500 mt-2">{new Date(article.publishedAt!).toLocaleDateString('fa-IR')}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
