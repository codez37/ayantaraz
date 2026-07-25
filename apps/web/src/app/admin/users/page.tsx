'use client';

import { useState, useEffect } from 'react';
import { useUsersList, useToggleUserBlock } from '@/lib/hooks/useApi';
import { TableSkeleton, Spinner } from '@/components/ui/Skeleton';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  user: 'کاربر',
  consultant: 'مشاور',
  content_manager: 'مدیر محتوا',
  admin: 'مدیر',
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-900/50 text-red-400',
  content_manager: 'bg-blue-900/50 text-blue-400',
  consultant: 'bg-purple-900/50 text-purple-400',
  user: 'bg-gray-800 text-gray-400',
};

// Format Persian date
function formatPersianDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR');
  } catch {
    return dateString;
  }
}

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error, isFetching } = useUsersList(page, limit, debouncedSearch);
  const toggleBlockMutation = useToggleUserBlock();

  const users = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const toggleBlock = async (userId: number, currentStatus: boolean) => {
    try {
      await toggleBlockMutation.mutateAsync({ userId, currentStatus });
      // Invalidate users list to refetch
    } catch (err) {
      toast.error('خطا در تغییر وضعیت کاربر');
    }
  };

  if (isLoading && !isFetching) {
    return <TableSkeleton rows={5} columns={6} />;
  }

  if (error) {
    return (
      <div className="bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] p-4 rounded-lg">
        خطا در دریافت لیست کاربران: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">مدیریت کاربران</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="جستجوی کاربران..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#1A1A1A] border border-[#C9A227]/20 text-gray-200 p-2 rounded-lg text-sm focus:outline-none focus:border-[#C9A227] w-64"
          />
        </div>
      </div>

      {isFetching && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-[#121212] border border-[#C9A227]/20 rounded-lg px-4 py-2 flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            <span className="text-sm text-[#C9A227]">در حال به‌روزرسانی...</span>
          </div>
        </div>
      )}

      <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C9A227]/10 text-right">
                <th className="p-3 text-gray-400 font-bold">تلفن</th>
                <th className="p-3 text-gray-400 font-bold">نام</th>
                <th className="p-3 text-gray-400 font-bold">نقش</th>
                <th className="p-3 text-gray-400 font-bold">وضعیت</th>
                <th className="p-3 text-gray-400 font-bold">تاریخ ثبت‌نام</th>
                <th className="p-3 text-gray-400 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#C9A227]/5 hover:bg-[#C9A227]/5">
                  <td className="p-3 text-gray-300" dir="ltr">
                    {u.phone}
                  </td>
                  <td className="p-3 text-gray-300">
                    {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}` : '-'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${roleColors[u.role] || 'bg-gray-800 text-gray-400'}`}
                    >
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${u.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}
                    >
                      {u.isActive ? 'فعال' : 'مسدود'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs">{formatPersianDate(u.createdAt)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleBlock(u.id, u.isActive)}
                      disabled={toggleBlockMutation.isPending}
                      className={`px-2 py-1 rounded text-xs ${u.isActive ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70' : 'bg-green-900/50 text-green-400 hover:bg-green-900/70'} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                      {u.isActive ? 'مسدود' : 'رفع مسدودیت'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    کاربری یافت نشد
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
            نمایش {meta.page} از {meta.totalPages} صفحه ({meta.total.toLocaleString('fa-IR')} کاربر)
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
