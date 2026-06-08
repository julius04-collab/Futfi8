import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: matches, error } = await supabaseAdmin
    .from('matches')
    .select(`
      id, home_club_id, away_club_id, kickoff_at, status, home_score, away_score,
      home_club:clubs!home_club_id(name, short_name, crest_url, primary_color),
      away_club:clubs!away_club_id(name, short_name, crest_url, primary_color)
    `)
    .eq('status', 'scheduled')
    .gte('kickoff_at', now)
    .lte('kickoff_at', sevenDaysFromNow)
    .order('kickoff_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ matches })
}
