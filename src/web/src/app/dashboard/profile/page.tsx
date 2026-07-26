'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ProfilePage() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.patch('/users/profile', { firstName, lastName });
      setMessage('پروفایل با موفقیت به‌روز شد');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage(error.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-gray-500 hover:text-[#C9A227]">
          ← داشبورد
        </Link>
        <h1 className="text-2xl font-black text-gold-gradient">پروفایل</h1>
      </div>

      <div className="bg-[#1C1C1C] p-6 rounded-xl border border-[#C9A227]/10">
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-200 mb-1">شماره تلفن</label>
          <input value={user?.phone || ''} disabled className="input-dark !bg-[#121212] text-gray-500" />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-200 mb-1">نام</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-dark" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-200 mb-1">نام خانوادگی</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-dark" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-gold">
          {saving ? 'در حال ذخیره...' : 'ذخیره'}
        </button>
        {message && (
          <p className={`mt-4 text-sm ${message.includes('موفقیت') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
        )}
      </div>
    </div>
  );
}
