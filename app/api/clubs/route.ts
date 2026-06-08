import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: clubs, error } = await supabaseAdmin
    .from('clubs')
    .select('id, name, short_name, crest_url, primary_color, secondary_color')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ clubs })
}
