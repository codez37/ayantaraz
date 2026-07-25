import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'تماس با ما | آیان تراز',
  description: 'راه‌های ارتباطی با تیم آیان تراز. تلفن، ایمیل، اینستاگرام و تلگرام. منتظر تماس شما هستیم.',
  alternates: {
    canonical: 'https://ayantaraz.ir/contact',
  },
  openGraph: {
    title: 'تماس با ما | آیان تراز',
    description: 'راه‌های ارتباطی با تیم آیان تراز. تلفن، ایمیل، اینستاگرام و تلگرام.',
    url: 'https://ayantaraz.ir/contact',
    siteName: 'آیان تراز',
    images: [
      {
        url: 'https://ayantaraz.ir/og-image-contact.png',
        width: 1200,
        height: 630,
        alt: 'آیان تراز - تماس با ما',
      },
    ],
    locale: 'fa_IR',
    type: 'website',
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-8">تماس با ما</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="card-dark p-6">
          <h2 className="text-lg font-bold text-white mb-4">اطلاعات تماس</h2>
          <div className="space-y-3 text-gray-400">
            <p>تلفن: ۰۹۱۳۴۲۹۲۳۲۹</p>
            <p>تلفن: ۰۹۹۱۸۵۶۳۷۲۵</p>
            <p>ایمیل: samanbabaeiii20@gmail.com</p>
            <p>اینستاگرام: @samtaxco</p>
            <p>تلگرام: @samtax</p>
            <p>ساعات پاسخگویی: شنبه تا چهارشنبه ۹ تا ۱۷</p>
          </div>
        </div>
        <div className="card-dark p-6">
          <h2 className="text-lg font-bold text-white mb-4">پیگیری درخواست</h2>
          <p className="text-gray-400 mb-4">برای پیگیری وضعیت درخواست مشاوره یا سفارش خود، وارد پنل کاربری شوید.</p>
          <Link href="/auth" className="btn-gold !py-2 !px-6 inline-block">
            ورود به پنل
          </Link>
        </div>
      </div>
    </div>
  );
}
