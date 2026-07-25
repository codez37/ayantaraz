'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCsrf } from '@/hooks/useCsrf';

export default function ConsultationPage() {
  const [form, setForm] = useState({ requestType: 'tax', description: '', preferredTime: '' });
  const [isLoading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');
  const [submitted, setSubmitted] = useState(false);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const { csrfToken } = useCsrf();

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!form.description.trim()) {
      setMessage('لطفاً توضیحات را وارد کنید');
      setMessageType('error');
      return;
    }
    if (form.description.length < 10) {
      setMessage('توضیحات باید حداقل ۱۰ کاراکتر باشد');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await api.post('/consultation', form as unknown as Record<string, unknown>, {
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage(error.message || 'خطا در ثبت درخواست. دوباره تلاش کنید.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="card-dark p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-black text-gold-gradient mb-3">درخواست شما با موفقیت ثبت شد</h1>
          <p className="text-gray-400 mb-6">همکاران ما در اسرع وقت با شما تماس خواهند گرفت.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-gold !py-2 !px-6">
            پنل کاربری
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-2">درخواست مشاوره</h1>
      <p className="text-gray-400 mb-8">کارشناسان ما پس از ثبت درخواست با شما تماس می‌گیرند</p>

      <div className="card-dark p-6">
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-200 mb-1">موضوع مشاوره</label>
          <select
            value={form.requestType}
            onChange={(e) => setForm({ ...form, requestType: e.target.value })}
            className="input-dark"
          >
            <option value="tax">مشاوره مالیاتی</option>
            <option value="accounting">خدمات حسابداری</option>
            <option value="general">مشاوره عمومی</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-200 mb-1">توضیحات</label>
          <textarea
            placeholder="توضیح مختصری درباره درخواست خود بنویسید"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-dark min-h-[120px]"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-200 mb-1">زمان پیشنهادی برای تماس (اختیاری)</label>
          <input
            type="text"
            placeholder="مثال: شنبه‌ها صبح ۹ تا ۱۲"
            value={form.preferredTime}
            onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
            className="input-dark"
          />
        </div>

        <button onClick={handleSubmit} disabled={isLoading} className="btn-gold w-full text-center">
          {isLoading ? 'در حال ثبت...' : 'ثبت درخواست مشاوره'}
        </button>

        {message && (
          <p className={`mt-4 text-sm text-center ${messageType === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
