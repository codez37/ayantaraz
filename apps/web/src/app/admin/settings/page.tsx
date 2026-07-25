'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Setting {
  key: string;
  value: string;
  updatedBy: number;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadSettings = () => {
    setLoading(true);
    api.get<Setting[]>('/admin/settings')
      .then(d => setSettings(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous setState
    const frame = requestAnimationFrame(() => {
      loadSettings();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleUpdate = async (key: string) => {
    try {
      await api.patch(`/admin/settings/${key}`, { value: editValue });
      setEditing(null);
      loadSettings();
    } catch {
      alert('خطا در بروزرسانی');
    }
  };

  if (loading && !editing) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black text-white">تنظیمات سیستم</h1>
      <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C9A227]/10 text-right">
                <th className="p-3 text-gray-400 font-bold">کلید</th>
                <th className="p-3 text-gray-400 font-bold">مقدار</th>
                <th className="p-3 text-gray-400 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s: Setting) => (
                <tr key={s.key} className="border-b border-[#C9A227]/5 hover:bg-[#C9A227]/5">
                  <td className="p-3 text-gray-300">{s.key}</td>
                  <td className="p-3 text-gray-400 max-w-[400px] truncate text-left" dir="ltr">
                    {editing === s.key ? (
                      <input value={editValue} onChange={e => setEditValue(e.target.value)} className="input-dark text-xs py-1" />
                    ) : s.value}
                  </td>
                  <td className="p-3 text-center">
                    {editing === s.key ? (
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleUpdate(s.key)} className="text-green-400 text-xs">تایید</button>
                        <button onClick={() => setEditing(null)} className="text-red-400 text-xs">لغو</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditing(s.key); setEditValue(s.value); }} className="text-blue-400 hover:underline text-xs">ویرایش</button>
                    )}
                  </td>
                </tr>
              ))}
              {settings.length === 0 && (
                <tr><td colSpan={2} className="p-8 text-center text-gray-500">تنظیماتی یافت نشد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
