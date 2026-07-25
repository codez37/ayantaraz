'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AdminOrder {
  id: number;
  user?: { phone: string };
  amount: number;
  status: string;
  paymentRef?: string;
}

interface OrdersResponse {
  data?: AdminOrder[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api.get<OrdersResponse | AdminOrder[]>('/orders');
        setOrders(Array.isArray(d) ? d : (d as OrdersResponse).data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/orders/${id}/status`, { status, adminNote: 'تأیید مدیر' });
      api
        .get<OrdersResponse | AdminOrder[]>('/orders')
        .then((d) => setOrders(Array.isArray(d) ? d : (d as OrdersResponse).data || []))
        .catch(() => {});
    } catch {}
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black text-white">مدیریت سفارش‌ها</h1>
      <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C9A227]/10 text-right">
                <th className="p-3 text-gray-400 font-bold">شناسه</th>
                <th className="p-3 text-gray-400 font-bold">کاربر</th>
                <th className="p-3 text-gray-400 font-bold">مبلغ</th>
                <th className="p-3 text-gray-400 font-bold">وضعیت</th>
                <th className="p-3 text-gray-400 font-bold">پیگیری</th>
                <th className="p-3 text-gray-400 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: AdminOrder) => (
                <tr key={o.id} className="border-b border-[#C9A227]/5 hover:bg-[#C9A227]/5">
                  <td className="p-3 text-gray-300">{o.id}</td>
                  <td className="p-3 text-gray-300">{o.user?.phone || '-'}</td>
                  <td className="p-3 text-[#C9A227]">{o.amount?.toLocaleString()}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        o.status === 'confirmed'
                          ? 'bg-green-900/50 text-green-400'
                          : o.status === 'pending'
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {o.status === 'confirmed' ? 'تأیید شده' : o.status === 'pending' ? 'در انتظار' : 'لغو شده'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{o.paymentRef || '-'}</td>
                  <td className="p-3">
                    {o.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(o.id, 'confirmed')}
                          className="px-3 py-1 bg-green-900/50 text-green-400 rounded text-xs hover:bg-green-900/70"
                        >
                          تأیید
                        </button>
                        <button
                          onClick={() => updateStatus(o.id, 'rejected')}
                          className="px-3 py-1 bg-red-900/50 text-red-400 rounded text-xs hover:bg-red-900/70"
                        >
                          رد
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    هیچ سفارشی یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
