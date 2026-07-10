import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: club, error } = await supabaseAdmin
    .from('clubs')
    .select(`
      id, name, short_name, crest_url, primary_color, secondary_color, league_id, api_football_team_id, football_data_team_id, created_at,
      locker_room:locker_rooms!club_id(id, member_count)
    `)
    .eq('id', id)
    .single()

  if (error || !club) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 })
  }

  return NextResponse.json({ club })
}
