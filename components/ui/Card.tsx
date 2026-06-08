import { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean
}

export function Card({ padded = true, children, style, ...props }: CardProps) {
  return (
    <div
      style={{
        background: 'var(--futfi8-color-background-surface)',
        border: '1px solid var(--futfi8-color-border-default)',
        borderRadius: '12px',
        padding: padded ? '16px' : 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
