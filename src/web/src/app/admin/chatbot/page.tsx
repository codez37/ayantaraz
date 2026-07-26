'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface KnowledgeEntry {
  id: number;
  question: string;
  answer: string;
  category: string;
  riskLevel: string;
  isActive: boolean;
}

const riskLevelLabels: Record<string, string> = {
  high: 'بالا',
  medium: 'متوسط',
  low: 'پایین',
  forbidden: 'ممنوع',
};

export default function AdminChatbotPage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: '', answer: '', category: '', riskLevel: 'low', isActive: true });

  const loadData = () => {
    setLoading(true);
    api
      .get<{ data: KnowledgeEntry[] }>('/chatbot/knowledge')
      .then((d) => setEntries(Array.isArray(d.data) ? d.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous setState
    const frame = requestAnimationFrame(() => {
      loadData();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSubmit = async () => {
    try {
      if (editing) {
        await api.patch(`/chatbot/knowledge/${editing.id}`, form);
      } else {
        await api.post('/chatbot/knowledge', form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ question: '', answer: '', category: '', riskLevel: 'low', isActive: true });
      loadData();
    } catch (err) {
      alert('خطا در ذخیره اطلاعات');
    }
  };

  const handleEdit = (e: KnowledgeEntry) => {
    setEditing(e);
    setForm({
      question: e.question,
      answer: e.answer,
      category: e.category,
      riskLevel: e.riskLevel,
      isActive: e.isActive,
    });
    setShowForm(true);
  };

  if (loading && !showForm)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-black text-white">دانشنامه چت‌بات</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm({ question: '', answer: '', category: '', riskLevel: 'low', isActive: true });
          }}
          className="btn-gold !py-2 !px-4 text-sm"
        >
          {showForm ? 'انصراف' : '➕ مورد جدید'}
        </button>
      </div>

      {showForm && (
        <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl p-5 space-y-3">
          <input
            placeholder="سوال"
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            className="input-dark text-sm"
          />
          <textarea
            placeholder="پاسخ"
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            className="input-dark text-sm"
            rows={4}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="دسته"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="input-dark text-sm"
            />
            <select
              value={form.riskLevel}
              onChange={(e) => setForm((f) => ({ ...f, riskLevel: e.target.value }))}
              className="input-dark text-sm"
            >
              <option value="low">کم ریسک</option>
              <option value="medium">متوسط</option>
              <option value="high">پر ریسک</option>
              <option value="forbidden">ممنوع</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            فعال باشد
          </label>
          <button onClick={handleSubmit} className="btn-gold w-full text-sm">
            ذخیره
          </button>
        </div>
      )}

      <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C9A227]/10 text-right">
                <th className="p-3 text-gray-400 font-bold">سوال</th>
                <th className="p-3 text-gray-400 font-bold">دسته</th>
                <th className="p-3 text-gray-400 font-bold">سطح ریسک</th>
                <th className="p-3 text-gray-400 font-bold">فعال</th>
                <th className="p-3 text-gray-400 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: KnowledgeEntry) => (
                <tr key={e.id} className="border-b border-[#C9A227]/5 hover:bg-[#C9A227]/5">
                  <td className="p-3 text-gray-300 max-w-[300px] truncate">{e.question}</td>
                  <td className="p-3 text-gray-400">{e.category}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        e.riskLevel === 'high' || e.riskLevel === 'forbidden'
                          ? 'bg-red-900/50 text-red-400'
                          : e.riskLevel === 'medium'
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : 'bg-green-900/50 text-green-400'
                      }`}
                    >
                      {riskLevelLabels[e.riskLevel] || e.riskLevel}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${e.isActive ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-400'}`}
                    >
                      {e.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleEdit(e)} className="text-blue-400 hover:underline text-xs">
                      ویرایش
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    موردی یافت نشد
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
