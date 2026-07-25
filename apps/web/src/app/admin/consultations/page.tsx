'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ConsultationRequest } from '@/types';

const statusLabels: Record<string, string> = {
  pending: 'در انتظار',
  contacted: 'تماس گرفته شده',
  scheduled: 'برنامه‌ریزی شده',
  completed: 'تکمیل شده',
  canceled: 'لغو شده',
  no_response: 'بدون پاسخ',
  rejected: 'رد شده',
};

const typeLabels: Record<string, string> = {
  tax: 'مالیاتی',
  accounting: 'حسابداری',
  general: 'عمومی',
};

export default function AdminConsultationsPage() {
  const [items, setItems] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: ConsultationRequest[] } | ConsultationRequest[]>('/consultation')
      .then((d) => setItems(Array.isArray(d) ? d : (d as { data: ConsultationRequest[] }).data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/consultation/${id}/status`, { status });
      setItems((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: status as ConsultationRequest['status'] } : c)),
      );
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
      <h1 className="text-xl font-black text-white">مدیریت مشاوره‌ها</h1>
      <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C9A227]/10 text-right">
                <th className="p-3 text-gray-400 font-bold">نوع</th>
                <th className="p-3 text-gray-400 font-bold">توضیحات</th>
                <th className="p-3 text-gray-400 font-bold">زمان</th>
                <th className="p-3 text-gray-400 font-bold">وضعیت</th>
                <th className="p-3 text-gray-400 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c: ConsultationRequest) => (
                <tr key={c.id} className="border-b border-[#C9A227]/5 hover:bg-[#C9A227]/5">
                  <td className="p-3 text-gray-300">{typeLabels[c.requestType] || c.requestType}</td>
                  <td className="p-3 text-gray-400 max-w-[250px] truncate">{c.description}</td>
                  <td className="p-3 text-gray-400 text-xs">
                    {c.preferredTime ? new Date(c.preferredTime).toLocaleDateString('fa-IR') : '-'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        c.status === 'completed'
                          ? 'bg-green-900/50 text-green-400'
                          : c.status === 'pending'
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : c.status === 'canceled' || c.status === 'rejected'
                              ? 'bg-red-900/50 text-red-400'
                              : 'bg-blue-900/50 text-blue-400'
                      }`}
                    >
                      {statusLabels[c.status] || c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {c.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(c.id, 'contacted')}
                            className="px-2 py-1 bg-blue-900/50 text-blue-400 rounded text-xs"
                          >
                            تماس گرفته شد
                          </button>
                          <button
                            onClick={() => updateStatus(c.id, 'completed')}
                            className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs"
                          >
                            تکمیل
                          </button>
                          <button
                            onClick={() => updateStatus(c.id, 'rejected')}
                            className="px-2 py-1 bg-red-900/50 text-red-400 rounded text-xs"
                          >
                            رد
                          </button>
                        </>
                      )}
                      {c.status === 'contacted' && (
                        <button
                          onClick={() => updateStatus(c.id, 'completed')}
                          className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs"
                        >
                          تکمیل
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    درخواستی یافت نشد
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
