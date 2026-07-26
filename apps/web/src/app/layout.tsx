import { ReactNode } from 'react';
import { Vazirmatn } from 'next/font/google';
import './globals.css';
import ClientShell from './client-shell';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-vazirmatn',
  display: 'swap',
});

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        {/* Viewport Meta Tags - Mobile First */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0B0C0E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />

        {/* SEO & Social Meta Tags */}
        <meta
          name="description"
          content="آیانتاراز - پلتفرم حرفه‌ای مشاوره مالیاتی و حسابداری با تجربه کاربری لوکس و مدرن"
        />
        <meta name="keywords" content="مالیات, حسابداری, مشاوره مالیاتی, آیانتاراز, مالیات ایران, حسابداری حرفه‌ای" />
        <meta name="author" content="Ayan Taraz" />
        <meta property="og:title" content="آیانتاراز - مشاوره تخصصی مالیات و حسابداری" />
        <meta property="og:description" content="پلتفرم حرفه‌ای مشاوره مالیاتی و حسابداری با تجربه کاربری لوکس" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fa_IR" />

        <title>آیانتاراز | مشاوره تخصصی مالیات و حسابداری</title>

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

        {/* Fonts - Using local font loading to avoid Next.js warning */}
        <link
          href="https://fonts.googleapis.com/css2?family=IRANSansX:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Anjoman:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/logo-mobile.webp" />
      </head>
      <body
        className={`${vazirmatn.className} antialiased`}
        style={{
          backgroundColor: 'var(--color-background-primary)',
          color: 'var(--color-text-primary)',
        }}
      >
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
