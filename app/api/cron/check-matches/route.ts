import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { PREMIER_LEAGUE_ID, PREMIER_LEAGUE_SEASON, RAID_WINDOW_DURATION_MS } from '@/lib/constants'
import { notifyLockerRoomMembers } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const jobStart = Date.now()

  try {
    const apiKey = process.env.FOOTBALL_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'FOOTBALL_API_KEY not configured' }, { status: 500 })
    }

    const url = `https://v3.football.api-sports.io/fixtures?league=${PREMIER_LEAGUE_ID}&season=${PREMIER_LEAGUE_SEASON}&status=FT`
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    })

    if (!res.ok) {
      throw new Error(`API-Football error: ${res.status} ${res.statusText}`)
    }

    const { response: fixtures } = await res.json()
    let processed = 0
    let raidsCreated = 0

    for (const fixture of fixtures) {
      const apiMatchId = fixture.fixture.id

      const { data: match } = await supabaseAdmin
        .from('matches')
        .select('id, status, home_club_id, away_club_id')
        .eq('api_match_id', apiMatchId)
        .single()

      if (!match || match.status === 'finished') continue

      const homeScore = fixture.goals.home ?? 0
      const awayScore = fixture.goals.away ?? 0

      await supabaseAdmin
        .from('matches')
        .update({ status: 'finished', home_score: homeScore, away_score: awayScore })
        .eq('id', match.id)

      processed++

      if (homeScore === awayScore) continue

      const winnerClubId = homeScore > awayScore ? match.home_club_id : match.away_club_id
      const loserClubId = homeScore > awayScore ? match.away_club_id : match.home_club_id

      const { data: existingWindow } = await supabaseAdmin
        .from('raid_windows')
        .select('id')
        .eq('match_id', match.id)
        .single()

      if (existingWindow) continue

      const now = new Date()
      const closesAt = new Date(now.getTime() + RAID_WINDOW_DURATION_MS)

      const { error: raidError } = await supabaseAdmin
        .from('raid_windows')
        .insert({
          match_id: match.id,
          raiding_club_id: winnerClubId,
          defending_club_id: loserClubId,
          opens_at: now.toISOString(),
          closes_at: closesAt.toISOString(),
          status: 'active',
        })

      if (raidError) {
        console.error('[CRON check-matches] Failed to create raid window:', raidError)
        continue
      }

      const { error: roomUpdateError } = await supabaseAdmin
        .from('locker_rooms')
        .update({
          is_under_raid: true,
          raided_by: winnerClubId,
          raid_expires_at: closesAt.toISOString(),
        })
        .eq('club_id', loserClubId)

      if (roomUpdateError) {
        console.error('[CRON check-matches] Failed to update locker_rooms:', roomUpdateError)
      }

      raidsCreated++

      const { data: defendingRoom } = await supabaseAdmin
        .from('locker_rooms')
        .select('id')
        .eq('club_id', loserClubId)
        .single()

      if (defendingRoom) {
        await notifyLockerRoomMembers(defendingRoom.id, 'raid_opened', match.id)
      }
    }

    return NextResponse.json({
      processed,
      raids_created: raidsCreated,
      duration_ms: Date.now() - jobStart,
    })
  } catch (err) {
    console.error('[CRON check-matches] Error:', err)
    return NextResponse.json({ error: 'Check matches failed' }, { status: 500 })
  }
}
