'use client'

import { RaidCountdown } from './RaidCountdown'
import { Badge } from '@/components/ui/Badge'

type RaidBannerProps = {
  raidingClub: { name: string; short_name: string; primary_color: string }
  defendingClub: { name: string; short_name: string; primary_color: string }
  matchScore: { home: number | null; away: number | null }
  closesAt: string
}

export function RaidBanner({ raidingClub, defendingClub, matchScore, closesAt }: RaidBannerProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        background: 'var(--futfi8-color-background-raid-active)',
        borderBottom: '1px solid var(--futfi8-color-border-raid)',
      }}
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Badge variant="raid">RAID</Badge>
          <RaidCountdown closesAt={closesAt} />
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--futfi8-color-text-secondary)' }}>
          <span style={{ color: 'var(--futfi8-color-text-primary)', fontWeight: 600 }}>
            {raidingClub.name}
          </span>
          {' won '}
          <span style={{ color: 'var(--futfi8-color-state-win)', fontWeight: 600 }}>
            {matchScore.home ?? '?'}–{matchScore.away ?? '?'}
          </span>
          {' — raid '}
          <span style={{ color: 'var(--futfi8-color-text-primary)', fontWeight: 600 }}>
            {defendingClub.name}
          </span>
        </p>
      </div>
    </div>
  )
}
