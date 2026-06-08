import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { MATCH_THREAD_PRE_OPEN_MINS, MATCH_THREAD_POST_CLOSE_MINS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * Cron: Open Match Threads
 * Schedule: Every 5 minutes
 * Action: Auto-creates match threads 30 minutes before kick-off for both
 *         home and away locker rooms.
 */
export async function GET(req: NextRequest) {
  // 1. Verify cron secret
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const jobStart = Date.now()

  try {
    const now = new Date()
    const preOpenWindow = new Date(now.getTime() + MATCH_THREAD_PRE_OPEN_MINS * 60 * 1000)

    // 2. Find scheduled matches kicking off within the next 30 minutes
    const { data: upcomingMatches, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, home_club_id, away_club_id, kickoff_at')
      .eq('status', 'scheduled')
      .lte('kickoff_at', preOpenWindow.toISOString())
      .gte('kickoff_at', now.toISOString())

    if (matchError) {
      console.error('[CRON open-threads] Match fetch error:', matchError)
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
    }

    if (!upcomingMatches?.length) {
      return NextResponse.json({
        created: 0,
        duration_ms: Date.now() - jobStart,
      })
    }

    let created = 0

    for (const match of upcomingMatches) {
      // Get locker rooms for both clubs
      const { data: lockerRooms } = await supabaseAdmin
        .from('locker_rooms')
        .select('id, club_id')
        .in('club_id', [match.home_club_id, match.away_club_id])

      if (!lockerRooms) continue

      const kickoff = new Date(match.kickoff_at)
      const opensAt = new Date(kickoff.getTime() - MATCH_THREAD_PRE_OPEN_MINS * 60 * 1000)
      const closesAt = new Date(kickoff.getTime() + MATCH_THREAD_POST_CLOSE_MINS * 60 * 1000)

      for (const room of lockerRooms) {
        // Check if thread already exists
        const { data: existing } = await supabaseAdmin
          .from('match_threads')
          .select('id')
          .eq('match_id', match.id)
          .eq('locker_room_id', room.id)
          .single()

        if (existing) continue

        const { error: insertError } = await supabaseAdmin
          .from('match_threads')
          .insert({
            match_id: match.id,
            locker_room_id: room.id,
            opens_at: opensAt.toISOString(),
            closes_at: closesAt.toISOString(),
            status: 'active',
          })

        if (!insertError) {
          created++
        } else {
          console.error('[CRON open-threads] Insert error:', insertError)
        }
      }
    }

    const duration = Date.now() - jobStart
    console.log(`[CRON open-threads] Created ${created} match threads in ${duration}ms`)

    return NextResponse.json({ created, duration_ms: duration })
  } catch (err) {
    console.error('[CRON open-threads] Error:', err)
    return NextResponse.json({ error: 'Thread creation failed' }, { status: 500 })
  }
}
