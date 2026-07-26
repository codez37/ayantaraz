'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const sidebarItems = [
  { href: '/dashboard', label: 'داشبورد', icon: '📊' },
  { href: '/dashboard/orders', label: 'سفارش‌ها', icon: '🛒' },
  { href: '/dashboard/courses', label: 'دوره‌ها', icon: '📚' },
  { href: '/dashboard/consultations', label: 'مشاوره‌ها', icon: '📞' },
  { href: '/dashboard/profile', label: 'پروفایل', icon: '👤' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading)
    return (
      <div className="text-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-[#C9A227] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  if (!user) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-[#121212]">
      {/* Desktop sidebar */}
      <aside className="w-56 bg-[#1A1A1A] border-l border-[#C9A227]/10 shrink-0 hidden md:block">
        <div className="p-4 border-b border-[#C9A227]/10">
          <p className="text-sm text-gray-500">{user.phone}</p>
          <p className="font-bold text-white">{user.firstName || 'کاربر'}</p>
        </div>
        <nav className="p-2 space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block p-3 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-[#C9A227]/20 text-[#C9A227] font-bold'
                  : 'text-gray-400 hover:bg-[#C9A227]/10 hover:text-[#C9A227]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1A1A1A] border-t border-[#C9A227]/10 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors min-w-[60px] ${
                pathname === item.href ? 'text-[#C9A227] font-bold' : 'text-gray-500'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="flex-1 bg-[#121212] pb-20 md:pb-0">{children}</div>
    </div>
  );
}
