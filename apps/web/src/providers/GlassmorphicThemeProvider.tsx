'use client';

import { ReactNode, createContext, useContext, useState, useEffect } from 'react';

// ============================================
// Glassmorphic Theme Context
// ============================================

interface GlassmorphicThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isGlassEffectEnabled: boolean;
  setGlassEffect: (enabled: boolean) => void;
}

const GlassmorphicThemeContext = createContext<GlassmorphicThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  isGlassEffectEnabled: true,
  setGlassEffect: () => {},
});

// ============================================
// Theme Configuration
// ============================================

const themeConfig = {
  dark: {
    backgroundPrimary: '#0B0C0E',
    backgroundSecondary: '#121418',
    backgroundTertiary: '#1A1B20',
    surface: 'rgba(255, 255, 255, 0.03)',
    surfaceElevated: 'rgba(255, 255, 255, 0.05)',
    textPrimary: '#F5F5F7',
    textSecondary: '#9E9E9E',
    textTertiary: '#6B7280',
    borderGold: 'rgba(212, 175, 55, 0.2)',
    borderGoldHover: 'rgba(212, 175, 55, 0.35)',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
  },
  light: {
    backgroundPrimary: '#F5F5F7',
    backgroundSecondary: '#E5E7EB',
    backgroundTertiary: '#D1D5DB',
    surface: 'rgba(255, 255, 255, 0.8)',
    surfaceElevated: 'rgba(255, 255, 255, 0.9)',
    textPrimary: '#0B0C0E',
    textSecondary: '#374151',
    textTertiary: '#6B7280',
    borderGold: 'rgba(212, 175, 55, 0.3)',
    borderGoldHover: 'rgba(212, 175, 55, 0.5)',
    borderSubtle: 'rgba(0, 0, 0, 0.1)',
  },
};

// ============================================
// Glassmorphic Theme Provider Component
// ============================================

export function GlassmorphicThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isGlassEffectEnabled, setGlassEffect] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('ayan-taraz-theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    // Use requestAnimationFrame to avoid synchronous setState
    const frame = requestAnimationFrame(() => {
      setTheme(initialTheme);
      setIsMounted(true);
    });
    
    return () => cancelAnimationFrame(frame);
  }, []);

  // Sync theme with localStorage and document
  useEffect(() => {
    if (!isMounted) return;

    localStorage.setItem('ayan-taraz-theme', theme);
    
    // Update document class and CSS variables
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);

    const currentTheme = themeConfig[theme];
    Object.entries(currentTheme).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });
  }, [theme, isMounted]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('ayan-taraz-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = {
    theme,
    toggleTheme,
    isGlassEffectEnabled,
    setGlassEffect,
  };

  return (
    <GlassmorphicThemeContext.Provider value={value}>
      {children}
    </GlassmorphicThemeContext.Provider>
  );
}

// ============================================
// Custom Hook
// ============================================

export function useGlassmorphicTheme() {
  const context = useContext(GlassmorphicThemeContext);
  if (!context) {
    throw new Error('useGlassmorphicTheme must be used within a GlassmorphicThemeProvider');
  }
  return context;
}

// ============================================
// Glassmorphic Card Component
// ============================================

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'gold';
  hoverEffect?: boolean;
  onClick?: () => void;
}

export function GlassmorphicCard({
  children,
  className = '',
  variant = 'primary',
  hoverEffect = true,
  onClick,
}: GlassmorphicCardProps) {
  const { isGlassEffectEnabled } = useGlassmorphicTheme();

  const variants = {
    primary: 'bg-surface/50 border-border-gold/50',
    secondary: 'bg-surface-elevated/50 border-border-gold/30',
    gold: 'bg-gradient-to-br from-gold-900/20 to-gold-700/20 border-border-gold',
  };

  const baseClasses = `
    rounded-2xl p-6
    backdrop-blur-xl
    transition-all duration-300
    ${variants[variant]}
    ${hoverEffect ? 'hover:border-border-gold-hover hover:shadow-gold-md' : ''}
    ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
  `;

  return (
    <div
      className={`${baseClasses} ${className}`}
      onClick={onClick}
      style={{
        background: isGlassEffectEnabled ? undefined : 'rgba(18, 20, 24, 0.8)',
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// Luxury Button Component
// ============================================

interface LuxuryButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function LuxuryButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
}: LuxuryButtonProps) {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variants = {
    primary: `
      bg-gradient-gold-primary text-text-inverse
      shadow-gold-sm hover:shadow-gold-md
      hover:-translate-y-0.5 active:translate-y-0
    `,
    outline: `
      bg-transparent text-gold-400
      border border-border-gold
      hover:bg-gold-700/10 hover:border-border-gold-hover
    `,
    ghost: `
      bg-transparent text-gold-400
      hover:bg-gold-700/10
    `,
    glass: `
      bg-surface/50 border border-border-gold/50
      backdrop-blur-md
      hover:bg-surface/80 hover:border-border-gold-hover
    `,
  };

  return (
    <button
      type={type}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl font-bold
        transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${sizes[size]}
        ${variants[variant]}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce bounce-delay-0" />
          <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce bounce-delay-150" />
          <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce bounce-delay-300" />
        </div>
      ) : (
        children
      )}
    </button>
  );
}
