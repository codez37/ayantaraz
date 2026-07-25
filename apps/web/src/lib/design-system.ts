// ============================================
// DESIGN SYSTEM - MODERN BLACK GOLD PROFESSIONAL THEME
// Ayantaraz Project - Production Ready
// Mobile-First, RTL, Brand Colors: #0A0A0A, #FFD700
// ============================================

// ============================================
// COLOR SYSTEM
// ============================================
export const colors = {
  // Primary Colors - Modern Professional Black
  black: {
    950: '#000000',
    900: '#0A0A0A',  // Primary Black - Modern Deep Black
    800: '#0F0F0F',
    700: '#151515',
    600: '#1C1C1C',
    500: '#252525',
    400: '#303030',
    300: '#3D3D3D',
    200: '#4A4A4A',
    100: '#555555',
    50: '#707070',
  },
  
  // Gold Colors - Modern Professional Gold
  gold: {
    50: '#FFFEF7',
    100: '#FFFAE6',
    200: '#FFF5D0',
    300: '#FFEFB3',
    400: '#FFE899',
    500: '#FFD700',  // Primary Gold - Modern Pure Gold
    600: '#E6C200',
    700: '#CCA800',  // Secondary Gold
    800: '#B38F00',
    900: '#997600',
    950: '#806000',
  },
  
  // Accent Colors
  blue: {
    500: '#1E40AF',
  },
  purple: {
    500: '#7C3AED',
  },
  
  // Semantic Colors
  semantic: {
    primary: '#FFD700',
    secondary: '#CCA800',
    background: '#0A0A0A',
    surface: '#0F0F0F',
    onPrimary: '#0A0A0A',
    onBackground: '#FFFFFF',
    onSurface: '#C0C0C0',
    error: '#DC2626',
    success: '#059669',
    warning: '#D97706',
    info: '#0284C7',
  },
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #FFD700 0%, #CCA800 100%)',
    dark: 'linear-gradient(180deg, #0A0A0A 0%, #0F0F0F 100%)',
    gold: 'linear-gradient(135deg, #FFE899 0%, #FFD700 50%, #CCA800 100%)',
    glass: 'linear-gradient(145deg, rgba(15, 15, 15, 0.85), rgba(10, 10, 10, 0.75))',
    professional: 'linear-gradient(135deg, #FFD700 0%, #FFE899 50%, #FFD700 100%)',
  },
};

// ============================================
// TYPOGRAPHY SYSTEM
// ============================================
export const typography = {
  fontFamily: {
    primary: '"Vazirmatn", "Roboto", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    black: 800,
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
};

// ============================================
// SPACING SYSTEM
// ============================================
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
};

// ============================================
// BORDER RADIUS SYSTEM
// ============================================
export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  default: '0.25rem',
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',   // 24px
  '3xl': '2rem',     // 32px
  full: '9999px',
};

// ============================================
// SHADOW SYSTEM
// ============================================
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  default: '0 1px 3px 0 rgba(0, 0, 0, 0.12)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.08)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.06)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.28)',
  gold: {
    sm: '0 2px 8px 0 rgba(255, 215, 0, 0.28)',
    md: '0 4px 14px 0 rgba(255, 215, 0, 0.42)',
    lg: '0 8px 24px 0 rgba(255, 215, 0, 0.38)',
    xl: '0 12px 32px 0 rgba(255, 215, 0, 0.32)',
  },
  professional: {
    sm: '0 1px 3px 0 rgba(255, 215, 0, 0.18)',
    md: '0 2px 8px 0 rgba(255, 215, 0, 0.24)',
  },
};

// ============================================
// TRANSITION SYSTEM
// ============================================
export const transitions = {
  fast: '140ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '240ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '340ms cubic-bezier(0.4, 0, 0.2, 1)',
  gold: '280ms cubic-bezier(0.4, 0, 0.2, 1)',
  professional: '320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// ============================================
// Z-INDEX SYSTEM
// ============================================
export const zIndex = {
  auto: 'auto',
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
};

// ============================================
// BREAKPOINTS (Mobile-First)
// ============================================
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================
// THEME EXPORT
// ============================================
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
};

export default theme;
