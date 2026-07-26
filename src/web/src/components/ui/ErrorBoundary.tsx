'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-[#0B0B0C]">
          <h1 className="text-4xl font-black text-red-400 mb-4">خطا!</h1>
          <p className="text-lg text-gray-300 mb-4">متأسفانه مشکلی در نمایش صفحه پیش آمده است.</p>
          <p className="text-sm text-gray-500 mb-8">{this.state.error?.message || 'خطای ناشناخته'}</p>
          <button
            onClick={() => {
              // Try to reload the page
              window.location.reload();
            }}
            className="btn-gold"
          >
            تلاش مجدد
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
