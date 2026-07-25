'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Order } from '@/types';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'در انتظار', color: 'text-[#C9A227] bg-[#C9A227]/10' },
  waiting_for_call: { label: 'منتظر تماس', color: 'text-[#C9A227] bg-[#C9A227]/10' },
  waiting_for_payment: { label: 'منتظر پرداخت', color: 'text-orange-400 bg-orange-900/20' },
  confirmed: { label: 'تایید شده', color: 'text-green-400 bg-green-900/20' },
  rejected: { label: 'رد شده', color: 'text-red-400 bg-red-900/20' },
  canceled: { label: 'لغو شده', color: 'text-gray-500 bg-gray-800/30' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>('/orders')
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-gray-500 hover:text-[#C9A227]">
          ← داشبورد
        </Link>
        <h1 className="text-2xl font-black text-gold-gradient">سفارش‌های من</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#1C1C1C] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-[#1C1C1C] rounded-xl border border-[#C9A227]/10">
          <p>هنوز سفارشی ثبت نکرده‌اید.</p>
          <Link href="/courses" className="text-[#C9A227] hover:text-[#FFB71A] mt-2 inline-block">
            مشاهده دوره‌ها
          </Link>
        </div>
      ) : (
        <div className="bg-[#1C1C1C] rounded-xl border border-[#C9A227]/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1A1A1A]">
                <tr>
                  <th className="text-right p-4 text-sm text-gray-400">نوع</th>
                  <th className="text-right p-4 text-sm text-gray-400">مبلغ</th>
                  <th className="text-right p-4 text-sm text-gray-400">وضعیت</th>
                  <th className="text-right p-4 text-sm text-gray-400">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-[#C9A227]/10 hover:bg-[#1A1A1A]">
                    <td className="p-4 text-gray-200">{order.itemType === 'course' ? 'دوره آموزشی' : 'مشاوره'}</td>
                    <td className="p-4 text-gray-300">{order.amount.toLocaleString()} ریال</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${statusMap[order.status]?.color}`}>
                        {statusMap[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
