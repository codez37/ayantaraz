const isBrowser = typeof window !== 'undefined';

// Use runtime environment variables for API base URL
// In Docker production: api service is available at 'api:3001'
// In development: proxy to localhost:3001
// In browser: use relative /api path (handled by nginx proxy)
const API_BASE = isBrowser
  ? '/api'
  : process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:3001/api';

const PUBLIC_PATHS = ['/csrf', '/auth/otp', '/auth/verify', '/auth/refresh', '/auth/logout', '/health'];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path.includes(p));
}

// CSRF token storage
let csrfTokenCache: string | null = null;

export const csrfStorage = {
  get: (): string | null => csrfTokenCache,
  set: (token: string): void => {
    csrfTokenCache = token;
  },
  clear: (): void => {
    csrfTokenCache = null;
  },
};

type ApiRequestOptions = RequestInit & {
  redirectOnUnauthorized?: boolean;
  skipCsrf?: boolean;
};

// Maximum retry attempts for token refresh
const MAX_REFRESH_RETRIES = 3;

class ApiClient {
  private refreshInProgress: Promise<string> | null = null;

  private async getCsrfToken(): Promise<string | null> {
    if (csrfTokenCache) {
      return csrfTokenCache;
    }

    if (isBrowser && typeof window !== 'undefined') {
      // Try to get from cookie first
      const cookies = document.cookie;
      const csrfCookie = cookies.split(';').find((c) => c.trim().startsWith('csrfToken='));
      if (csrfCookie) {
        const token = csrfCookie.split('=')[1];
        if (token) {
          csrfTokenCache = token;
          return token;
        }
      }
    }

    // Fetch fresh CSRF token
    try {
      const response = await fetch(`${API_BASE}/csrf`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        csrfTokenCache = data.token;
        return data.token;
      }
    } catch {
      // Silently fail - CSRF is optional for public endpoints
    }

    return null;
  }

  private async handle401Error(path: string, options: ApiRequestOptions = {}): Promise<Response> {
    // Don't retry for public paths
    if (isPublicPath(path)) {
      throw new Error('Unauthorized');
    }

    // Only one refresh at a time
    if (this.refreshInProgress) {
      const newAccessToken = await this.refreshInProgress;

      // Retry original request with new token
      const headers = new Headers(options.headers as Record<string, string>);
      headers.set('Authorization', `Bearer ${newAccessToken}`);

      return fetch(`${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }

    // Start refresh process
    this.refreshInProgress = this.performTokenRefresh();

    try {
      const newAccessToken = await this.refreshInProgress;

      // Retry original request with new token
      const headers = new Headers(options.headers as Record<string, string>);
      headers.set('Authorization', `Bearer ${newAccessToken}`);

      const response = await fetch(`${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      return response;
    } finally {
      this.refreshInProgress = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    // Get refresh token from storage
    let refreshToken: string | null = null;

    if (isBrowser && typeof window !== 'undefined') {
      refreshToken = localStorage.getItem('ayantaraz_refresh_token');
    }

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();

    // Store new tokens
    if (isBrowser && typeof window !== 'undefined') {
      localStorage.setItem('ayantaraz_access_token', data.accessToken);
      localStorage.setItem('ayantaraz_refresh_token', data.refreshToken || refreshToken);
    }

    return data.accessToken;
  }

  private async addCsrfHeader(headers: Headers, method: string): Promise<void> {
    // Only add CSRF token to mutating methods
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(method.toUpperCase())) {
      return;
    }

    // Skip if explicitly told to skip
    // Get CSRF token
    const csrfToken = await this.getCsrfToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  private async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

    const headers = new Headers({
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    });

    // Add Authorization header if token exists
    if (isBrowser && typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('ayantaraz_access_token');
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
    }

    // Add CSRF token for mutating requests
    if (!options.skipCsrf) {
      await this.addCsrfHeader(headers, options.method || 'GET');
    }

    const { redirectOnUnauthorized = true, ...fetchOptions } = options;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });

      // Handle 401 Unauthorized
      if (response.status === 401 && !isPublicPath(path)) {
        if (isBrowser) {
          // Try to refresh token and retry
          const retryResponse = await this.handle401Error(path, options);

          if (retryResponse.ok) {
            return retryResponse.json();
          } else if (retryResponse.status === 401) {
            // If refresh also failed, redirect to auth
            if (redirectOnUnauthorized) {
              // Use window.location only as last resort
              if (typeof window !== 'undefined') {
                window.location.href = '/auth';
              }
            }
            throw new Error('Session expired. Please login again.');
          } else {
            // Handle other errors from retry
            const error = await retryResponse.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(Array.isArray(error.message) ? error.message[0] : error.message);
          }
        }
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(Array.isArray(error.message) ? error.message[0] : error.message);
      }

      return response.json();
    } catch (error) {
      // Enhanced error handling for network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.');
      }

      // Re-throw known errors
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('خطایی ناشناخته رخ داد');
    }
  }

  get<T>(
    path: string,
    params?: Record<string, string>,
    extra?: { redirectOnUnauthorized?: boolean; skipCsrf?: boolean },
  ): Promise<T> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(`${path}${query}`, {
      redirectOnUnauthorized: extra?.redirectOnUnauthorized,
      skipCsrf: extra?.skipCsrf,
    });
  }

  post<T = unknown>(
    path: string,
    body?: Record<string, unknown>,
    extra?: { headers?: Record<string, string>; redirectOnUnauthorized?: boolean; skipCsrf?: boolean },
  ): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: extra?.headers,
      redirectOnUnauthorized: extra?.redirectOnUnauthorized,
      skipCsrf: extra?.skipCsrf,
    });
  }

  patch<T = unknown>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  put<T = unknown>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  async upload<T = unknown>(
    path: string,
    file: File,
    fieldName = 'file',
    onProgress?: (progress: number) => void,
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

    // Add CSRF token for upload
    const csrfToken = await this.getCsrfToken();
    const headers: Record<string, string> = {};
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include',
    });

    if (response.status === 401 && !isPublicPath(path)) {
      if (isBrowser && typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(Array.isArray(error.message) ? error.message[0] : error.message);
    }

    return response.json();
  }
}

export const api = new ApiClient();
