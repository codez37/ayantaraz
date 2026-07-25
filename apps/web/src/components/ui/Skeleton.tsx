'use client';

import { ReactNode } from 'react';

// Base skeleton component
interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function Skeleton({ className = '', children }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-700/50 rounded-lg ${className}`}>{children}</div>;
}

// Text skeleton
export function TextSkeleton({ className = '', lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-700/50 rounded" />
      ))}
    </div>
  );
}

// Card skeleton
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#121212] rounded-xl border border-[#1A1A1A] p-4 ${className}`}>
      <div className="h-4 bg-gray-700/50 rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-700/50 rounded w-3/4" />
        <div className="h-3 bg-gray-700/50 rounded w-1/2" />
      </div>
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="bg-[#121212] p-4 rounded-xl border border-[#1A1A1A] animate-pulse">
      <div className="h-3 bg-gray-700/50 rounded mb-2 w-3/4" />
      <div className="h-6 bg-gray-600/50 rounded w-1/2" />
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-[#C9A227]/5 animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-4 bg-gray-700/50 rounded" />
        </td>
      ))}
    </tr>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-[#0B0B0C] border border-[#C9A227]/10 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#C9A227]/10">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-3">
                  <div className="h-4 bg-gray-700/50 rounded w-3/4" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Dashboard stats grid skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Chat message skeleton
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed relative ${isUser ? 'bg-[#0B0B0C] text-gray-200 rounded-br-md border border-[#C9A227]/10' : 'bg-[#C9A227]/10 border border-[#C9A227]/20 text-gray-200 rounded-bl-md'}`}
      >
        <div className="space-y-1">
          <div className="h-3 bg-gray-600/50 rounded w-full" />
          <div className="h-3 bg-gray-600/50 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

// List skeleton
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-[#0B0B0C]/50 border border-[#C9A227]/10 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-700/50 rounded mb-2" />
          <div className="h-3 bg-gray-700/50 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

// Avatar skeleton
export function AvatarSkeleton({ className = '' }: { className?: string }) {
  return <div className={`w-10 h-10 rounded-full bg-gray-700/50 animate-pulse ${className}`} />;
}

// Button skeleton
export function ButtonSkeleton({ className = '' }: { className?: string }) {
  return <div className={`h-10 bg-gray-700/50 rounded-lg animate-pulse ${className}`} />;
}

// Input skeleton
export function InputSkeleton({ className = '' }: { className?: string }) {
  return <div className={`h-10 bg-gray-700/50 rounded-lg animate-pulse ${className}`} />;
}

// Full page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C9A227] border-t-transparent" />
        <div className="h-4 bg-gray-700/50 rounded w-48 animate-pulse" />
      </div>
    </div>
  );
}

// Spinner component
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent ${className}`} />
  );
}

// Loading overlay
export function LoadingOverlay({ message = 'در حال پردازش...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#121212] rounded-xl border border-[#C9A227]/20 p-6 flex flex-col items-center gap-4">
        <Spinner className="h-8 w-8" />
        <p className="text-gray-300">{message}</p>
      </div>
    </div>
  );
}
