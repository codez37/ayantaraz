'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ============================================
// HeroSlider Component - Mobile-First Refactor
// ============================================

const slides = [
  {
    title: 'خدمات حسابداری حرفه‌ای',
    subtitle: 'مدیریت مالی کسب‌وکار خود را به ما بسپارید',
    cta: 'دریافت مشاوره',
    href: '/consultation',
    gradient: 'from-[#0B0B0C] to-[#121212]',
  },
  {
    title: 'مشاوره مالیاتی تخصصی',
    subtitle: 'بهترین راهکارهای مالیاتی برای کاهش هزینه‌ها',
    cta: 'دستیار هوشمند',
    href: '/tax-consultant',
    gradient: 'from-[#121212] to-[#0B0B0C]',
  },
  {
    title: 'آموزش مالی آنلاین',
    subtitle: 'دوره‌های تخصصی حسابداری و مالیات با مدرک معتبر',
    cta: 'مشاهده دوره‌ها',
    href: '/courses',
    gradient: 'from-[#0B0B0C] to-[#121212]',
  },
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // ==========================================
  // AUTO-PLAY
  // ==========================================
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  // Auto-play every 10 seconds
  useEffect(() => {
    const timer = setInterval(nextSlide, 10000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  // ==========================================
  // TOUCH GESTURES (Mobile)
  // ==========================================
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;

    const diff = touchStart - touchEnd;

    if (diff > 5) {
      // Swipe left - next slide
      nextSlide();
    } else if (diff < -5) {
      // Swipe right - previous slide
      prevSlide();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // ==========================================
  // KEYBOARD NAVIGATION
  // ==========================================
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        nextSlide();
      } else if (e.key === 'ArrowRight') {
        prevSlide();
      }
    },
    [nextSlide, prevSlide],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <section
      className={`
        relative 
        h-[60vh] min-h-[400px] md:h-[70vh] md:min-h-[500px]
        bg-gradient-to-br ${slides[currentSlide].gradient}
        overflow-hidden
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="اسلایدر اصلی"
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNCOTVBOUIiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')",
        }}
      />

      {/* Slide Content */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`
            absolute inset-0 
            flex items-center justify-center 
            px-4 md:px-8
            transition-all duration-700 ease-in-out
            ${i === currentSlide ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
          `}
          aria-hidden={i !== currentSlide}
        >
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 text-white leading-tight">
              {slide.title}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 leading-relaxed max-w-xl mx-auto">
              {slide.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={slide.href}
                className="
                  bg-[#C9A227] text-[#0B0B0C]
                  hover:bg-[#A0781E] active:bg-[#FFA000]
                  px-8 py-3 text-base md:text-lg font-bold
                  rounded-md
                  shadow-[0_4px_14px_0_rgba(201,162,39,0.39)]
                  hover:shadow-[0_6px_20px_0_rgba(201,162,39,0.45)]
                  transition-all duration-250 ease-in-out
                  hover:-translate-y-px active:translate-y-0
                  min-h-[48px]
                "
              >
                {slide.cta}
              </Link>
              <Link
                href="/about"
                className="
                  bg-transparent text-[#C9A227] border border-[#C9A227]
                  hover:bg-[rgba(201,162,39,0.1)]
                  px-8 py-3 text-base md:text-lg font-bold
                  rounded-md
                  transition-all duration-250 ease-in-out
                  min-h-[48px]
                "
              >
                بیشتر بدانید
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Pagination Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`slider-dot ${i === currentSlide ? 'active' : ''}`}
            aria-label={`اسلاید ${i + 1}`}
            aria-current={i === currentSlide}
          />
        ))}
      </div>

      {/* Navigation Arrows - Desktop */}
      <button
        onClick={nextSlide}
        className="
          absolute left-4 top-1/2 -translate-y-1/2 
          text-white/50 hover:text-[#C9A227]
          transition-colors duration-200
          z-10 p-2 rounded-full hover:bg-[#C9A227]/10
          hidden sm:block
        "
        aria-label="اسلاید بعدی"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button
        onClick={prevSlide}
        className="
          absolute right-4 top-1/2 -translate-y-1/2 
          text-white/50 hover:text-[#C9A227]
          transition-colors duration-200
          z-10 p-2 rounded-full hover:bg-[#C9A227]/10
          hidden sm:block
        "
        aria-label="اسلاید قبلی"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Mobile Swipe Indicator */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 sm:hidden">
        <p className="text-xs text-gray-500 animate-pulse">برای تغییر اسلاید به چپ یا راست بکشید</p>
      </div>
    </section>
  );
}
