import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { FAN_CRED } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: memberships, error: fetchError } = await supabaseAdmin
    .from('memberships')
    .select('id, user_id, locker_room_id, fan_cred_score')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  let updated = 0

  for (const membership of memberships || []) {
    const { data: posts } = await supabaseAdmin
      .from('posts')
      .select('upvote_count, is_raid_post, raid_window_id')
      .eq('author_id', membership.user_id)
      .eq('locker_room_id', membership.locker_room_id)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())

    if (!posts?.length) continue

    const upvoteCred = posts.reduce(
      (sum, p) => sum + p.upvote_count * FAN_CRED.UPVOTE_RECEIVED, 0
    )

    const newScore = membership.fan_cred_score + upvoteCred

    await supabaseAdmin
      .from('memberships')
      .update({ fan_cred_score: newScore })
      .eq('id', membership.id)

    updated++
  }

  return NextResponse.json({ processed: updated })
}
