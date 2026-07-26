'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { setPageMeta, injectJsonLd } from '@/lib/seo';
import type { Course, CourseVideo } from '@/types';

const SITE_URL = 'https://ayantaraz.ir';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://api:3001';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const fa = (n: number) => n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  return `${fa(m)}:${fa(s).padStart(2, '۰')}`;
}

export default function CourseDetailPage() {
  const { slug } = useParams() as { slug: string };
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<CourseVideo | null>(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    api
      .get<Course>(`/courses/${slug}`)
      .then((d) => {
        setCourse(d);

        // Auto-select first sample video
        const firstSample = d.videos?.find((v) => v.isSample);
        if (firstSample) setSelectedVideo(firstSample);

        setPageMeta({
          title: d.title,
          description: d.description || `${d.title} - دوره آموزشی آیان تراز`,
          url: `${SITE_URL}/courses/${d.slug}`,
          type: 'course',
          publishedAt: d.publishedAt || undefined,
        });

        injectJsonLd({
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: d.title,
          description: d.description || d.title,
          url: `${SITE_URL}/courses/${d.slug}`,
          provider: {
            '@type': 'Organization',
            name: 'آیان تراز',
            url: SITE_URL,
          },
          offers: {
            '@type': 'Offer',
            price: d.price || 0,
            priceCurrency: 'IRR',
            availability: 'https://schema.org/InStock',
          },
          inLanguage: 'fa',
        });

        injectJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'صفحه اصلی', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'دوره‌ها', item: `${SITE_URL}/courses` },
            { '@type': 'ListItem', position: 3, name: d.title },
          ],
        });
      })
      .catch(() => {});
  }, [slug]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!course) return;
    setLoading(true);
    try {
      await api.post('/orders', { itemType: 'course', itemId: course.id });
      alert('درخواست خرید ثبت شد. لایسنس دوره ظرف ۱ تا ۷ ساعت کاری برای شما ارسال خواهد شد.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      alert(error.message || 'خطا در ثبت درخواست');
    } finally {
      setLoading(false);
    }
  };

  if (!course) return <div className="text-center py-16 text-gray-400">در حال بارگذاری...</div>;

  const sampleVideos = course.videos?.filter((v) => v.isSample) || [];
  const hasSamples = sampleVideos.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-4">{course.title}</h1>
      <p className="text-gray-400 mb-6">{course.description}</p>
      <p className="text-2xl font-bold text-[#C9A227] mb-6">{course.price.toLocaleString()} ریال</p>

      {/* Video Player */}
      {selectedVideo && (
        <div className="mb-8">
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            <video
              src={selectedVideo.url?.startsWith('http') ? selectedVideo.url : `${API_BASE}${selectedVideo.url}`}
              controls
              autoPlay
              className="w-full h-full"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">پیش‌نمایش دوره — {selectedVideo.title}</p>
        </div>
      )}

      {/* Video List */}
      {hasSamples && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">پیش‌نمایش دوره</h2>
          {sampleVideos.map((video) => (
            <button
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              className={`w-full flex items-center gap-4 p-3 border rounded-lg mb-2 transition text-right ${
                selectedVideo?.id === video.id
                  ? 'border-[#C9A227] bg-[#C9A227]/10'
                  : 'border-[#C9A227]/10 bg-[#1A1A1A] hover:bg-[#1C1C1C]'
              }`}
            >
              <svg className="w-5 h-5 text-[#C9A227] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="text-gray-200 flex-1 text-sm">{video.title}</span>
              {video.duration > 0 && <span className="text-gray-500 text-xs">{formatDuration(video.duration)}</span>}
              <span className="bg-[#C9A227]/20 text-[#C9A227] text-xs px-2 py-1 rounded">نمونه</span>
            </button>
          ))}
        </div>
      )}

      {/* Course Info Box */}
      <div className="bg-[#1C1C1C] border border-[#C9A227]/10 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-3">اطلاعات دوره</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#C9A227]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            پس از خرید، لایسنس دوره ظرف ۱ تا ۷ ساعت کاری ارسال می‌شود
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#C9A227]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            دسترسی به پلتفرم آموزشی با لایسنس اختصاصی
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#C9A227]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            پشتیبانی تلفنی و آنلاین
          </li>
        </ul>
      </div>

      {/* Purchase Button */}
      {!course.isEnrolled && (
        <button onClick={handlePurchase} disabled={isLoading} className="btn-gold w-full text-center">
          {isLoading ? 'در حال ثبت...' : 'درخواست خرید دوره'}
        </button>
      )}
      {course.isEnrolled && <p className="text-green-400 text-center">شما در این دوره ثبت‌نام کرده‌اید</p>}
    </div>
  );
}
