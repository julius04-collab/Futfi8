'use client'

import { InputHTMLAttributes, TextareaHTMLAttributes, useRef } from 'react'

type InputProps = {
  multiline?: boolean
  maxLength?: number
} & (InputHTMLAttributes<HTMLInputElement> | TextareaHTMLAttributes<HTMLTextAreaElement>)

export function Input({
  multiline = false,
  maxLength,
  style,
  ...props
}: InputProps) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const baseStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--futfi8-color-background-input)',
    color: 'var(--futfi8-color-text-primary)',
    border: '1px solid var(--futfi8-color-border-default)',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    resize: multiline ? 'vertical' : 'none',
    fontFamily: 'inherit',
    ...style,
  }

  if (multiline) {
    return (
      <textarea
        ref={ref as React.Ref<HTMLTextAreaElement>}
        maxLength={maxLength}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--futfi8-color-border-accent)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--futfi8-color-border-default)'
        }}
        style={baseStyle}
        {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    )
  }

  return (
    <input
      ref={ref as React.Ref<HTMLInputElement>}
      maxLength={maxLength}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--futfi8-color-border-accent)'
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--futfi8-color-border-default)'
      }}
      style={baseStyle}
      {...(props as InputHTMLAttributes<HTMLInputElement>)}
    />
  )
}
