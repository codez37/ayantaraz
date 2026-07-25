'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Course } from '@/types';

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .get<Course[]>('/courses/my')
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-gray-500 hover:text-[#C9A227]">
          ← داشبورد
        </Link>
        <h1 className="text-2xl font-black text-gold-gradient">دوره‌های من</h1>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-[#1C1C1C] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-[#1C1C1C] rounded-xl border border-[#C9A227]/10">
          <p>در هیچ دوره‌ای ثبت‌نام نکرده‌اید.</p>
          <Link href="/courses" className="text-[#C9A227] hover:text-[#FFB71A] mt-2 inline-block">
            مشاهده دوره‌ها
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.slug}`} className="card-dark p-6">
              <h2 className="font-bold text-white mb-2">{course.title}</h2>
              <p className="text-sm text-gray-400">{course.description}</p>
              <p className="text-xs text-green-400 mt-3">✓ دسترسی فعال</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
