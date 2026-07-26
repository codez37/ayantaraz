'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ConsultationRequest } from '@/types';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'در انتظار بررسی', color: 'text-[#C9A227] bg-[#C9A227]/10' },
  contacted: { label: 'تماس گرفته شده', color: 'text-blue-400 bg-blue-900/20' },
  scheduled: { label: 'زمان‌بندی شده', color: 'text-purple-400 bg-purple-900/20' },
  completed: { label: 'انجام شده', color: 'text-green-400 bg-green-900/20' },
  canceled: { label: 'لغو شده', color: 'text-gray-500 bg-gray-800/30' },
};

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<ConsultationRequest[]>('/consultation')
      .then(setConsultations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-gray-500 hover:text-[#C9A227]">
          ← داشبورد
        </Link>
        <h1 className="text-2xl font-black text-gold-gradient">درخواست‌های مشاوره</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#1C1C1C] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-[#1C1C1C] rounded-xl border border-[#C9A227]/10">
          <p>هنوز درخواست مشاوره‌ای ثبت نکرده‌اید.</p>
          <Link href="/consultation" className="text-[#C9A227] hover:text-[#FFB71A] mt-2 inline-block">
            درخواست مشاوره
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map((c) => (
            <div key={c.id} className="bg-[#1C1C1C] rounded-xl border border-[#C9A227]/10 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="w-full text-right p-4 hover:bg-[#1A1A1A] flex justify-between items-center transition-colors"
              >
                <div>
                  <span className="font-bold text-white ml-2">
                    {c.requestType === 'tax'
                      ? 'مشاوره مالیاتی'
                      : c.requestType === 'accounting'
                        ? 'خدمات حسابداری'
                        : 'مشاوره عمومی'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded mr-2 ${statusMap[c.status]?.color}`}>
                    {statusMap[c.status]?.label || c.status}
                  </span>
                </div>
                <span className="text-gray-500 text-sm">{new Date(c.createdAt).toLocaleDateString('fa-IR')}</span>
              </button>
              {expandedId === c.id && (
                <div className="px-4 pb-4 border-t border-[#C9A227]/10 pt-3 text-sm text-gray-400">
                  <p>{c.description}</p>
                  {c.preferredTime && <p className="mt-2 text-gray-500">زمان پیشنهادی: {c.preferredTime}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
