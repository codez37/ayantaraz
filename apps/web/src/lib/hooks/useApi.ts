'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../api';
import type { User } from '@/types';

// Type-safe API query hook
export function useApiQuery<TData>(
  key: string | string[],
  path: string,
  params?: Record<string, string>,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>,
) {
  const queryKey = Array.isArray(key) ? key : [key];

  return useQuery<TData>({
    queryKey: params ? [...queryKey, params] : queryKey,
    queryFn: async () => {
      try {
        return await api.get<TData>(path, params, { skipCsrf: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'خطا در دریافت اطلاعات';
        toast.error(message);
        throw error;
      }
    },
    ...options,
  });
}

// Type-safe API mutation hook
export function useApiMutation<TData, TVariables>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      try {
        switch (method) {
          case 'POST':
            return await api.post<TData>(path, variables as Record<string, unknown>);
          case 'PUT':
            return await api.put<TData>(path, variables as Record<string, unknown>);
          case 'PATCH':
            return await api.patch<TData>(path, variables as Record<string, unknown>);
          case 'DELETE':
            return await api.delete<TData>(path);
          default:
            throw new Error('Invalid HTTP method');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'خطا در ارسال اطلاعات';
        toast.error(message);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate queries related to this path
      const pathKey = path.split('/').filter(Boolean);
      queryClient.invalidateQueries({ queryKey: pathKey });

      // Show success toast if there's a message in response
      if (typeof data === 'object' && data && 'message' in data) {
        toast.success((data as { message?: string }).message || 'عملیات با موفقیت انجام شد');
      }
    },
    ...options,
  });
}

// Specialized hook for paginated queries
export function usePaginatedQuery<TData>(
  key: string | string[],
  path: string,
  pageParam?: number,
  limitParam?: number,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>,
) {
  const queryKey = Array.isArray(key) ? key : [key];

  return useQuery<TData>({
    queryKey: [...queryKey, pageParam, limitParam],
    queryFn: async () => {
      try {
        const params: Record<string, string> = {};
        if (pageParam !== undefined) params.page = pageParam.toString();
        if (limitParam !== undefined) params.limit = limitParam.toString();

        return await api.get<TData>(path, params, { skipCsrf: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'خطا در دریافت اطلاعات';
        toast.error(message);
        throw error;
      }
    },
    ...options,
  });
}

// Hook for fetching user profile
export function useUserProfile() {
  return useApiQuery<User>('user-profile', '/users/profile', undefined, {
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for fetching dashboard stats
export function useDashboardStats() {
  return useApiQuery<{
    stats: Record<string, number>;
    recentAudits: Array<{
      id: number;
      action: string;
      entityType: string;
      actor?: { phone?: string; firstName?: string; lastName?: string };
      createdAt: string;
    }>;
  }>('admin-dashboard', '/admin/dashboard', undefined, {
    retry: 3,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook for fetching users list with pagination
export function useUsersList(page: number = 1, limit: number = 20, search?: string) {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  };
  if (search) params.search = search;

  return useApiQuery<{
    data: Array<{
      id: number;
      phone: string;
      firstName: string;
      lastName: string;
      role: string;
      isActive: boolean;
      createdAt: string;
      lastLoginAt?: string;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>('users-list', '/admin/users', params, {
    retry: 3,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook for fetching knowledge base entries
export function useKnowledgeBase(page: number = 1, limit: number = 20) {
  return useApiQuery<{
    data: Array<{
      id: number;
      question: string;
      answer: string;
      category: string;
      riskLevel: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>(
    'knowledge-base',
    '/chatbot/knowledge',
    {
      page: page.toString(),
      limit: limit.toString(),
    },
    {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );
}

// Hook for audit logs with filters
export function useAuditLogs(
  page: number = 1,
  limit: number = 20,
  filters?: {
    entityType?: string;
    actorId?: number;
    action?: string;
  },
) {
  const params: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  };

  if (filters?.entityType) params.entityType = filters.entityType;
  if (filters?.actorId) params.actorId = filters.actorId.toString();
  if (filters?.action) params.action = filters.action;

  return useApiQuery<{
    data: Array<{
      id: number;
      action: string;
      entityType: string;
      entityId?: number;
      actor?: { id: number; phone?: string; firstName?: string; lastName?: string };
      oldValue?: unknown;
      newValue?: unknown;
      createdAt: string;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>('audit-logs', '/admin/logs', params, {
    retry: 3,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Mutation hook for user block/unblock
export function useToggleUserBlock() {
  return useApiMutation<{ message: string }, { userId: number; currentStatus: boolean }>(
    '/admin/users/:id/block',
    'PATCH',
    {
      onSuccess: () => {
        toast.success('وضعیت کاربر با موفقیت تغییر کرد');
      },
    },
  );
}

// Mutation hook for creating/updating knowledge entry
export function useUpsertKnowledge() {
  return useApiMutation<
    { message: string; id: number },
    {
      id?: number;
      question: string;
      answer: string;
      category: string;
      riskLevel: string;
      isActive: boolean;
    }
  >('/chatbot/knowledge', 'POST', {
    onSuccess: (data) => {
      toast.success(data.message || 'مورد با موفقیت ذخیره شد');
    },
  });
}

// Mutation hook for file upload
export function useFileUpload() {
  return useMutation<
    {
      url: string;
      originalName: string;
      mimeType: string;
      size: number;
    },
    Error,
    File
  >({
    mutationFn: async (file: File) => {
      try {
        return await api.upload('/upload', file, 'file');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'خطا در آپلود فایل';
        toast.error(message);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('فایل با موفقیت آپلود شد');
    },
  });
}
