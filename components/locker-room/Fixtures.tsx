'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingBar } from '@/components/ui/LoadingBar'
import { Calendar } from 'lucide-react'

type FixtureItem = {
  id: string
  home_club_id: string
  away_club_id: string
  kickoff_at: string
  status: string
  home_score: number | null
  away_score: number | null
  home_club: { name: string; short_name: string; primary_color: string; crest: string }
  away_club: { name: string; short_name: string; primary_color: string; crest: string }
}

type FixturesProps = {
  clubId: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000)

  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  if (diffDays < -1) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  if (diffDays === -1) return `Yesterday ${time}`
  if (diffDays === 0) return `Today ${time}`
  if (diffDays === 1) return `Tomorrow ${time}`
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ` ${time}`
}

export function Fixtures({ clubId }: FixturesProps) {
  const router = useRouter()
  const [fixtures, setFixtures] = useState<FixtureItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/football/fixtures?club_id=${clubId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.fixtures?.length) {
            setFixtures(data.fixtures)
            setLoading(false)
            return
          }
        }
      } catch {
      }

      if (cancelled) return

      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, home_club_id, away_club_id, kickoff_at, status, home_score, away_score,
          home_club:clubs!home_club_id(name, short_name, primary_color, crest_url),
          away_club:clubs!away_club_id(name, short_name, primary_color, crest_url)
        `)
        .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
        .eq('status', 'scheduled')
        .order('kickoff_at', { ascending: true })
        .limit(50)

      if (!cancelled) {
        if (!error && data) {
          const mapped = (data as any[]).map((m) => ({
            ...m,
            home_club: { ...m.home_club, crest: m.home_club?.crest_url ?? '' },
            away_club: { ...m.away_club, crest: m.away_club?.crest_url ?? '' },
          }))
          setFixtures(mapped as unknown as FixtureItem[])
        }
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [clubId])

  if (loading) return <div className="flex justify-center py-12"><LoadingBar /></div>

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Calendar className="mb-3 h-10 w-10" style={{ color: 'var(--futfi8-color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--futfi8-color-text-muted)' }}>No fixtures found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {fixtures.map((match) => {
        const isHome = match.home_club_id === clubId
        const isLive = match.status === 'live'
        const isFinished = match.status === 'finished'

        return (
          <button key={match.id} onClick={() => router.push(`/match/${match.id}`)} className="w-full text-left">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center">
                  <img
                    src={match.home_club.crest}
                    alt={match.home_club.short_name}
                    className="h-10 w-10 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <span className="text-[10px] truncate max-w-[70px] text-center" style={{ color: 'var(--futfi8-color-text-muted)' }}>
                  {match.home_club.short_name}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[80px]">
                {isLive && <Badge variant="live">LIVE</Badge>}
                {isFinished && <Badge variant="default">FT</Badge>}
                {!isLive && !isFinished && (
                  <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--futfi8-color-text-muted)' }}>
                    {formatDate(match.kickoff_at)}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${isHome && (isLive || isFinished) ? '' : ''}`} style={{
                    fontFamily: 'var(--futfi8-typography-font-family-display)',
                    color: isHome && isFinished && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score
                      ? 'var(--futfi8-color-state-win)'
                      : isFinished && !isHome && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score
                        ? 'var(--futfi8-color-state-loss)'
                        : 'var(--futfi8-color-text-primary)',
                  }}>
                    {match.home_score ?? '-'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--futfi8-color-text-muted)' }}>:</span>
                  <span className="text-lg font-bold" style={{
                    fontFamily: 'var(--futfi8-typography-font-family-display)',
                    color: !isHome && isFinished && match.away_score !== null && match.home_score !== null && match.away_score > match.home_score
                      ? 'var(--futfi8-color-state-win)'
                      : isFinished && isHome && match.away_score !== null && match.home_score !== null && match.away_score > match.home_score
                        ? 'var(--futfi8-color-state-loss)'
                        : 'var(--futfi8-color-text-primary)',
                  }}>
                    {match.away_score ?? '-'}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center">
                  <img
                    src={match.away_club.crest}
                    alt={match.away_club.short_name}
                    className="h-10 w-10 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <span className="text-[10px] truncate max-w-[70px] text-center" style={{ color: 'var(--futfi8-color-text-muted)' }}>
                  {match.away_club.short_name}
                </span>
              </div>
            </div>
          </Card>
          </button>
        )
      })}
    </div>
  )
}
