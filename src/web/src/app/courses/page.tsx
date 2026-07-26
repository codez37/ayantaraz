'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { injectJsonLd } from '@/lib/seo';
import type { Course } from '@/types';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    api
      .get<Course[]>('/courses')
      .then(setCourses)
      .catch(() => {});
  }, []);

  useEffect(() => {
    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'ثبت‌نام و گذراندن دوره آموزشی آیان تراز',
      description: 'مراحل شرکت در دوره‌های آموزشی حسابداری و مالیات آیان تراز',
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'ثبت‌نام در دوره',
          text: 'دوره مورد نظر خود را انتخاب کرده و ثبت‌نام کنید.',
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'مشاهده ویدیوهای آموزشی',
          text: 'به ویدیوهای ضبط شده دوره دسترسی پیدا کرده و گام‌به‌گام آموزش ببینید.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'انجام تمرین‌ها',
          text: 'تمرین‌های هر جلسه را انجام دهید تا مفاهیم را تثبیت کنید.',
        },
        {
          '@type': 'HowToStep',
          position: 4,
          name: 'دریافت گواهینامه',
          text: 'پس از اتمام دوره، گواهینامه معتبر دریافت کنید.',
        },
      ],
    });

    injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'صفحه اصلی', item: 'https://ayantaraz.ir' },
        { '@type': 'ListItem', position: 2, name: 'دوره‌های آموزشی', item: 'https://ayantaraz.ir/courses' },
      ],
    });
  }, []);

  useEffect(() => {
    if (courses.length === 0) return;
    courses.forEach((course) => {
      injectJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: course.title,
        description: course.description,
        provider: {
          '@type': 'Organization',
          name: 'آیان تراز',
          sameAs: 'https://ayantaraz.ir',
        },
        url: `https://ayantaraz.ir/courses/${course.slug}`,
      });
    });
  }, [courses]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-8">دوره‌های آموزشی</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <Link key={course.id} href={`/courses/${course.slug}`} className="card-dark p-6">
            <h2 className="text-xl font-bold text-white mb-2">{course.title}</h2>
            <p className="text-gray-400 mb-4">{course.description}</p>
            <p className="text-[#C9A227] font-bold">{course.price.toLocaleString()} ریال</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
