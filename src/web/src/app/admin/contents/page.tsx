'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Content, PaginatedResponse, UploadResponse } from '@/types';

interface ContentForm {
  title: string;
  summary: string;
  body: string;
  contentType: string;
  status: string;
  visibility: string;
  mediaUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
  pageCount: number;
  tags: string;
}

const emptyForm: ContentForm = {
  title: '',
  summary: '',
  body: '',
  contentType: 'article',
  status: 'draft',
  visibility: 'public',
  mediaUrl: '',
  thumbnailUrl: '',
  duration: 0,
  fileSize: 0,
  pageCount: 0,
  tags: '',
};

const contentTypeLabels: Record<string, string> = {
  article: 'مقاله',
  video: 'ویدیو',
  minibook: 'مینی‌بوک',
  faq: 'سوالات متداول',
  static_page: 'صفحه ثابت',
};

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس',
  review: 'در انتظار بررسی',
  published: 'منتشر شده',
  archived: 'بایگانی',
};

export default function AdminContentsPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);
  const [form, setForm] = useState<ContentForm>(emptyForm);
  const [uploading, setUploading] = useState<'media' | 'thumbnail' | null>(null);
  const [filterType, setFilterType] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const fetchContents = useCallback(async (type?: string) => {
    const q = type ? `?limit=50&type=${type}` : '?limit=50';
    return api.get<PaginatedResponse<Content>>(`/content${q}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchContents(filterType)
      .then((d) => {
        if (!cancelled) {
          setContents(d.data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterType, fetchContents]);

  const handleUpload = async (file: File, field: 'mediaUrl' | 'thumbnailUrl') => {
    setUploading(field === 'mediaUrl' ? 'media' : 'thumbnail');
    try {
      const result = await api.upload<UploadResponse>('/upload', file);
      setForm((f) => ({ ...f, [field]: result.url }));
    } catch {
      alert('خطا در آپلود فایل');
    }
    setUploading(null);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await api.patch(`/content/${editing.id}`, form as unknown as Record<string, unknown>);
      } else {
        await api.post('/content', form as unknown as Record<string, unknown>);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      fetchContents(filterType)
        .then((d) => {
          setContents(d.data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } catch {}
  };

  const handleEdit = (c: Content) => {
    setEditing(c);
    setForm({
      title: c.title,
      summary: c.summary,
      body: c.body,
      contentType: c.contentType,
      status: c.status,
      visibility: c.visibility,
      mediaUrl: c.mediaUrl,
      thumbnailUrl: c.thumbnailUrl,
      duration: c.duration,
      fileSize: c.fileSize,
      pageCount: c.pageCount,
      tags: c.tags,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('حذف شود؟')) return;
    try {
      await api.delete(`/content/${id}`);
      fetchContents(filterType)
        .then((d) => {
          setContents(d.data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } catch {}
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/content/${id}/status`, { status });
      fetchContents(filterType)
        .then((d) => {
          setContents(d.data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } catch {}
  };

  const totalUploading = uploading !== null;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-white">مدیریت محتوا</h1>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setLoading(true);
            }}
            className="input-dark text-sm w-auto"
          >
            <option value="">همه انواع</option>
            <option value="article">مقاله</option>
            <option value="video">ویدیو</option>
            <option value="minibook">مینی‌بوک</option>
            <option value="faq">سوالات متداول</option>
            <option value="static_page">صفحه ثابت</option>
          </select>
          <button
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
              setShowForm(!showForm);
            }}
            className="btn-gold !py-2 !px-4 text-sm whitespace-nowrap"
          >
            {showForm ? '✕ بستن' : '➕ محتوای جدید'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl p-5 space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">عنوان</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="input-dark text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">نوع محتوا</label>
              <select
                value={form.contentType}
                onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value }))}
                className="input-dark text-sm"
              >
                {Object.entries(contentTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">وضعیت</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="input-dark text-sm"
              >
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">دسترسی</label>
              <select
                value={form.visibility}
                onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
                className="input-dark text-sm"
              >
                <option value="public">عمومی</option>
                <option value="authenticated">کاربران وارد شده</option>
                <option value="admin_only">فقط مدیران</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">برچسب‌ها (کاما)</label>
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                className="input-dark text-sm"
                placeholder="tag1, tag2"
              />
            </div>
            {['video', 'minibook'].includes(form.contentType) && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">مدت (ثانیه)</label>
                <input
                  type="number"
                  value={form.duration || ''}
                  onChange={(e) => setForm((f) => ({ ...f, duration: parseInt(e.target.value) || 0 }))}
                  className="input-dark text-sm"
                />
              </div>
            )}
          </div>

          {['video', 'minibook'].includes(form.contentType) && (
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">فایل ویدیو / PDF</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={form.contentType === 'video' ? 'video/*' : '.pdf,application/pdf'}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, 'mediaUrl');
                  }}
                />
                <div className="flex gap-2">
                  <input
                    value={form.mediaUrl}
                    onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))}
                    className="input-dark text-sm flex-1"
                    placeholder="آدرس فایل"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={totalUploading}
                    className="btn-gold !py-2 !px-3 text-xs whitespace-nowrap"
                  >
                    {uploading === 'media' ? '...' : 'آپلود'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">تصویر بندانگشتی</label>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, 'thumbnailUrl');
                  }}
                />
                <div className="flex gap-2">
                  <input
                    value={form.thumbnailUrl}
                    onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                    className="input-dark text-sm flex-1"
                    placeholder="آدرس تصویر"
                  />
                  <button
                    onClick={() => thumbInputRef.current?.click()}
                    disabled={totalUploading}
                    className="btn-gold !py-2 !px-3 text-xs whitespace-nowrap"
                  >
                    {uploading === 'thumbnail' ? '...' : 'آپلود'}
                  </button>
                </div>
              </div>
              {form.contentType === 'minibook' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">تعداد صفحات</label>
                  <input
                    type="number"
                    value={form.pageCount || ''}
                    onChange={(e) => setForm((f) => ({ ...f, pageCount: parseInt(e.target.value) || 0 }))}
                    className="input-dark text-sm"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">خلاصه</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              className="input-dark text-sm"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">محتوا (بدنه)</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="input-dark text-sm"
              rows={5}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={!form.title.trim()} className="btn-gold text-sm flex-1">
              {editing ? 'ویرایش' : 'ذخیره'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setForm(emptyForm);
              }}
              className="btn-outline-gold text-sm"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C9A227]/10 text-right">
                <th className="p-3 text-gray-400 font-bold">عنوان</th>
                <th className="p-3 text-gray-400 font-bold">نوع</th>
                <th className="p-3 text-gray-400 font-bold">وضعیت</th>
                <th className="p-3 text-gray-400 font-bold">دسترسی</th>
                <th className="p-3 text-gray-400 font-bold">فایل</th>
                <th className="p-3 text-gray-400 font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {contents.map((c: Content) => (
                <tr key={c.id} className="border-b border-[#C9A227]/5 hover:bg-[#C9A227]/5">
                  <td className="p-3 text-gray-300 max-w-[200px] truncate" title={c.title}>
                    {c.title}
                  </td>
                  <td className="p-3 text-gray-400">{contentTypeLabels[c.contentType] || c.contentType}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        c.status === 'published'
                          ? 'bg-green-900/50 text-green-400'
                          : c.status === 'draft'
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : c.status === 'review'
                              ? 'bg-blue-900/50 text-blue-400'
                              : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {statusLabels[c.status] || c.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">
                    {c.visibility === 'public' ? 'عمومی' : c.visibility === 'authenticated' ? 'کاربران' : 'مدیران'}
                  </td>
                  <td className="p-3">
                    {c.mediaUrl ? (
                      <a
                        href={c.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#C9A227] hover:underline text-xs"
                      >
                        مشاهده
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs">ندارد</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="px-2 py-1 bg-blue-900/50 text-blue-400 rounded text-xs hover:bg-blue-900/70"
                      >
                        ویرایش
                      </button>
                      {c.status === 'draft' && (
                        <button
                          onClick={() => updateStatus(c.id, 'published')}
                          className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs"
                        >
                          انتشار
                        </button>
                      )}
                      {c.status === 'published' && (
                        <button
                          onClick={() => updateStatus(c.id, 'archived')}
                          className="px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded text-xs"
                        >
                          بایگانی
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="px-2 py-1 bg-red-900/50 text-red-400 rounded text-xs hover:bg-red-900/70"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {contents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    محتوایی یافت نشد
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
