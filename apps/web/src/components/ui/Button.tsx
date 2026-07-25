'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

// ============================================
// Button Component - Production Grade
// ============================================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // ==========================================
  // VARIANT STYLES
  // ==========================================
  const variantStyles = {
    primary: `
      bg-[#C9A227] text-[#0B0B0C] 
      hover:bg-[#A0781E] active:bg-[#FFA000]
      shadow-[0_2px_8px_0_rgba(201,162,39,0.25)]
      hover:shadow-[0_4px_14px_0_rgba(201,162,39,0.39)]
      hover:-translate-y-px active:translate-y-0
    `,
    outline: `
      bg-transparent text-[#C9A227] border border-[#C9A227]
      hover:bg-[rgba(201,162,39,0.1)] hover:border-[#A0781E]
      active:bg-[rgba(201,162,39,0.2)]
    `,
    ghost: `
      bg-transparent text-[#C9A227]
      hover:bg-[rgba(201,162,39,0.1)]
      active:bg-[rgba(201,162,39,0.2)]
    `,
    text: `
      bg-transparent text-[#C9A227]
      hover:text-[#A0781E] active:text-[#FFA000]
      underline-offset-4 hover:underline
    `,
  };

  // ==========================================
  // SIZE STYLES
  // ==========================================
  const sizeStyles = {
    sm: `px-3 py-1.5 text-sm`,
    md: `px-6 py-2.5 text-base`,
    lg: `px-8 py-3 text-lg`,
    xl: `px-10 py-4 text-xl`,
  };

  // ==========================================
  // BASE STYLES
  // ==========================================
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-bold rounded-md
    transition-all duration-250 ease-in-out
    disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
    focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]
    min-h-[44px] min-w-[44px]
  `;

  // ==========================================
  // FULL WIDTH STYLE
  // ==========================================
  const fullWidthStyle = fullWidth ? 'w-full' : '';

  // ==========================================
  // DISABLED STATE (includes loading)
  // ==========================================
  const isDisabled = disabled || isLoading;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidthStyle}
        ${className}
      `}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {children}
        </span>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

// ============================================
// EXPORT
// ============================================

export { Button };
export type { ButtonProps };
