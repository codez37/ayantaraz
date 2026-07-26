'use client';

import { ReactNode, HTMLAttributes } from 'react';

// ============================================
// Card Component - Production Grade
// Glassmorphism effect with brand colors
// ============================================

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'glass' | 'solid' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  clickable?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  variant = 'glass',
  padding = 'md',
  clickable = false,
  onClick,
  className = '',
  ...props
}: CardProps) {
  // ==========================================
  // PADDING STYLES
  // ==========================================
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  // ==========================================
  // BASE STYLES
  // ==========================================
  const baseStyles = `
    rounded-lg
    transition-all duration-250 ease-in-out
    overflow-hidden
  `;

  // ==========================================
  // CLICKABLE STYLES
  // ==========================================
  const clickableStyles =
    clickable || onClick
      ? `
    cursor-pointer
    active:scale-[0.98]
  `
      : '';

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div
      {...props}
      onClick={onClick}
      className={`
        ${baseStyles}
        ${variant === 'glass' ? 'bg-[linear-gradient(145deg,rgba(28,28,28,0.84),rgba(11,11,12,0.72))]' : ''}
        ${variant === 'glass' ? 'backdrop-blur-[18px]' : ''}
        ${variant === 'glass' ? 'border border-[rgba(201,162,39,0.16)]' : ''}
        ${variant === 'solid' ? 'bg-[#0B0B0C] border border-[#1A1A1A]' : ''}
        ${variant === 'outline' ? 'bg-transparent border border-[#C9A227]/20' : ''}
        ${paddingStyles[padding]}
        ${clickableStyles}
        ${className}
      `}
      role={clickable || onClick ? 'button' : undefined}
      tabIndex={clickable || onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

// ============================================
// Card Header Component
// ============================================

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div {...props} className={`px-4 py-3 border-b border-[#C9A227]/10 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// Card Body Component
// ============================================

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return (
    <div {...props} className={`p-4 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// Card Footer Component
// ============================================

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div {...props} className={`px-4 py-3 border-t border-[#C9A227]/10 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// EXPORT
// ============================================

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export { Card, CardHeader, CardBody, CardFooter };
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps };
