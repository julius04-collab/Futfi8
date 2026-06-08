import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { UUID_REGEX } from '@/lib/constants'
import { joinClub, getLastClubSwitch, canSwitchClub, switchClub } from '@/lib/membership'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: memberships } = await supabaseAdmin
    .from('memberships')
    .select('*, locker_room:locker_rooms(id, club_id, member_count)')
    .eq('user_id', user.id)

  return NextResponse.json({ memberships })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { locker_room_id } = body

  if (!locker_room_id || !UUID_REGEX.test(locker_room_id)) {
    return NextResponse.json({ error: 'Invalid locker_room_id' }, { status: 400 })
  }

  const { membership, isNew } = await joinClub(user.id, locker_room_id)

  return NextResponse.json({ membership, isNew }, { status: isNew ? 201 : 200 })
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { locker_room_id } = body

  if (!locker_room_id || !UUID_REGEX.test(locker_room_id)) {
    return NextResponse.json({ error: 'Invalid locker_room_id' }, { status: 400 })
  }

  const lastSwitch = await getLastClubSwitch(user.id)
  const { allowed, daysLeft } = canSwitchClub(lastSwitch)

  if (!allowed) {
    return NextResponse.json(
      { error: `Club switch available in ${daysLeft} day(s)` },
      { status: 429 }
    )
  }

  const membership = await switchClub(user.id, locker_room_id)

  return NextResponse.json({ membership })
}
