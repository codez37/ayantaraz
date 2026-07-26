'use client';

import { Toaster } from 'sonner';
import { ReactNode } from 'react';

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        dir="rtl"
        theme="dark"
        toastOptions={{
          className: 'bg-[#121212] border border-[#C9A227]/20 text-gray-200',
          style: {
            background: '#121212',
            border: '1px solid rgba(201, 162, 39, 0.2)',
            color: '#FFFFFF',
          },
        }}
      />
    </>
  );
}
