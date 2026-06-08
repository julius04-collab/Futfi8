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
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('matches')
    .select(`
      id, home_club_id, away_club_id, kickoff_at, status, home_score, away_score, api_match_id, created_at,
      home_club:clubs!home_club_id(name, short_name, crest_url, primary_color),
      away_club:clubs!away_club_id(name, short_name, crest_url, primary_color)
    `)
    .order('kickoff_at', { ascending: false })

  if (clubId && UUID_REGEX.test(clubId)) {
    query = query.or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
  }

  if (status && ['scheduled', 'live', 'finished'].includes(status)) {
    query = query.eq('status', status)
  }

  const { data: matches, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ matches })
}
