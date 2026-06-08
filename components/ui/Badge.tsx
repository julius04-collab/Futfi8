import { HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'raid' | 'hot-take' | 'loss' | 'win' | 'live' | 'member'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: 'var(--futfi8-color-background-input)',
    color: 'var(--futfi8-color-text-secondary)',
  },
  raid: {
    background: 'var(--futfi8-color-ui-badge-raid-background)',
    color: 'var(--futfi8-color-ui-badge-raid-text)',
  },
  'hot-take': {
    background: 'var(--futfi8-color-ui-badge-hot-take-background)',
    border: '1px solid var(--futfi8-color-ui-badge-hot-take-border)',
    color: 'var(--futfi8-color-ui-badge-hot-take-text)',
  },
  loss: {
    background: 'var(--futfi8-color-ui-badge-loss-background)',
    border: '1px solid var(--futfi8-color-ui-badge-loss-border)',
    color: 'var(--futfi8-color-ui-badge-loss-text)',
  },
  win: {
    background: 'rgba(76,175,130,0.15)',
    color: 'var(--futfi8-color-state-win)',
  },
  live: {
    background: 'rgba(255,68,68,0.15)',
    color: 'var(--futfi8-color-state-live)',
  },
  member: {
    background: 'var(--futfi8-color-ui-badge-member-background)',
    color: 'var(--futfi8-color-ui-badge-member-text)',
  },
}

export function Badge({ variant = 'default', children, style, ...props }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontFamily: 'var(--futfi8-typography-font-family-body)',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  )
}
