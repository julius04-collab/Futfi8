import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { UUID_REGEX } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const clubId = searchParams.get('club_id')
  const status = searchParams.get('status') || 'active'

  if (!clubId || !UUID_REGEX.test(clubId)) {
    return NextResponse.json({ error: 'Invalid club_id' }, { status: 400 })
  }

  if (!['active', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: raids, error } = await supabaseAdmin
    .from('raid_windows')
    .select(`
      id, match_id, raiding_club_id, defending_club_id, opens_at, closes_at, status, created_at,
      raiding_club:clubs!raiding_club_id(name, short_name, crest_url, primary_color),
      defending_club:clubs!defending_club_id(name, short_name, crest_url, primary_color),
      match:matches(id, home_score, away_score, kickoff_at)
    `)
    .or(`raiding_club_id.eq.${clubId},defending_club_id.eq.${clubId}`)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ raids })
}
