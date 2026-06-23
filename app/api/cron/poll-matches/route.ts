import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getLiveFixtures, isMatchFinished, isMatchLive } from '@/lib/football-api/client'
import { RAID_WINDOW_DURATION_MS } from '@/lib/constants'
import { notifyLockerRoomMembers } from '@/lib/notifications'
import type { Fixture } from '@/lib/football-api/client'

export const dynamic = 'force-dynamic'

/**
 * Cron: Poll Match Results
 * Schedule: Every 2 minutes during live matches
 * Action: Polls API-Football for live/finished fixtures, updates match status,
 *         and triggers raid windows on decisive results.
 */
export async function GET(req: NextRequest) {
  // 1. Verify cron secret
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const jobStart = Date.now()

  try {
    // 2. Fetch live fixtures from API-Football
    const liveFixtures = await getLiveFixtures()

    // Also check for recently finished matches not yet processed
    const today = new Date().toISOString().split('T')[0]
    const { getFixturesByDate } = await import('@/lib/football-api/client')
    const todayFixtures = await getFixturesByDate(today)

    // Combine and deduplicate
    const allFixtures = new Map<number, Fixture>()
    for (const f of [...liveFixtures, ...todayFixtures]) {
      allFixtures.set(f.fixture.id, f)
    }

    let updatedCount = 0
    let raidWindowsCreated = 0

    for (const fixture of allFixtures.values()) {
      const apiMatchId = fixture.fixture.id
      const statusShort = fixture.fixture.status.short

      // 3. Find this match in our database
      const { data: match } = await supabaseAdmin
        .from('matches')
        .select('id, status, home_club_id, away_club_id')
        .eq('api_match_id', apiMatchId)
        .single()

      if (!match) continue // Match not tracked in our DB

      // 4. Update live matches
      if (isMatchLive(statusShort) && match.status !== 'live') {
        await supabaseAdmin
          .from('matches')
          .update({
            status: 'live',
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
          })
          .eq('id', match.id)
        updatedCount++
      }

      // 5. Update scores for live matches
      if (isMatchLive(statusShort) && match.status === 'live') {
        await supabaseAdmin
          .from('matches')
          .update({
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
          })
          .eq('id', match.id)
      }

      // 6. Detect finished matches and trigger raid windows
      if (isMatchFinished(statusShort) && match.status !== 'finished') {
        const homeScore = fixture.goals.home ?? 0
        const awayScore = fixture.goals.away ?? 0

        await supabaseAdmin
          .from('matches')
          .update({
            status: 'finished',
            home_score: homeScore,
            away_score: awayScore,
          })
          .eq('id', match.id)
        updatedCount++

        // Only create raid window if decisive result (not a draw)
        if (homeScore !== awayScore) {
          const winnerClubId = homeScore > awayScore ? match.home_club_id : match.away_club_id
          const loserClubId = homeScore > awayScore ? match.away_club_id : match.home_club_id

          const now = new Date()
          const closesAt = new Date(now.getTime() + RAID_WINDOW_DURATION_MS)

          // Check if raid window already exists for this match
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
              console.log(`[CRON poll-matches] Raid window created: ${winnerClubId} → ${loserClubId}`)

              // Sync denormalized raid status on locker_rooms
              await supabaseAdmin
                .from('locker_rooms')
                .update({
                  is_under_raid: true,
                  raided_by: winnerClubId,
                  raid_expires_at: closesAt.toISOString(),
                })
                .eq('club_id', loserClubId)

              // Notify defending club's locker room members
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
