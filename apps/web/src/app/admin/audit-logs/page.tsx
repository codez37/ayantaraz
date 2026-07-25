'use client';

import { useState, useEffect } from 'react';
import { useAuditLogs } from '@/lib/hooks/useApi';
import { TableSkeleton, Spinner } from '@/components/ui/Skeleton';
import { toast } from 'sonner';

// Format Persian date
function formatPersianDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR');
  } catch {
    return dateString;
  }
}

// Format Persian time
function formatPersianTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
}

// Format Persian date and time
function formatPersianDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return `${formatPersianDate(dateString)} - ${formatPersianTime(dateString)}`;
  } catch {
    return dateString;
  }
}

// Entity type labels
const entityTypeLabels: Record<string, string> = {
  user: 'کاربر',
  content: 'محتوا',
  course: 'دوره',
  order: 'سفارش',
  consultation: 'مشاوره',
  otp: 'OTP',
  knowledge_base: 'دانشنامه',
  audit_log: 'لاگ',
  setting: 'تنظیمات',
};

// Action type labels
const actionTypeLabels: Record<string, string> = {
  create: 'ایجاد',
  update: 'به‌روزرسانی',
  delete: 'حذف',
  login: 'ورود',
  logout: 'خروج',
  block: 'مسدود کردن',
  unblock: 'رفع مسدودیت',
  otp_send: 'ارسال OTP',
  otp_verify: 'تایید OTP',
  'auth:login': 'ورود',
  'auth:logout': 'خروج',
  'auth:otp_fail': 'خطا در OTP',
};

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    actorId: '',
  });

  // Debounced filters
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Apply debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const { data, isLoading, error, isFetching } = useAuditLogs(page, limit, {
    entityType: debouncedFilters.entityType || undefined,
    action: debouncedFilters.action || undefined,
    actorId: debouncedFilters.actorId ? parseInt(debouncedFilters.actorId) : undefined,
  });

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ entityType: '', action: '', actorId: '' });
  };

  if (isLoading && !isFetching) {
    return <TableSkeleton rows={5} columns={6} />;
  }

  if (error) {
    return (
      <div className="bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] p-4 rounded-lg">
        خطا در دریافت لاگ‌ها: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">لاگ‌های امنیتی</h1>
      </div>

      {/* Filters */}
      <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">نوع موجودیت</label>
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#C9A227]/20 text-gray-200 p-2 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]"
            >
              <option value="">همه</option>
              {Object.entries(entityTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">عملیات</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#C9A227]/20 text-gray-200 p-2 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]"
            >
              <option value="">همه</option>
              {Object.entries(actionTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">شناسه کاربر</label>
            <input
              type="number"
              value={filters.actorId}
              onChange={(e) => handleFilterChange('actorId', e.target.value)}
              placeholder="شناسه کاربر"
              className="w-full bg-[#1A1A1A] border border-[#C9A227]/20 text-gray-200 p-2 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={clearFilters}
            disabled={!filters.entityType && !filters.action && !filters.actorId}
            className="px-4 py-2 bg-[#121212] border border-[#C9A227]/20 rounded-lg text-sm text-gray-400 hover:text-[#C9A227] hover:bg-[#C9A227]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            پاک کردن فیلترها
          </button>
        </div>
      </div>

      {isFetching && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-[#121212] border border-[#C9A227]/20 rounded-lg px-4 py-2 flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            <span className="text-sm text-[#C9A227]">در حال جستجو...</span>
          </div>
        </div>
      )}

      <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C9A227]/10 text-right">
                <th className="p-3 text-gray-400 font-bold">عملیات</th>
                <th className="p-3 text-gray-400 font-bold">نوع موجودیت</th>
                <th className="p-3 text-gray-400 font-bold">شناسه موجودیت</th>
                <th className="p-3 text-gray-400 font-bold">کاربر</th>
                <th className="p-3 text-gray-400 font-bold">تاریخ</th>
                <th className="p-3 text-gray-400 font-bold">جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[#C9A227]/5 hover:bg-[#C9A227]/5">
                  <td className="p-3 text-gray-300">{actionTypeLabels[log.action] || log.action}</td>
                  <td className="p-3 text-gray-400">{entityTypeLabels[log.entityType] || log.entityType}</td>
                  <td className="p-3 text-gray-400 text-xs">{log.entityId ?? '-'}</td>
                  <td className="p-3 text-gray-300">
                    {log.actor?.firstName || log.actor?.phone?.slice(-4) || 'ناشناس'}
                  </td>
                  <td className="p-3 text-gray-400 text-xs">{formatPersianDateTime(log.createdAt)}</td>
                  <td className="p-3 text-gray-400 text-xs max-w-[200px] truncate">
                    {log.oldValue ? `از: ${JSON.stringify(log.oldValue)}` : ''}
                    {log.newValue ? ` به: ${JSON.stringify(log.newValue)}` : ''}
                    {!log.oldValue && !log.newValue && '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    لاگی یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta.total > meta.limit && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            نمایش {meta.page.toLocaleString('fa-IR')} از {meta.totalPages.toLocaleString('fa-IR')} صفحه (
            {meta.total.toLocaleString('fa-IR')} لاگ)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              className="px-3 py-1.5 bg-[#121212] border border-[#C9A227]/20 rounded-lg text-sm text-gray-400 hover:text-[#C9A227] hover:bg-[#C9A227]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              قبلی
            </button>
            <span className="text-sm text-gray-400">
              صفحه {page.toLocaleString('fa-IR')} از {meta.totalPages.toLocaleString('fa-IR')}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages || isFetching}
              className="px-3 py-1.5 bg-[#121212] border border-[#C9A227]/20 rounded-lg text-sm text-gray-400 hover:text-[#C9A227] hover:bg-[#C9A227]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              بعدی
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
