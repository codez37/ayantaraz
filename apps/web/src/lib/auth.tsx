'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import type { User, AuthResponse } from '@/types';

// Token storage keys
const ACCESS_TOKEN_KEY = 'ayantaraz_access_token';
const REFRESH_TOKEN_KEY = 'ayantaraz_refresh_token';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (phone: string, code: string) => Promise<boolean>;
  requestOtp: (phone: string, csrfToken?: string) => Promise<string>;
  logout: () => Promise<void>;
  isLoading: boolean;
  tokens: { accessToken?: string; refreshToken?: string };
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage utilities with secure handling
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  
  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
  
  hasTokens: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(ACCESS_TOKEN_KEY) && !!localStorage.getItem(REFRESH_TOKEN_KEY);
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [tokens, setTokensState] = useState<{ accessToken?: string; refreshToken?: string }>({});
  const router = useRouter();

  // Initialize tokens from storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to avoid synchronous setState
      const frame = requestAnimationFrame(() => {
        setTokensState({
          accessToken: localStorage.getItem(ACCESS_TOKEN_KEY) || undefined,
          refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || undefined,
        });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  // Load user profile on mount and token changes
  useEffect(() => {
    const load = async () => {
      try {
        // Try to load profile with existing tokens
        const profile = await api.get<User>('/users/profile', undefined, { 
          redirectOnUnauthorized: false 
        });
        setUser(profile);
      } catch {
        // If profile fetch fails, try to refresh tokens first
        if (tokens.refreshToken) {
          try {
            const refreshResult = await api.post<{ accessToken: string; refreshToken: string }>(
              '/auth/refresh',
              {},
              { redirectOnUnauthorized: false }
            );
            tokenStorage.setTokens(refreshResult.accessToken, refreshResult.refreshToken);
            setTokensState({
              accessToken: refreshResult.accessToken,
              refreshToken: refreshResult.refreshToken,
            });
            
            // Retry profile fetch with new tokens
            const profile = await api.get<User>('/users/profile', undefined, { 
              redirectOnUnauthorized: false 
            });
            setUser(profile);
          } catch {
            // If refresh also fails, clear everything
            tokenStorage.clearTokens();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    };
    load();
  }, [tokens.refreshToken]);

  const setTokens = useCallback((accessToken: string, refreshToken: string): void => {
    tokenStorage.setTokens(accessToken, refreshToken);
    setTokensState({ accessToken, refreshToken });
  }, []);

  const clearTokens = useCallback((): void => {
    tokenStorage.clearTokens();
    setTokensState({});
  }, []);

  const requestOtp = async (phone: string, csrfToken?: string): Promise<string> => {
    const result = await api.post<{ message: string }>('/auth/otp', { phone }, {
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
    });
    return result.message;
  };

  const login = async (phone: string, code: string): Promise<boolean> => {
    const result = await api.post<AuthResponse>('/auth/verify', { phone, code });
    
    // Store tokens persistently
    tokenStorage.setTokens(result.accessToken, result.refreshToken);
    setTokensState({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    setUser(result.user);
    
    return result.isNew;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // proceed with local logout even if API fails
    }
    
    // Clear all auth state
    clearTokens();
    setUser(null);
    setTokensState({});
    
    // Use router for client-side navigation instead of window.location
    router.push('/auth');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      requestOtp,
      logout,
      isLoading,
      tokens,
      setTokens,
      clearTokens,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Export token utilities for use in other modules
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY };
