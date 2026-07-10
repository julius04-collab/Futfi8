import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getCompetitionMatches, isMatchFinished, isMatchLive } from '@/lib/football-api/client'
import { RAID_WINDOW_DURATION_MS } from '@/lib/constants'
import { notifyLockerRoomMembers } from '@/lib/notifications'
import type { FootballDataMatch } from '@/lib/football-api/client'

export const dynamic = 'force-dynamic'

async function buildTeamToClubMap(): Promise<Map<number, { id: string }>> {
  const { data: clubs } = await supabaseAdmin
    .from('clubs')
    .select('id, football_data_team_id')

  const map = new Map<number, { id: string }>()
  if (clubs) {
    for (const c of clubs) {
      if (c.football_data_team_id) map.set(c.football_data_team_id, { id: c.id })
    }
  }
  return map
}

async function ensureMatchExists(fixture: FootballDataMatch, clubMap: Map<number, { id: string }>): Promise<string | null> {
  const apiMatchId = fixture.id

  const { data: existing } = await supabaseAdmin
    .from('matches')
    .select('id')
    .eq('api_match_id', apiMatchId)
    .single()

  if (existing) return existing.id

  const homeClub = clubMap.get(fixture.homeTeam.id)
  const awayClub = clubMap.get(fixture.awayTeam.id)
  if (!homeClub || !awayClub) return null

  const { data: created } = await supabaseAdmin
    .from('matches')
    .insert({
      home_club_id: homeClub.id,
      away_club_id: awayClub.id,
      kickoff_at: fixture.utcDate,
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

    const [liveMatches, todayFinished] = await Promise.all([
      getCompetitionMatches('IN_PLAY,PAUSED'),
      getCompetitionMatches('FINISHED,AWARDED', today, today),
    ])

    const allFixtures = new Map<number, FootballDataMatch>()
    for (const f of [...liveMatches, ...todayFinished]) {
      allFixtures.set(f.id, f)
    }

    const clubMap = await buildTeamToClubMap()

    let updatedCount = 0
    let raidWindowsCreated = 0

    for (const fixture of allFixtures.values()) {
      const matchId = await ensureMatchExists(fixture, clubMap)
      if (!matchId) continue

      const { data: match } = await supabaseAdmin
        .from('matches')
        .select('id, status, home_club_id, away_club_id')
        .eq('id', matchId)
        .single()

      if (!match) continue

      if (isMatchLive(fixture.status) && match.status !== 'live') {
        await supabaseAdmin
          .from('matches')
          .update({
            status: 'live',
            home_score: fixture.score.fullTime.home,
            away_score: fixture.score.fullTime.away,
          })
          .eq('id', match.id)
        updatedCount++
      }

      if (isMatchLive(fixture.status) && match.status === 'live') {
        await supabaseAdmin
          .from('matches')
          .update({
            home_score: fixture.score.fullTime.home,
            away_score: fixture.score.fullTime.away,
          })
          .eq('id', match.id)
      }

      if (isMatchFinished(fixture.status) && match.status !== 'finished') {
        const homeScore = fixture.score.fullTime.home ?? 0
        const awayScore = fixture.score.fullTime.away ?? 0

        await supabaseAdmin
          .from('matches')
          .update({
            status: 'finished',
            home_score: homeScore,
            away_score: awayScore,
          })
          .eq('id', match.id)
        updatedCount++

        if (homeScore !== awayScore) {
          const winnerClubId = homeScore > awayScore ? match.home_club_id : match.away_club_id
          const loserClubId = homeScore > awayScore ? match.away_club_id : match.home_club_id

          const now = new Date()
          const closesAt = new Date(now.getTime() + RAID_WINDOW_DURATION_MS)

          const { data: existingWindow } = await supabaseAdmin
            .from('raid_windows')
            .select('id')
            .eq('match_id', match.id)
            .single()

          if (!existingWindow) {
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

            if (!raidError) {
              raidWindowsCreated++

              await supabaseAdmin
                .from('locker_rooms')
                .update({
                  is_under_raid: true,
                  raided_by: winnerClubId,
                  raid_expires_at: closesAt.toISOString(),
                })
                .eq('club_id', loserClubId)

              const { data: defendingRoom } = await supabaseAdmin
                .from('locker_rooms')
                .select('id')
                .eq('club_id', loserClubId)
                .single()
              if (defendingRoom) {
                await notifyLockerRoomMembers(defendingRoom.id, 'raid_opened', match.id)
              }
            } else {
              console.error('[CRON poll-matches] Failed to create raid window:', raidError)
            }
          }
        }
      }
    }

    const duration = Date.now() - jobStart
    console.log(`[CRON poll-matches] Polled ${allFixtures.size} fixtures, updated ${updatedCount}, raids created ${raidWindowsCreated} in ${duration}ms`)

    return NextResponse.json({
      polled: allFixtures.size,
      updated: updatedCount,
      raids_created: raidWindowsCreated,
      duration_ms: duration,
    })
  } catch (err) {
    console.error('[CRON poll-matches] Error:', err)
    return NextResponse.json(
      { error: 'Match polling failed' },
      { status: 500 }
    )
  }
}
