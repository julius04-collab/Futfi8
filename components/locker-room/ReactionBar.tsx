'use client'

import { useState } from 'react'
import { ArrowUp, Flame, Laugh, Angry } from 'lucide-react'

const REACTIONS = [
  { type: 'upvote', icon: ArrowUp, label: 'Upvote' },
  { type: 'fire', icon: Flame, label: 'Fire' },
  { type: 'laugh', icon: Laugh, label: 'Laugh' },
  { type: 'rage', icon: Angry, label: 'Rage' },
] as const

type ReactionBarProps = {
  postId: string
  initialReactions: { type: string; user_id: string }[]
  currentUserId: string
  onReact: (postId: string, type: string) => Promise<void>
}

type Counts = Record<string, number>

export function ReactionBar({ postId, initialReactions, currentUserId, onReact }: ReactionBarProps) {
  const [reacting, setReacting] = useState(false)

  const counts: Counts = {}
  for (const r of initialReactions) {
    counts[r.type] = (counts[r.type] || 0) + 1
  }

  const userReactions = new Set(
    initialReactions.filter((r) => r.user_id === currentUserId).map((r) => r.type)
  )

  async function handleReact(type: string) {
    if (reacting) return
    setReacting(true)
    try {
      await onReact(postId, type)
    } finally {
      setReacting(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map(({ type, icon: Icon, label }) => {
        const isActive = userReactions.has(type)
        const count = counts[type] || 0
        return (
          <button
            key={type}
            title={label}
            onClick={() => handleReact(type)}
            disabled={reacting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none',
              background: isActive
                ? 'rgba(155,110,255,0.12)'
                : 'transparent',
              color: isActive
                ? 'var(--futfi8-color-text-accent)'
                : 'var(--futfi8-color-text-muted)',
              cursor: reacting ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s',
              opacity: reacting ? 0.6 : 1,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
