import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: raid, error } = await supabaseAdmin
    .from('raid_windows')
    .select(`
      id, match_id, raiding_club_id, defending_club_id, opens_at, closes_at, status, created_at,
      raiding_club:clubs!raiding_club_id(name, short_name, crest_url, primary_color),
      defending_club:clubs!defending_club_id(name, short_name, crest_url, primary_color),
      match:matches(id, home_score, away_score, kickoff_at, status),
      posts:posts!raid_window_id(
        id, content, upvote_count, created_at,
        author:users!author_id(id, username, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !raid) {
    return NextResponse.json({ error: 'Raid window not found' }, { status: 404 })
  }

  return NextResponse.json({ raid })
}
