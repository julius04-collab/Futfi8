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

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('*, home_club:clubs(*)')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ profile })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { username, avatar_url, home_club_id } = body

  if (username !== undefined && (typeof username !== 'string' || username.length < 3)) {
    return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
  }

  if (home_club_id !== undefined && !UUID_REGEX.test(home_club_id)) {
    return NextResponse.json({ error: 'Invalid home_club_id' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (username !== undefined) updates.username = username
  if (avatar_url !== undefined) updates.avatar_url = avatar_url
  if (home_club_id !== undefined) updates.home_club_id = home_club_id

  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select('*, home_club:clubs(*)')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
