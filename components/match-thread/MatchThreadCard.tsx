'use client'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

type MatchThreadCardProps = {
  homeClub: { name: string; short_name: string; crest_url: string; primary_color: string }
  awayClub: { name: string; short_name: string; crest_url: string; primary_color: string }
  homeScore: number | null
  awayScore: number | null
  kickoffAt: string
  status: string
}

function formatKickoff(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000)

  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  if (diffDays < 0) {
    return `${Math.abs(diffDays)}d ago ${time}`
  }
  if (diffDays === 0) return `Today ${time}`
  if (diffDays === 1) return `Tomorrow ${time}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` ${time}`
}

export function MatchThreadCard({
  homeClub, awayClub, homeScore, awayScore, kickoffAt, status,
}: MatchThreadCardProps) {
  const isLive = status === 'live'
  const isFinished = status === 'finished'

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col items-center gap-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: homeClub.primary_color, color: '#fff' }}
          >
            {homeClub.short_name}
          </div>
          <span className="text-xs truncate max-w-[80px] text-center" style={{ color: 'var(--futfi8-color-text-secondary)' }}>
            {homeClub.short_name}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          {isLive && <Badge variant="live">LIVE</Badge>}
          {isFinished && <Badge variant={homeScore !== null && awayScore !== null && homeScore > awayScore ? 'win' : homeScore !== null && awayScore !== null && awayScore > homeScore ? 'loss' : 'default'}>
            FT
          </Badge>}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{
              fontFamily: 'var(--futfi8-typography-font-family-display)',
              color: isLive ? 'var(--futfi8-color-state-live)' : 'var(--futfi8-color-text-primary)',
            }}>
              {homeScore ?? '-'}
            </span>
            <span className="text-xs" style={{ color: 'var(--futfi8-color-text-muted)' }}>:</span>
            <span className="text-xl font-bold" style={{
              fontFamily: 'var(--futfi8-typography-font-family-display)',
              color: isLive ? 'var(--futfi8-color-state-live)' : 'var(--futfi8-color-text-primary)',
            }}>
              {awayScore ?? '-'}
            </span>
          </div>
          {!isLive && !isFinished && (
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--futfi8-color-text-muted)' }}>
              {formatKickoff(kickoffAt)}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center gap-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: awayClub.primary_color, color: '#fff' }}
          >
            {awayClub.short_name}
          </div>
          <span className="text-xs truncate max-w-[80px] text-center" style={{ color: 'var(--futfi8-color-text-secondary)' }}>
            {awayClub.short_name}
          </span>
        </div>
      </div>
    </Card>
  )
}
