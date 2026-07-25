'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Order, ConsultationRequest } from '@/types';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      try {
        const r = await api.get<{ data: Order[] }>('/orders');
        setOrders(r.data);
      } catch {}
      try {
        const c = await api.get<ConsultationRequest[]>('/consultation');
        setConsultations(c);
      } catch {}
    };
    load();
  }, [user]);

  const updateProfile = async () => {
    await api.patch('/users/profile', { firstName, lastName });
    alert('پروفایل به‌روز شد');
  };

  if (authLoading) return <div className="text-center py-16 text-gray-400">در حال بارگذاری...</div>;
  if (!user) return <div className="text-center py-16 text-gray-400">لطفاً وارد شوید</div>;

  const statusMap: Record<string, string> = {
    pending: 'در انتظار',
    waiting_for_call: 'منتظر تماس',
    waiting_for_payment: 'منتظر پرداخت',
    confirmed: 'تایید شده',
    rejected: 'رد شده',
    canceled: 'لغو شده',
    contacted: 'تماس گرفته شده',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-8">پنل کاربری</h1>

      <div className="card-dark p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">پروفایل</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <input
            placeholder="نام"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input-dark"
          />
          <input
            placeholder="نام خانوادگی"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input-dark"
          />
        </div>
        <p className="text-gray-500 mt-2">شماره تلفن: {user.phone}</p>
        <button onClick={updateProfile} className="btn-gold mt-4">
          ذخیره
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-[#1C1C1C] p-6 rounded-xl border border-[#C9A227]/10">
          <h2 className="text-xl font-bold text-white mb-4">سفارش‌ها</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500">سفارشی ثبت نشده</p>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex justify-between items-center py-2 border-b border-[#C9A227]/10 last:border-0"
              >
                <span className="text-gray-200">{order.itemType === 'course' ? 'دوره' : 'مشاوره'}</span>
                <span className={order.status === 'confirmed' ? 'text-green-400' : 'text-[#C9A227]'}>
                  {statusMap[order.status] || order.status}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="bg-[#1C1C1C] p-6 rounded-xl border border-[#C9A227]/10">
          <h2 className="text-xl font-bold text-white mb-4">درخواست‌های مشاوره</h2>
          {consultations.length === 0 ? (
            <p className="text-gray-500">درخواستی ثبت نشده</p>
          ) : (
            consultations.map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center py-2 border-b border-[#C9A227]/10 last:border-0"
              >
                <span className="text-gray-200">
                  {c.requestType === 'tax' ? 'مالیاتی' : c.requestType === 'accounting' ? 'حسابداری' : 'عمومی'}
                </span>
                <span
                  className={
                    c.status === 'completed'
                      ? 'text-green-400'
                      : c.status === 'canceled'
                        ? 'text-red-400'
                        : 'text-[#C9A227]'
                  }
                >
                  {statusMap[c.status] || c.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
