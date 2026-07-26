'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { QueryClientProvider } from '@/providers/QueryClientProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { GlassmorphicThemeProvider } from '@/providers/GlassmorphicThemeProvider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <GlassmorphicThemeProvider>
        <QueryClientProvider>
          <ToastProvider>
            <AuthProvider>
              <div className="min-h-screen bg-background-primary text-text-primary">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
                <ChatbotWidget />
              </div>
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </GlassmorphicThemeProvider>
    </ErrorBoundary>
  );
}
