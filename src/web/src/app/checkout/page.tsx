'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface OrderResult {
  id: number;
}

export default function CheckoutPage() {
  const [step, setStep] = useState<'info' | 'payment' | 'done'>('info');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    itemType: 'course',
    itemId: '',
    amount: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post<OrderResult>('/orders', {
        itemType: form.itemType,
        itemId: parseInt(form.itemId),
        phone: form.phone,
        firstName: form.firstName,
        lastName: form.lastName,
        amount: parseInt(form.amount) * 10,
      });

      setResult(res);
      setStep('payment');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'خطا در ثبت سفارش');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!result?.id) return;
    setLoading(true);
    setError('');
    try {
      const ref = (document.getElementById('paymentRef') as HTMLInputElement)?.value;
      if (!ref) {
        setError('شماره پیگیری را وارد کنید');
        setLoading(false);
        return;
      }

      await api.patch(`/orders/${result.id}/status`, {
        status: 'confirmed',
        paymentRef: ref,
        adminNote: 'پرداخت توسط کاربر',
      });
      setStep('done');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'خطا در تأیید پرداخت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container-mobile max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gold-gradient">تکمیل سفارش</h1>
          <p className="text-gray-500 text-sm mt-2">پرداخت به صورت دستی (واریز به حساب)</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {['اطلاعات', 'پرداخت', 'تأیید'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === ['info', 'payment', 'done'][i] ? 'bg-[#C9A227] text-[#121212]' : 'bg-[#121212] text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span className="text-sm text-gray-400">{label}</span>
              {i < 2 && <div className="w-8 h-0.5 bg-[#121212]" />}
            </div>
          ))}
        </div>

        {step === 'info' && (
          <div className="card-dark p-6 space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">نوع سفارش</label>
              <select
                value={form.itemType}
                onChange={(e) => setForm((f) => ({ ...f, itemType: e.target.value }))}
                className="input-dark"
              >
                <option value="course">دوره آموزشی</option>
                <option value="consultation">مشاوره مالیاتی</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">شناسه دوره / مشاوره</label>
              <input
                value={form.itemId}
                onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))}
                className="input-dark"
                placeholder="شناسه را وارد کنید"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">نام</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="input-dark"
                  placeholder="نام"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">نام خانوادگی</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="input-dark"
                  placeholder="نام خانوادگی"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">شماره تلفن</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="input-dark"
                placeholder="09123456789"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">مبلغ (تومان)</label>
              <input
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="input-dark"
                placeholder="مبلغ به تومان"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleSubmit} disabled={loading} className="btn-gold w-full text-center">
              {loading ? 'در حال ثبت...' : 'ثبت سفارش'}
            </button>
          </div>
        )}

        {step === 'payment' && result && (
          <div className="card-dark p-6 space-y-4 text-center">
            <div className="text-5xl mb-4">🏦</div>
            <h3 className="text-xl font-bold text-white">پرداخت دستی</h3>
            <p className="text-gray-400 text-sm">
              مبلغ {form.amount.toLocaleString()} تومان را به شماره حساب زیر واریز کنید
            </p>
            <div className="bg-[#121212] p-4 rounded-xl space-y-2">
              <p className="text-[#C9A227] font-bold">شماره حساب: ۵۸۵۹-۸۷۶۵-۳۲۱۰-۶۰۳۷</p>
              <p className="text-gray-500 text-sm">به نام: آیان تراز</p>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">شماره پیگیری واریز</label>
              <input id="paymentRef" className="input-dark" placeholder="شماره پیگیری را وارد کنید" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={confirmPayment} disabled={loading} className="btn-gold w-full">
              {loading ? 'در حال بررسی...' : 'تأیید و تکمیل سفارش'}
            </button>
            <p className="text-xs text-gray-600">پس از تأیید مدیر، دسترسی شما فعال خواهد شد</p>
          </div>
        )}

        {step === 'done' && (
          <div className="card-dark p-8 text-center space-y-4">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-black text-gold-gradient">سفارش ثبت شد!</h2>
            <p className="text-gray-400">سفارش شما با موفقیت ثبت شد. پس از تأیید مدیر، دسترسی شما فعال خواهد شد.</p>
            <p className="text-sm text-gray-500">شماره سفارش: {result?.id}</p>
            <Link href="/dashboard" className="btn-gold inline-block mt-4">
              پیگیری سفارش
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
