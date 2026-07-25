import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'خدمات حسابداری و مالیاتی | آیان تراز',
  description: 'خدمات حرفه‌ای حسابداری، مشاوره مالیاتی، تنظیم اظهارنامه، حسابداری پیمانکاری و صنعتی با تیم متخصص.',
  alternates: {
    canonical: 'https://ayantaraz.ir/services',
  },
  openGraph: {
    title: 'خدمات حسابداری و مالیاتی | آیان تراز',
    description: 'خدمات حرفه‌ای حسابداری، مشاوره مالیاتی، تنظیم اظهارنامه، حسابداری پیمانکاری و صنعتی با تیم متخصص.',
    url: 'https://ayantaraz.ir/services',
    siteName: 'آیان تراز',
    images: [
      {
        url: 'https://ayantaraz.ir/og-image-services.png',
        width: 1200,
        height: 630,
        alt: 'آیان تراز - خدمات حسابداری و مالیاتی',
      },
    ],
    locale: 'fa_IR',
    type: 'website',
  },
};

const services = [
  {
    title: 'خدمات حسابداری',
    desc: 'تنظیم و بررسی امور مالی، تهیه صورت‌های مالی، و پیگیری امور حسابداری کسب‌وکار شما.',
    for: 'مناسب برای: صاحبان مشاغل، شرکت‌های کوچک و متوسط',
  },
  {
    title: 'مشاوره مالیاتی',
    desc: 'مشاوره تخصصی در زمینه مالیات‌های مستقیم، ارزش افزوده، و بهینه‌سازی مالیاتی.',
    for: 'مناسب برای: مودیان مالیاتی، شرکت‌ها، فعالان اقتصادی',
  },
  {
    title: 'آموزش مالیاتی',
    desc: 'دوره‌ها و مقالات آموزشی در زمینه قوانین مالیاتی، حسابداری، و مدیریت مالی.',
    for: 'مناسب برای: دانشجویان، حسابداران، کارآفرینان',
  },
  {
    title: 'بررسی پرونده مالیاتی',
    desc: 'بررسی و تحلیل پرونده مالیاتی، ارائه راهکار برای کاهش ریسک مالیاتی.',
    for: 'مناسب برای: مودیان دارای پرونده مالیاتی فعال',
  },
  {
    title: 'مشاوره تلفنی',
    desc: 'مشاوره سریع تلفنی در زمینه مسائل مالیاتی و حسابداری بدون نیاز به مراجعه حضوری.',
    for: 'مناسب برای: کسب‌وکارهای نیازمند مشاوره فوری',
  },
  {
    title: 'دوره‌های آموزشی',
    desc: 'دوره‌های تخصصی حسابداری و مالیاتی با ارائه گواهینامه معتبر.',
    for: 'مناسب برای: علاقه‌مندان به یادگیری تخصصی',
  },
];

export default function ServicesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-2">خدمات ما</h1>
      <p className="text-gray-400 mb-10">ارائه خدمات حرفه‌ای حسابداری و مشاوره مالیاتی</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s) => (
          <div key={s.title} className="card-dark p-6">
            <h2 className="text-lg font-bold text-white mb-2">{s.title}</h2>
            <p className="text-gray-400 text-sm mb-3">{s.desc}</p>
            <p className="text-xs text-gray-500">{s.for}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A1A] border border-[#C9A227]/10 rounded-xl p-8 mt-12 text-center">
        <h2 className="text-2xl font-black text-gold-gradient mb-3">نیاز به مشاوره دارید؟</h2>
        <p className="text-gray-400 mb-6">کارشناسان ما آماده پاسخگویی به سوالات شما هستند</p>
        <Link href="/consultation" className="btn-gold inline-block">
          دریافت مشاوره
        </Link>
      </div>
    </div>
  );
}
