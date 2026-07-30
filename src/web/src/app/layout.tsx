import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientShell from './client-shell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'آیان تراز | مؤسسه حسابداری و مشاوره امور مالیاتی',
  description: 'ارائه خدمات حرفه‌ای مالی و مالیاتی',
  keywords: 'حسابداری, مالیاتی, مشاوره مالی, آیان تراز',
  authors: [{ name: 'آیان تراز' }],
  robots: 'index, follow',
  openGraph: {
    title: 'آیان تراز - مؤسسه حسابداری و مشاوره امور مالیاتی',
    description: 'ارائه خدمات حرفه‌ای مالی و مالیاتی',
    type: 'website',
    locale: 'fa_IR',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${inter.className} min-h-screen`}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
