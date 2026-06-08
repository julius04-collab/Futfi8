'use client'

import { useEffect, useState } from 'react'

type RaidCountdownProps = {
  closesAt: string
}

function getRemaining(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'CLOSED'

  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function RaidCountdown({ closesAt }: RaidCountdownProps) {
  const [display, setDisplay] = useState(getRemaining(closesAt))

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplay(getRemaining(closesAt))
    }, 1000)
    return () => clearInterval(timer)
  }, [closesAt])

  return (
    <span
      style={{
        fontFamily: 'var(--futfi8-typography-font-family-label)',
        fontSize: '13px',
        fontWeight: 500,
        letterSpacing: '0.08em',
        color: 'var(--futfi8-color-state-raid-open)',
      }}
    >
      {display}
    </span>
  )
}
