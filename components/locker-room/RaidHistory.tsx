'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingBar } from '@/components/ui/LoadingBar'
import { Swords } from 'lucide-react'

type RaidHistoryItem = {
  id: string
  opens_at: string
  closes_at: string
  status: string
  raiding_club: { name: string; short_name: string; primary_color: string }
  defending_club: { name: string; short_name: string; primary_color: string }
  match: { home_score: number | null; away_score: number | null }
}

type RaidHistoryProps = {
  clubId: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function RaidHistory({ clubId }: RaidHistoryProps) {
  const [raids, setRaids] = useState<RaidHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('raid_windows')
      .select(`
        id, opens_at, closes_at, status,
        raiding_club:clubs!raiding_club_id(name, short_name, primary_color),
        defending_club:clubs!defending_club_id(name, short_name, primary_color),
        match:matches(id, home_score, away_score)
      `)
      .or(`raiding_club_id.eq.${clubId},defending_club_id.eq.${clubId}`)
      .order('opens_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setRaids(data as unknown as RaidHistoryItem[])
        setLoading(false)
      })
  }, [clubId])

  if (loading) return <div className="flex justify-center py-12"><LoadingBar /></div>

  if (raids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Swords className="mb-3 h-10 w-10" style={{ color: 'var(--futfi8-color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--futfi8-color-text-muted)' }}>No raids yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {raids.map((raid) => {
        const isAttacker = raid.raiding_club.primary_color !== undefined // simplified, just show both sides
        return (
          <Card key={raid.id}>
            <div className="flex items-center gap-2 mb-2">
              {raid.status === 'active' && <Badge variant="raid">ACTIVE</Badge>}
              <span className="text-xs" style={{ color: 'var(--futfi8-color-text-muted)' }}>
                {formatDate(raid.opens_at)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--futfi8-color-text-primary)' }}>
                  {raid.raiding_club.short_name}
                </p>
                <span className="text-xs" style={{ color: 'var(--futfi8-color-text-muted)' }}>raided</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold" style={{ color: 'var(--futfi8-color-state-win)' }}>
                  {raid.match?.home_score ?? '?'}
                </span>
                <span className="text-xs" style={{ color: 'var(--futfi8-color-text-muted)' }}>:</span>
                <span className="text-lg font-bold" style={{ color: 'var(--futfi8-color-state-loss)' }}>
                  {raid.match?.away_score ?? '?'}
                </span>
              </div>
              <div className="flex-1 text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--futfi8-color-text-primary)' }}>
                  {raid.defending_club.short_name}
                </p>
                <span className="text-xs" style={{ color: 'var(--futfi8-color-text-muted)' }}>defended</span>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
