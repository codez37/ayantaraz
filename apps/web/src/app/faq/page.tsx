import { Metadata } from 'next';

const faqs = [
  {
    q: 'خدمات حسابداری شما شامل چه مواردی می‌شود؟',
    a: 'تنظیم صورت‌های مالی، پیگیری امور مالیاتی، مشاوره حسابداری، و بررسی اسناد مالی.',
  },
  {
    q: 'چگونه می‌توانم درخواست مشاوره مالیاتی بدهم؟',
    a: 'از طریق صفحه مشاوره، فرم درخواست را پر کنید. کارشناسان ما با شما تماس خواهند گرفت.',
  },
  {
    q: 'آیا مشاوره شما حضوری است یا تلفنی؟',
    a: 'هر دو حالت ممکن است. بسته به نوع درخواست، مشاوره می‌تواند تلفنی یا حضوری باشد.',
  },
  {
    q: 'دوره‌های آموزشی چگونه ارائه می‌شوند؟',
    a: 'دوره‌ها به صورت آنلاین با ویدیوهای ضبط شده ارائه می‌شوند. نمونه ویدیوها رایگان قابل مشاهده است.',
  },
  {
    q: 'هزینه خدمات چگونه پرداخت می‌شود؟',
    a: 'پس از ثبت درخواست، همکاران ما با شما تماس می‌گیرند و روش پرداخت را هماهنگ می‌کنند.',
  },
  {
    q: 'آیا چت‌بات شما مشاوره مالیاتی تخصصی می‌دهد؟',
    a: 'چت‌بات پاسخ‌های عمومی بر اساس دانشنامه تاییدشده ارائه می‌دهد. برای مسائل تخصصی با کارشناسان صحبت کنید.',
  },
];

export const metadata: Metadata = {
  title: 'سوالات متداول | آیان تراز',
  description:
    'پاسخ به سوالات متداول درباره خدمات حسابداری، مشاوره مالیاتی، دوره‌های آموزشی و چت‌بات هوشمند آیان تراز.',
  alternates: {
    canonical: 'https://ayantaraz.ir/faq',
  },
  openGraph: {
    title: 'سوالات متداول | آیان تراز',
    description:
      'پاسخ به سوالات متداول درباره خدمات حسابداری، مشاوره مالیاتی، دوره‌های آموزشی و چت‌بات هوشمند آیان تراز.',
    url: 'https://ayantaraz.ir/faq',
    siteName: 'آیان تراز',
    images: [
      {
        url: 'https://ayantaraz.ir/og-image-faq.png',
        width: 1200,
        height: 630,
        alt: 'آیان تراز - سوالات متداول',
      },
    ],
    locale: 'fa_IR',
    type: 'website',
  },
};

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-8">سوالات متداول</h1>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <details key={i} className="border border-[#C9A227]/10 rounded-xl overflow-hidden bg-[#1A1A1A]">
            <summary className="w-full text-start p-4 bg-[#1C1C1C] hover:bg-[#1A1A1A] flex justify-between items-center font-bold text-white cursor-pointer">
              <span>{faq.q}</span>
              <span className="transition-transform text-[#C9A227] details-open:rotate-180">▼</span>
            </summary>
            <div className="px-4 pb-4 text-gray-400">{faq.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
