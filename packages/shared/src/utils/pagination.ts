import type { PaginationMeta, PaginatedResult } from '../types/pagination.types';

export function paginatedResult<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function paginationParams(
  page?: number,
  limit?: number,
): { skip: number; take: number; page: number; limit: number } {
  const p = Math.max(1, page || 1);
  const l = Math.min(100, Math.max(1, limit || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}
