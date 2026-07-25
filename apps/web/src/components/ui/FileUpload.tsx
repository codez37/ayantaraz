'use client';

import { useState, useRef, ChangeEvent, DragEvent, ReactNode } from 'react';
import { useFileUpload } from '@/lib/hooks/useApi';
import { ButtonSkeleton, Spinner } from './Skeleton';

interface FileUploadProps {
  onUploadSuccess?: (data: { url: string; originalName: string; mimeType: string; size: number }) => void;
  onUploadError?: (error: Error) => void;
  accept?: string;
  maxSize?: number;
  children?: ReactNode;
  className?: string;
}

interface UploadState {
  file: File | null;
  progress: number;
  isUploading: boolean;
  error: string | null;
}

export function FileUpload({
  onUploadSuccess,
  onUploadError,
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  children,
  className = '',
}: FileUploadProps) {
  const [state, setState] = useState<UploadState>({
    file: null,
    progress: 0,
    isUploading: false,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useFileUpload();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const validateFile = (file: File): { valid: boolean; error: string | null } => {
    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `حجم فایل نباید بیش از ${formatFileSize(maxSize)} باشد`,
      };
    }

    // Check file type
    if (
      accept !== '*' &&
      !accept.split(',').some((type) => {
        if (type.endsWith('/*')) {
          const category = type.slice(0, -2);
          return file.type.startsWith(category);
        }
        return file.type === type || file.name.endsWith(type.slice(1));
      })
    ) {
      return {
        valid: false,
        error: `نوع فایل مجاز نیست. انواع مجاز: ${accept}`,
      };
    }

    return { valid: true, error: null };
  };

  const handleFileChange = async (file: File) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setState((prev) => ({ ...prev, error: validation.error }));
      onUploadError?.(new Error(validation.error || 'Validation failed'));
      return;
    }

    // Clear previous error
    setState((prev) => ({ ...prev, error: null, file }));

    // Start upload
    try {
      setState((prev) => ({ ...prev, isUploading: true, progress: 0 }));

      const result = await uploadMutation.mutateAsync(file);

      setState((prev) => ({ ...prev, isUploading: false, progress: 100 }));
      onUploadSuccess?.(result);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : 'خطا در آپلود فایل',
      }));
      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileChange(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileChange(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemove = () => {
    setState((prev) => ({ ...prev, file: null, progress: 0, error: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* File input (hidden) */}
      <input type="file" ref={fileInputRef} onChange={handleInputChange} accept={accept} className="hidden" />

      {/* Drop zone */}
      <div
        onClick={triggerFileInput}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          state.isUploading
            ? 'border-[#C9A227] bg-[#C9A227]/10'
            : state.error
              ? 'border-red-500 bg-red-900/10'
              : 'border-[#C9A227]/30 bg-[#0B0B0C]/50 hover:border-[#C9A227]/50 hover:bg-[#0B0B0C]/80'
        }`}
      >
        {state.isUploading ? (
          <div className="space-y-2">
            <Spinner className="mx-auto" />
            <p className="text-[#C9A227]">در حال آپلود: {state.progress}%</p>
            <div className="w-full h-2 bg-[#C9A227]/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A227] transition-all duration-200"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        ) : state.file ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-[#C9A227]/10 rounded-xl flex items-center justify-center">
                <FileIcon extension={state.file.name.split('.').pop() || ''} />
              </div>
            </div>
            <p className="text-white font-medium truncate">{state.file.name}</p>
            <p className="text-gray-500 text-sm">{formatFileSize(state.file.size)}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              حذف
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <UploadIcon />
            <p className="text-white">فایل خود را اینجا رها کنید یا کلیک کنید</p>
            <p className="text-gray-500 text-sm">
              فرمت‌های مجاز: {accept === '*' ? 'همه' : accept}
              {maxSize && ` | حداکثر حجم: ${formatFileSize(maxSize)}`}
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {state.error && (
        <div className="bg-red-900/20 border border-red-800/30 text-red-400 p-3 rounded-lg text-sm">{state.error}</div>
      )}

      {/* Custom children */}
      {children}
    </div>
  );
}

// File icon component
function FileIcon({ extension }: { extension: string }) {
  const icons: Record<string, string> = {
    pdf: '📄',
    doc: '📄',
    docx: '📄',
    xls: '📊',
    xlsx: '📊',
    ppt: '📑',
    pptx: '📑',
    txt: '📝',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    webp: '🖼️',
    mp4: '🎥',
    mp3: '🎵',
    zip: '🗄️',
    rar: '🗄️',
  };

  return <span className="text-2xl">{icons[extension.toLowerCase()] || '📁'}</span>;
}

// Upload icon component
function UploadIcon() {
  return (
    <svg className="w-12 h-12 text-[#C9A227] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

export default FileUpload;
