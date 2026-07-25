'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Course } from '@/types';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', price: 0, description: '' });

  const loadCourses = () => {
    setLoading(true);
    api.get<Course[]>('/courses')
      .then(d => setCourses(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous setState
    const frame = requestAnimationFrame(() => {
      loadCourses();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSubmit = async () => {
    try {
      await api.post('/courses', form);
      setShowForm(false);
      setForm({ title: '', slug: '', price: 0, description: '' });
      loadCourses();
    } catch {
      alert('خطا در ثبت دوره');
    }
  };

  if (loading && !showForm) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-black text-white">مدیریت دوره‌ها</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold !py-2 !px-4 text-sm">
          {showForm ? 'انصراف' : '➕ دوره جدید'}
        </button>
      </div>

      {showForm && (
        <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="عنوان دوره" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="input-dark text-sm" />
            <input placeholder="اسلاگ (slug)" value={form.slug} onChange={e => setForm(f => ({...f, slug: e.target.value}))} className="input-dark text-sm" dir="ltr" />
          </div>
          <input type="number" placeholder="قیمت (ریال)" value={form.price || ''} onChange={e => setForm(f => ({...f, price: parseInt(e.target.value) || 0}))} className="input-dark text-sm" />
          <textarea placeholder="توضیحات" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="input-dark text-sm" rows={3} />
          <button onClick={handleSubmit} className="btn-gold w-full text-sm">ثبت دوره</button>
        </div>
      )}

      <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C9A227]/10 text-right">
                <th className="p-3 text-gray-400 font-bold">عنوان</th>
                <th className="p-3 text-gray-400 font-bold">قیمت</th>
                <th className="p-3 text-gray-400 font-bold">وضعیت</th>
                <th className="p-3 text-gray-400 font-bold">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c: Course) => (
                <tr key={c.id} className="border-b border-[#C9A227]/5 hover:bg-[#C9A227]/5">
                  <td className="p-3 text-gray-300">{c.title}</td>
                  <td className="p-3 text-[#C9A227]">{c.price?.toLocaleString()} ریال</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      c.status === 'published' ? 'bg-green-900/50 text-green-400' :
                      c.status === 'draft' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>{c.status === 'published' ? 'منتشر شده' : c.status === 'draft' ? 'پیش‌نویس' : c.status}</span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs">{c.publishedAt ? new Date(c.publishedAt).toLocaleDateString('fa-IR') : '-'}</td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">دوره‌ای یافت نشد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
