'use client';

import { useState } from 'react';
import Link from 'next/link';
import HeroSlider from '@/components/home/HeroSlider';
import { useGlassmorphicTheme } from '@/providers/GlassmorphicThemeProvider';

const stats = [
  { label: 'مسیر مشاوره بدون پرداخت آنلاین', value: '۱۰۰٪ انسانی' },
  { label: 'محتوای آموزشی و مینی‌بوک', value: 'رایگان/کنترل‌شده' },
  { label: 'پرسش و پاسخ هوشمند', value: 'فعال' },
];

const quickActions = [
  { href: '/consultation', title: 'ثبت وقت مشاوره', desc: 'بدون درگاه پرداخت؛ ثبت درخواست و تماس کارشناس', icon: '📅' },
  { href: '/minibooks', title: 'دانلود مینی‌بوک', desc: 'دریافت فایل‌های آموزشی حسابداری و مالیات', icon: '📚' },
  { href: '/tax-consultant', title: 'دستیار هوشمند', desc: 'پرسش و پاسخ تخصصی مالیاتی و حسابداری', icon: '🤖' },
  { href: '/auth', title: 'ورود / ثبت‌نام', desc: 'ورود امن با کد یکبارمصرف پیامکی', icon: '🔐' },
];

const services = [
  {
    title: 'مشاوره مالیاتی',
    desc: 'مشاوره تخصصی در زمینه مالیات بر ارزش افزوده، مالیات بر درآمد و مالیات‌های مستقیم',
    icon: '⚖️',
  },
  { title: 'حسابداری حرفه‌ای', desc: 'خدمات حسابداری کامل از ثبت اسناد تا تهیه گزارشات مالی و مالیاتی', icon: '📊' },
  { title: 'تنظیم اظهارنامه', desc: 'تهیه و ارسال اظهارنامه‌های مالیاتی با دقت و سرعت بالا', icon: '📝' },
  { title: 'آموزش تخصصی', desc: 'دوره‌ها و کارگاه‌های آموزشی در زمینه مالیات و حسابداری', icon: '🎓' },
];

// ============================================
// Tax Calculator Teaser Component
// ============================================

function TaxCalculatorTeaser() {
  const [amount, setAmount] = useState(50000000);
  const [taxRate, setTaxRate] = useState(15);

  // Simple tax calculation for demonstration
  const calculatedTax = Math.round((amount * taxRate) / 100);
  const netAmount = amount - calculatedTax;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('fa-IR') + ' تومان';
  };

  return (
    <div className="glass-gold rounded-2xl p-6 animate-reveal-up stagger-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">💰</div>
        <div>
          <h3 className="text-lg font-bold text-white">محاسبه سریع مالیات</h3>
          <p className="text-sm text-text-secondary">مبلغ تخمینی مالیات خود را محاسبه کنید</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-text-secondary mb-1">مبلغ معامله</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="w-full bg-background-tertiary border border-border-gold/30 rounded-xl p-3 text-white text-left dir='ltr' focus:outline-none focus:border-gold-400 transition-all"
            placeholder="مبلغ به تومان"
          />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">نرخ مالیات (%)</label>
          <input
            type="range"
            min="5"
            max="35"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="w-full h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer accent-gold-400"
          />
          <div className="flex justify-between text-xs text-text-secondary mt-1">
            <span>۵%</span>
            <span className="font-bold text-gold-400">{taxRate}%</span>
            <span>۳۵%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-background-secondary/50 rounded-xl p-3 text-center">
            <div className="text-xs text-text-secondary">مالیات تخمینی</div>
            <div className="text-lg font-bold text-gold-400">{formatCurrency(calculatedTax)}</div>
          </div>
          <div className="bg-background-secondary/50 rounded-xl p-3 text-center">
            <div className="text-xs text-text-secondary">خالص دریافتنی</div>
            <div className="text-lg font-bold text-white">{formatCurrency(netAmount)}</div>
          </div>
        </div>

        <Link
          href="/consultation"
          className="block w-full text-center bg-gradient-to-l from-gold-400 to-gold-500 text-background-primary py-3 rounded-xl font-bold hover:shadow-gold-md transition-all"
        >
          مشاوره دقیق‌تر
        </Link>
      </div>
    </div>
  );
}

// ============================================
// HomePage - Luxury Mobile-First Refactor
// ============================================

