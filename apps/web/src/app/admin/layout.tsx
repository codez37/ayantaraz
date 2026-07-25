'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useGlassmorphicTheme } from '@/providers/GlassmorphicThemeProvider';

const adminItems = [
  { path: '/admin/dashboard', icon: '🏠', label: 'داشبورد' },
  { path: '/admin/users', icon: '👥', label: 'کاربران' },
  { path: '/admin/contents', icon: '📝', label: 'محتوا و مینی‌بوک' },
  { path: '/admin/courses', icon: '📚', label: 'دوره‌ها' },
  { path: '/admin/consultations', icon: '📞', label: 'مشاوره‌ها' },
  { path: '/admin/chatbot', icon: '🤖', label: 'دانشنامه چت‌بات' },
  { path: '/admin/orders', icon: '🧾', label: 'سفارش‌ها' },
  { path: '/admin/audit-logs', icon: '🛡️', label: 'لاگ امنیتی' },
  { path: '/admin/settings', icon: '⚙️', label: 'تنظیمات' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { theme } = useGlassmorphicTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user?.role, router]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center bg-background-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') return null;

  // Theme-based styling
  const isDark = theme === 'dark';
  const sidebarBg = isDark ? 'bg-background-secondary' : 'bg-background-primary';
  const sidebarBorder = isDark ? 'border-border-gold/30' : 'border-border-gold/50';
  const mainBg = isDark ? 'bg-background-primary' : 'bg-background-secondary';
  const headerBorder = isDark ? 'border-border-gold/30' : 'border-border-gold/50';
  const textColor = isDark ? 'text-text-primary' : 'text-text-primary';
  const textMuted = isDark ? 'text-text-secondary' : 'text-text-tertiary';

  return (
    <div className={`min-h-screen ${mainBg} ${textColor}`} dir="rtl">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed right-0 top-0 z-50 h-full ${sidebarBorder} ${sidebarBg} transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-20'}`}
      >
        <div className="flex h-16 items-center justify-between border-b ${headerBorder} px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 font-black text-background-primary">
              آ
            </div>
            {sidebarOpen && <span className="text-sm font-black text-gold-400">پنل مدیریت آیان تراز</span>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-gold-400 hover:bg-gold-400/10 transition-colors"
            aria-label="تغییر منو"
          >
            {sidebarOpen ? '›' : '‹'}
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {adminItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-gold-400/10 hover:text-gold-400"
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-0 z-50 ${mobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ${sidebarBg} ${sidebarBorder}`}
      >
        <div className="flex h-16 items-center justify-between border-b ${headerBorder} px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 font-black text-background-primary">
              آ
            </div>
            <span className="text-sm font-black text-gold-400">پنل مدیریت</span>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-2 text-gold-400 hover:bg-gold-400/10 transition-colors"
            aria-label="بستن منو"
          >
            ✕
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {adminItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-gold-400/10 hover:text-gold-400"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`min-h-screen transition-all duration-300 ${sidebarOpen ? 'pr-72' : 'pr-20'} lg:${mobileSidebarOpen ? 'pr-0' : 'pr-20'}`}
      >
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b ${headerBorder} px-6 sticky top-0 z-40 bg-background-secondary/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2.5 text-gold-400 hover:bg-gold-400/10 rounded-lg transition-colors"
              aria-label="منو"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="text-sm font-bold text-gold-400 hover:text-gold-300 transition-colors">
              بازگشت به صفحه اصلی
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className={textColor}>{user.firstName || user.phone}</span>
            <span className="rounded-full border border-gold-400/30 px-3 py-1 text-gold-400">مدیر</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6">{children}</div>
      </main>

      {/* Overlay for mobile sidebar */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default AdminLayout;
