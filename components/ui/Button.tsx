'use client'

import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--futfi8-color-ui-cta-primary)',
    color: 'var(--futfi8-color-ui-cta-text)',
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--futfi8-color-text-secondary)',
    border: '1px solid var(--futfi8-color-border-default)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--futfi8-color-text-secondary)',
    border: 'none',
  },
  danger: {
    background: 'rgba(255,107,107,0.15)',
    color: 'var(--futfi8-color-state-loss)',
    border: '1px solid rgba(255,107,107,0.3)',
  },
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px' },
  md: { padding: '10px 16px', fontSize: '14px', borderRadius: '8px' },
  lg: { padding: '14px 20px', fontSize: '16px', borderRadius: '10px' },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        transition: 'opacity 0.15s',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
