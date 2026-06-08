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

  const { data: match, error } = await supabaseAdmin
    .from('matches')
    .select(`
      id, home_club_id, away_club_id, kickoff_at, status, home_score, away_score, api_match_id, created_at,
      home_club:clubs!home_club_id(name, short_name, crest_url, primary_color),
      away_club:clubs!away_club_id(name, short_name, crest_url, primary_color)
    `)
    .eq('id', id)
    .single()

  if (error || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  return NextResponse.json({ match })
}
