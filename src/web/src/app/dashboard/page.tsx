'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Order, ConsultationRequest } from '@/types';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'در انتظار', color: 'text-[#C9A227] bg-[#C9A227]/10' },
  waiting_for_call: { label: 'منتظر تماس', color: 'text-[#C9A227] bg-[#C9A227]/10' },
  waiting_for_payment: { label: 'منتظر پرداخت', color: 'text-orange-400 bg-orange-900/20' },
  confirmed: { label: 'تایید شده', color: 'text-green-400 bg-green-900/20' },
  rejected: { label: 'رد شده', color: 'text-red-400 bg-red-900/20' },
  canceled: { label: 'لغو شده', color: 'text-gray-500 bg-gray-800/30' },
  contacted: { label: 'تماس گرفته شده', color: 'text-blue-400 bg-blue-900/20' },
  completed: { label: 'انجام شده', color: 'text-green-400 bg-green-900/20' },
};

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [consultLoading, setConsultLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    api
      .get<Order[]>('/orders')
      .then(setOrders)
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
    api
      .get<ConsultationRequest[]>('/consultation')
      .then(setConsultations)
      .catch(() => {})
      .finally(() => setConsultLoading(false));
  }, []);

  if (authLoading)
    return (
      <div className="text-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-[#C9A227] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-gold-gradient mb-8">داشبورد</h1>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Link href="/dashboard/orders" className="card-dark p-4">
          <div className="text-2xl font-bold text-[#C9A227]">{orders.length}</div>
          <div className="text-sm text-gray-400">سفارش‌ها</div>
        </Link>
        <Link href="/dashboard/consultations" className="card-dark p-4">
          <div className="text-2xl font-bold text-[#C9A227]">{consultations.length}</div>
          <div className="text-sm text-gray-400">مشاوره‌ها</div>
        </Link>
        <Link href="/dashboard/courses" className="card-dark p-4">
          <div className="text-2xl font-bold text-[#C9A227]">-</div>
          <div className="text-sm text-gray-400">دوره‌ها</div>
        </Link>
        <Link href="/dashboard/profile" className="card-dark p-4">
          <div className="text-2xl font-bold text-[#C9A227]">{user.firstName || '---'}</div>
          <div className="text-sm text-gray-400">پروفایل</div>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-[#1C1C1C] p-6 rounded-xl border border-[#C9A227]/10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">سفارش‌های اخیر</h2>
            <Link href="/dashboard/orders" className="text-sm text-[#C9A227] hover:text-[#FFB71A]">
              مشاهده همه
            </Link>
          </div>
          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-[#1A1A1A] rounded animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>هنوز سفارشی ثبت نکرده‌اید.</p>
              <Link href="/courses" className="text-[#C9A227] text-sm hover:text-[#FFB71A]">
                مشاهده دوره‌ها
              </Link>
            </div>
          ) : (
            orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex justify-between items-center py-3 border-b border-[#C9A227]/10 last:border-0"
              >
                <div>
                  <span className="text-sm text-gray-200">
                    {order.itemType === 'course' ? 'دوره آموزشی' : 'مشاوره'}
                  </span>
                  <span className="text-xs text-gray-500 mr-2">{order.amount.toLocaleString()} ریال</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${statusMap[order.status]?.color || 'text-gray-400'}`}>
                  {statusMap[order.status]?.label || order.status}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="bg-[#1C1C1C] p-6 rounded-xl border border-[#C9A227]/10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">درخواست‌های مشاوره</h2>
            <Link href="/dashboard/consultations" className="text-sm text-[#C9A227] hover:text-[#FFB71A]">
              مشاهده همه
            </Link>
          </div>
          {consultLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-[#1A1A1A] rounded animate-pulse" />
              ))}
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>هنوز درخواست مشاوره‌ای ثبت نکرده‌اید.</p>
              <Link href="/consultation" className="text-[#C9A227] text-sm hover:text-[#FFB71A]">
                درخواست مشاوره
              </Link>
            </div>
          ) : (
            consultations.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center py-3 border-b border-[#C9A227]/10 last:border-0"
              >
                <span className="text-sm text-gray-200">
                  {c.requestType === 'tax' ? 'مالیاتی' : c.requestType === 'accounting' ? 'حسابداری' : 'عمومی'}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${statusMap[c.status]?.color || 'text-gray-400'}`}>
                  {statusMap[c.status]?.label || c.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
