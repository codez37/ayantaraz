import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // MODERN BLACK GOLD PROFESSIONAL Palette
        background: {
          primary: '#0A0A0A',
          secondary: '#0F0F0F',
          tertiary: '#151515',
        },
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.04)',
          elevated: 'rgba(255, 255, 255, 0.06)',
        },
        gold: {
          50: '#FFFEF7',
          100: '#FFFAE6',
          200: '#FFF5D0',
          300: '#FFEFB3',
          400: '#FFE899',
          500: '#FFD700', // Primary Gold - Modern Pure Gold
          600: '#E6C200',
          700: '#CCA800', // Secondary Gold
          800: '#B38F00',
          900: '#997600',
          950: '#806000',
        },
        text: {
          primary: '#F8F8F8',
          secondary: '#A0A0A0',
          tertiary: '#707070',
          inverse: '#0A0A0A',
        },
        border: {
          gold: 'rgba(255, 215, 0, 0.22)',
          'gold-hover': 'rgba(255, 215, 0, 0.38)',
          subtle: 'rgba(255, 255, 255, 0.06)',
        },
      },
      fontFamily: {
        sans: ['IRANSansX', 'Anjoman', 'Vazirmatn', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'fluid-xs': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
        'fluid-sm': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
        'fluid-base': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
        'fluid-lg': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
        'fluid-xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
        'fluid-2xl': 'clamp(1.5rem, 1.25rem + 1.25vw, 2rem)',
        'fluid-3xl': 'clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem)',
        'fluid-4xl': 'clamp(2.25rem, 1.75rem + 2.5vw, 3rem)',
        'fluid-5xl': 'clamp(3rem, 2rem + 5vw, 4rem)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'gold-sm': '0 2px 8px 0 rgba(255, 215, 0, 0.28)',
        'gold-md': '0 4px 14px 0 rgba(255, 215, 0, 0.42)',
        'gold-lg': '0 8px 24px 0 rgba(255, 215, 0, 0.38)',
        'gold-xl': '0 12px 32px 0 rgba(255, 215, 0, 0.32)',
        'professional-sm': '0 1px 3px 0 rgba(255, 215, 0, 0.18)',
        'professional-md': '0 2px 8px 0 rgba(255, 215, 0, 0.24)',
      },
      backdropBlur: {
        xs: '3px',
        sm: '5px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      backgroundImage: {
        'gradient-gold-primary': 'linear-gradient(135deg, #FFD700 0%, #CCA800 100%)',
        'gradient-gold-light': 'linear-gradient(135deg, #FFE899 0%, #FFD700 100%)',
        'gradient-gold-dark': 'linear-gradient(135deg, #CCA800 0%, #B38F00 100%)',
        'gradient-professional': 'linear-gradient(135deg, #FFD700 0%, #FFE899 50%, #FFD700 100%)',
        'aurora-professional':
          'radial-gradient(circle at 80% 10%, rgba(255, 215, 0, 0.12), transparent 28rem), radial-gradient(circle at 10% 70%, rgba(205, 168, 0, 0.11), transparent 24rem), linear-gradient(180deg, #0A0A0A 0%, #0F0F0F 48%, #0A0A0A 100%)',
      },
      animation: {
        'aurora-pan': 'aurora-pan 12s ease-in-out infinite',
        'reveal-up': 'reveal-up 650ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'gold-sheen': 'gold-sheen 6s linear infinite',
        'fade-in-up': 'fade-in-up 380ms cubic-bezier(0.4, 0, 0.2, 1) both',
        'fade-in': 'fade-in 280ms cubic-bezier(0.4, 0, 0.2, 1) both',
        'slide-in-right': 'slide-in-right 380ms cubic-bezier(0.4, 0, 0.2, 1) both',
        'scale-in': 'scale-in 280ms cubic-bezier(0.4, 0, 0.2, 1) both',
        'pulse-gold': 'pulse-gold 2.2s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        'professional-fade': 'professional-fade 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'professional-scale': 'professional-scale 360ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      keyframes: {
        'aurora-pan': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)', opacity: '0.72' },
          '50%': { transform: 'translate3d(-2rem, 1rem, 0) scale(1.08)', opacity: '0.95' },
        },
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(24px)', filter: 'blur(8px)' },
          to: { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
        'gold-sheen': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 215, 0, 0.45)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255, 215, 0, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'professional-fade': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'professional-scale': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionDuration: {
        gold: '380ms',
        spring: '480ms',
        professional: '320ms',
      },
      transitionTimingFunction: {
        gold: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        professional: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
