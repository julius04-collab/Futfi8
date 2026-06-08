'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type RaidClubInfo = {
  name: string
  short_name: string
  crest_url: string
  primary_color: string
  secondary_color: string
}

type RaidMatchInfo = {
  id: string
  home_score: number | null
  away_score: number | null
  kickoff_at: string
  home_club_id: string
  away_club_id: string
}

export type ActiveRaid = {
  id: string
  role: 'attacker' | 'defender'
  raiding_club: RaidClubInfo
  defending_club: RaidClubInfo
  match: RaidMatchInfo
  closes_at: string
  hasPosted: boolean
  raiding_room_id: string
  defending_room_id: string
}

export function useActiveRaid(clubId: string, currentUserId: string | null) {
  const [raid, setRaid] = useState<ActiveRaid | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false)
      return
    }

    let cancelled = false

    supabase
      .from('raid_windows')
      .select(`
        id, raiding_club_id, defending_club_id, closes_at, opens_at, status,
        raiding_club:clubs!raiding_club_id(name, short_name, crest_url, primary_color, secondary_color),
        defending_club:clubs!defending_club_id(name, short_name, crest_url, primary_color, secondary_color),
        match:matches(id, home_score, away_score, kickoff_at, home_club_id, away_club_id)
      `)
      .eq('status', 'active')
      .or(`raiding_club_id.eq.${clubId},defending_club_id.eq.${clubId}`)
      .single()
      .then(async ({ data, error }) => {
        if (cancelled || error || !data) {
          setLoading(false)
          return
        }

        const isAttacker = (data as any).raiding_club_id === clubId
        const role = isAttacker ? 'attacker' : 'defender'

        // Get both locker room IDs
        const [{ data: raidingRoom }, { data: defendingRoom }] = await Promise.all([
          supabase.from('locker_rooms').select('id').eq('club_id', (data as any).raiding_club_id).single(),
          supabase.from('locker_rooms').select('id').eq('club_id', (data as any).defending_club_id).single(),
        ])

        // Check if attacker has already posted
        let hasPosted = false
        if (isAttacker) {
          const { data: existing } = await supabase
            .from('posts')
            .select('id')
            .eq('author_id', currentUserId)
            .eq('raid_window_id', data.id)
            .single()
          hasPosted = !!existing
        }

        if (!cancelled) {
          setRaid({
            id: data.id,
            role,
            raiding_club: (data as any).raiding_club,
            defending_club: (data as any).defending_club,
            match: (data as any).match,
            closes_at: data.closes_at,
            hasPosted,
            raiding_room_id: raidingRoom?.id ?? '',
            defending_room_id: defendingRoom?.id ?? '',
          })
          setLoading(false)
        }
      })

    // Subscribe to raid window changes
    const channel = supabase
      .channel(`raid:${clubId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raid_windows', filter: `raiding_club_id=eq.${clubId}` },
        () => { setRaid(null) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raid_windows', filter: `defending_club_id=eq.${clubId}` },
        () => { setRaid(null) }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [clubId, currentUserId])

  return { raid, loading }
}
