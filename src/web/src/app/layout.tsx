'use client';

import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <html lang="fa" dir="rtl">
        <body className={inter.className}>
          <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="مؤسسه حسابداری و مشاوره امور مالیاتی آیان تراز - ارائه خدمات حرفه‌ای مالی و مالیاتی" />
        <meta name="keywords" content="حسابداری, مالیاتی, مشاوره مالی, آیان تراز" />
        <meta name="author" content="آیان تراز" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="آیان تراز - مؤسسه حسابداری و مشاوره امور مالیاتی" />
        <meta property="og:description" content="ارائه خدمات حرفه‌ای مالی و مالیاتی" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fa_IR" />
        <link rel="icon" href="/favicon.ico" />
        <title>آیان تراز | مؤسسه حسابداری و مشاوره امور مالیاتی</title>
      </head>
      <body className={inter.className}>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
