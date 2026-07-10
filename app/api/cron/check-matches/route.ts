import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCompetitionMatches } from '@/lib/football-api/client'
import { RAID_WINDOW_DURATION_MS } from '@/lib/constants'
import { notifyLockerRoomMembers } from '@/lib/notifications'
import type { FootballDataMatch } from '@/lib/football-api/client'

export const dynamic = 'force-dynamic'

async function buildTeamToClubMap(): Promise<Map<number, { id: string; name: string }>> {
  const { data: clubs } = await supabaseAdmin
    .from('clubs')
    .select('id, name, football_data_team_id')

  const map = new Map<number, { id: string; name: string }>()
  if (clubs) {
    for (const c of clubs) {
      if (c.football_data_team_id) map.set(c.football_data_team_id, { id: c.id, name: c.name })
    }
  }
  return map
}

async function getOrCreateMatch(match: FootballDataMatch, clubMap: Map<number, { id: string; name: string }>): Promise<string | null> {
  const apiMatchId = match.id

  const { data: existing } = await supabaseAdmin
    .from('matches')
    .select('id, status')
    .eq('api_match_id', apiMatchId)
    .single()

  if (existing) return existing.id

  const homeClub = clubMap.get(match.homeTeam.id)
  const awayClub = clubMap.get(match.awayTeam.id)
  if (!homeClub || !awayClub) return null

  const { data: created } = await supabaseAdmin
    .from('matches')
    .insert({
      home_club_id: homeClub.id,
      away_club_id: awayClub.id,
      kickoff_at: match.utcDate,
      status: 'scheduled',
      api_match_id: apiMatchId,
    })
    .select('id')
    .single()

  return created?.id ?? null
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const jobStart = Date.now()

  try {
    const today = new Date().toISOString().split('T')[0]

    const finishedMatches = await getCompetitionMatches('FINISHED,AWARDED', today, today)
    const clubMap = await buildTeamToClubMap()

    let processed = 0
    let raidsCreated = 0

    for (const fixture of finishedMatches) {
      const matchId = await getOrCreateMatch(fixture, clubMap)
      if (!matchId) continue

      const { data: match } = await supabaseAdmin
        .from('matches')
        .select('id, status, home_club_id, away_club_id')
        .eq('id', matchId)
        .single()

      if (!match || match.status === 'finished') continue

      const homeScore = fixture.score.fullTime.home ?? 0
      const awayScore = fixture.score.fullTime.away ?? 0

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

      await supabaseAdmin
        .from('locker_rooms')
        .update({
          is_under_raid: true,
          raided_by: winnerClubId,
          raid_expires_at: closesAt.toISOString(),
        })
        .eq('club_id', loserClubId)

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