export default function HomePage() {
  const { theme } = useGlassmorphicTheme();

  // Theme-based styling
  const isDark = theme === 'dark';

  return (
    <div className="bg-background-primary text-text-primary">
      {/* Hero Section with Slider */}
      <HeroSlider />

      {/* Stats Section */}
      <section className="relative overflow-hidden border-b border-border-gold/20">
        <div className="absolute inset-0 luxury-aurora bg-gradient-to-br from-background-primary via-background-secondary to-background-primary opacity-50" />
        <div className="relative container-mobile py-12 md:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Main Content */}
            <div className="reveal-up text-center lg:text-right">
              <span className="inline-flex rounded-full border border-border-gold/40 bg-gold-900/10 px-4 py-2 text-xs font-bold text-gold-400 animate-fade-in">
                آیان تراز؛ مشاوره، آموزش و عملیات مالیاتی
              </span>
              <h1 className="gold-sheen mt-6 text-3xl sm:text-4xl md:text-5xl font-black leading-tight lg:text-6xl">
                مسیر حرفه‌ای مالیات و حسابداری
                <span className="block md:inline">، آماده برای موبایل و دیپلوی پایدار</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-text-secondary lg:mx-0">
                ثبت درخواست مشاوره بدون درگاه پرداخت، دانلود مینی‌بوک، محتوای آموزشی و چت‌بات پرسش و پاسخ در یک تجربه
                مشکی ـ طلایی مدرن و فارسی.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/consultation" className="btn-gold">
                  شروع ثبت وقت مشاوره
                </Link>
                <Link href="/minibooks" className="btn-outline-gold">
                  دانلود مینی‌بوک‌ها
                </Link>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="glass-gold reveal-up stagger-1 rounded-2xl md:rounded-3xl p-4 md:p-5">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {stats.map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border-gold/20 bg-background-secondary/50 p-4 md:p-5 transition-all duration-300 hover:border-border-gold/40 animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <p className="text-xl md:text-2xl font-black text-gold-400">{item.value}</p>
                    <p className="mt-2 text-sm text-text-secondary">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tax Calculator Section */}
      <section className="container-mobile py-10 md:py-12">
        <TaxCalculatorTeaser />
      </section>

      {/* Services Section */}
      <section className="container-mobile py-10 md:py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">خدمات تخصصی ما</h2>
            <p className="mt-2 text-sm text-text-secondary">راهکارهای حرفه‌ای برای کسب‌وکار شما</p>
          </div>
          <Link
            href="/services"
            className="hidden text-sm font-bold text-gold-400 hover:text-gold-300 transition-colors sm:block"
          >
            مشاهده همه خدمات
          </Link>
        </div>

        {/* Services Grid - Mobile First */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="glass-card p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-border-gold/40 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl mb-3">{service.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{service.desc}</p>
              <Link
                href="/consultation"
                className="inline-flex items-center gap-1 mt-4 text-gold-400 hover:text-gold-300 text-sm font-medium transition-colors"
              >
                بیشتر بدانید
                <span>→</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="container-mobile py-10 md:py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">دسترسی سریع عملیاتی</h2>
            <p className="mt-2 text-sm text-text-secondary">تمام مسیرهای اصلی محصول از صفحه اول قابل دسترس هستند.</p>
          </div>
          <Link
            href="/services"
            className="hidden text-sm font-bold text-gold-400 hover:text-gold-300 transition-colors sm:block"
          >
            مشاهده خدمات
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass-gold group rounded-xl md:rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-border-gold/40 min-h-[180px] flex flex-col animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="text-lg font-black text-white group-hover:text-gold-400 transition-colors">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-text-secondary flex-1">{item.desc}</p>
              <span className="mt-4 inline-block text-gold-400 text-xl transform group-hover:translate-x-1 transition-transform duration-200">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container-mobile pb-16 md:pb-20">
        <div className="rounded-2xl bg-gradient-to-r from-gold-900/10 to-gold-700/10 border border-border-gold/30 p-8 md:p-12 text-center animate-reveal-up">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">آماده شروع هستید؟</h2>
          <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
            با تیم متخصص آیان تراز در ارتباط باشید و از خدمات حرفه‌ای ما بهره‌مند شوید.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/consultation" className="btn-gold">
              دریافت مشاوره
            </Link>
            <Link href="/contact" className="btn-outline-gold">
              تماس با ما
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
