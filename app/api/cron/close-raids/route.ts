import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Cron: Close Raid Windows
 * Schedule: Every 5 minutes
 * Action: Seals expired raid windows (2-hour limit), marks raid posts as
 *         archived, and triggers Fan Cred recalculation for participants.
 */
export async function GET(req: NextRequest) {
  // 1. Verify cron secret
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const jobStart = Date.now()
  const now = new Date().toISOString()

  try {
    // 2. Find expired raid windows
    const { data: expiredWindows, error: fetchError } = await supabaseAdmin
      .from('raid_windows')
      .select('id, match_id, raiding_club_id, defending_club_id')
      .eq('status', 'active')
      .lte('closes_at', now)

    if (fetchError) {
      console.error('[CRON close-raids] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
    }

    if (!expiredWindows?.length) {
      return NextResponse.json({
        closed: 0,
        duration_ms: Date.now() - jobStart,
      })
    }

    const windowIds = expiredWindows.map((w) => w.id)

    // 3. Close the raid windows
    const { error: closeError } = await supabaseAdmin
      .from('raid_windows')
      .update({ status: 'closed' })
      .in('id', windowIds)

    if (closeError) {
      console.error('[CRON close-raids] Close error:', closeError)
    }

    // 4. Archive raid posts from these windows
    const { error: archiveError } = await supabaseAdmin
      .from('posts')
      .update({ archived: true })
      .in('raid_window_id', windowIds)

    if (archiveError) {
      console.error('[CRON close-raids] Archive error:', archiveError)
    }

    // 5. Recalculate Fan Cred for raid participants
    for (const window of expiredWindows) {
      // Get all raid posts for this window
      const { data: raidPosts } = await supabaseAdmin
        .from('posts')
        .select('id, author_id, upvote_count')
        .eq('raid_window_id', window.id)
        .eq('type', 'raid')

      if (!raidPosts?.length) continue

      // Award Fan Cred for successful raids (posts with upvotes)
      for (const post of raidPosts) {
        if (post.upvote_count > 0) {
          // Get the raider's membership in their home locker room
          const { data: raidingRoom } = await supabaseAdmin
            .from('locker_rooms')
            .select('id')
            .eq('club_id', window.raiding_club_id)
            .single()

          if (raidingRoom) {
            await supabaseAdmin.rpc('increment_fan_cred', {
              p_user_id: post.author_id,
              p_locker_room_id: raidingRoom.id,
              p_amount: 5,
            }).then(({ error }) => {
              if (error) {
                // Fallback: direct update if RPC not available
                supabaseAdmin
                  .from('memberships')
                  .update({
                    fan_cred_score: post.upvote_count * 2,
                  })
                  .eq('user_id', post.author_id)
                  .eq('locker_room_id', raidingRoom.id)
              }
            })
          }
        }
      }
    }

    // 6. Close match threads that have expired
    const { error: threadCloseError } = await supabaseAdmin
      .from('match_threads')
      .update({ status: 'closed' })
      .eq('status', 'active')
      .lte('closes_at', now)

    if (threadCloseError) {
      console.error('[CRON close-raids] Thread close error:', threadCloseError)
    }

    const duration = Date.now() - jobStart
    console.log(
      `[CRON close-raids] Closed ${expiredWindows.length} windows in ${duration}ms`
    )

    return NextResponse.json({
      closed: expiredWindows.length,
      duration_ms: duration,
    })
  } catch (err) {
    console.error('[CRON close-raids] Error:', err)
    return NextResponse.json(
      { error: 'Raid closure failed' },
      { status: 500 }
    )
  }
}
