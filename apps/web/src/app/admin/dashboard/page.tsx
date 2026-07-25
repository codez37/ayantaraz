'use client';

import { useState } from 'react';
import { useDashboardStats } from '@/lib/hooks/useApi';
import { DashboardStatsSkeleton, PageLoadingSkeleton } from '@/components/ui/Skeleton';
import { useGlassmorphicTheme } from '@/providers/GlassmorphicThemeProvider';

interface DashboardStats {
  totalUsers?: number;
  totalContents?: number;
  totalCourses?: number;
  totalOrders?: number;
  totalConsultations?: number;
  pendingOrders?: number;
  pendingConsultations?: number;
  draftContents?: number;
}

interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  actor?: { phone?: string; firstName?: string; lastName?: string };
  createdAt: string;
}

// Format Persian numbers
function formatPersianNumber(num: number | undefined): string {
  if (num === undefined) return '۰';
  return num.toLocaleString('fa-IR');
}

// Format date for Persian locale
function formatPersianDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR');
  } catch {
    return dateString;
  }
}

// Color palette for stat cards
const statColors = [
  '#D4AF37', // Gold Primary
  '#C5A059', // Gold Secondary
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#F44336', // Red
  '#795548', // Brown
];

export default function AdminDashboardPage() {
  const { theme } = useGlassmorphicTheme();
  const { data, isLoading, error, isFetching } = useDashboardStats();
  const [showAudits, setShowAudits] = useState(true);

  if (isLoading && !isFetching) {
    return <DashboardStatsSkeleton />;
  }

  if (error) {
    return (
      <div className="glass-card border border-gold-400/30 text-gold-400 p-4 rounded-xl">
        خطا در دریافت اطلاعات: {error.message}
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentAudits = data?.recentAudits || [];

  const statCards = [
    { title: 'کاربران', value: stats.totalUsers ?? 0, color: statColors[0] },
    { title: 'محتواها', value: stats.totalContents ?? 0, color: statColors[1] },
    { title: 'دوره‌ها', value: stats.totalCourses ?? 0, color: statColors[2] },
    { title: 'مشاوره‌ها', value: stats.totalConsultations ?? 0, color: statColors[3] },
    { title: 'سفارش‌ها', value: stats.totalOrders ?? 0, color: statColors[4] },
    { title: 'در انتظار پرداخت', value: stats.pendingOrders ?? 0, color: statColors[5] },
    { title: 'در انتظار تماس', value: stats.pendingConsultations ?? 0, color: statColors[6] },
    { title: 'پیش‌نویس‌ها', value: stats.draftContents ?? 0, color: statColors[7] },
  ];

  // Theme-based styling
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-background-secondary/60' : 'bg-background-primary/80';
  const cardBorder = isDark ? 'border-border-gold/20' : 'border-border-gold/30';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gradient-gold">داشبورد مدیریتی</h1>
          <p className="text-sm text-text-secondary mt-1">نمای کلی سیستم</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gold-400 animate-pulse" />
          <span className="text-sm text-text-secondary">به‌روزرسانی خودکار</span>
        </div>
      </div>

      {isFetching && (
        <div className="fixed top-4 right-4 z-50">
          <div className="glass-card p-4 rounded-xl shadow-gold-md">
            <span className="text-sm text-gold-400">در حال به‌روزرسانی...</span>
          </div>
        </div>
      )}

      {/* Stats Grid - Mobile First */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`glass-card ${cardBg} ${cardBorder} p-4 rounded-xl group transition-all duration-300 hover:-translate-y-1 hover:border-border-gold/40`}
          >
            <div className="text-xs text-text-secondary mb-1">{stat.title}</div>
            <div
              className="text-xl font-bold gold-sheen"
              style={{
                backgroundImage: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}CC 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {formatPersianNumber(stat.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      {showAudits && recentAudits.length > 0 && (
        <div className={`glass-card ${cardBg} ${cardBorder} rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">آخرین فعالیت‌ها</h2>
            <button
              onClick={() => setShowAudits(false)}
              className="text-xs text-text-secondary hover:text-gold-400 transition-colors"
            >
              مخفی کردن
            </button>
          </div>
          <div className="space-y-3">
            {recentAudits.slice(0, 5).map((audit, index) => (
              <div
                key={audit.id}
                className="flex items-center gap-3 p-3 bg-background-tertiary/30 rounded-lg border border-border-gold/10 hover:bg-background-tertiary/50 transition-colors animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-8 h-8 rounded-full bg-gold-900/20 flex items-center justify-center text-gold-400 text-sm font-bold">
                  {audit.action.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{audit.action}</div>
                  <div className="text-xs text-text-secondary">
                    {audit.entityType} • {formatPersianDate(audit.createdAt)}
                  </div>
                </div>
                {audit.actor && (
                  <div className="text-xs text-text-secondary whitespace-nowrap">
                    {audit.actor.firstName || audit.actor.phone?.slice(-4)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAudits && recentAudits.length === 0 && (
        <div className={`glass-card ${cardBg} ${cardBorder} rounded-2xl p-6 text-center`}>
          <div className="text-4xl mb-2">📊</div>
          <p className="text-text-secondary">هیچ فعالیت اخیری یافت نشد</p>
        </div>
      )}
    </div>
  );
}
