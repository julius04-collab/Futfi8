import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date().toISOString()

  const { data: expiredThreads, error: fetchError } = await supabaseAdmin
    .from('match_threads')
    .select('id')
    .eq('status', 'active')
    .lte('closes_at', now)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!expiredThreads?.length) {
    return NextResponse.json({ closed: 0 })
  }

  const ids = expiredThreads.map(t => t.id)

  const { error: updateError } = await supabaseAdmin
    .from('match_threads')
    .update({ status: 'closed' })
    .in('id', ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ closed: ids.length })
}
