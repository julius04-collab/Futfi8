import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { joinClub, getLastClubSwitch, canSwitchClub, switchClub } from '@/lib/membership'

export const dynamic = 'force-dynamic'

// ── SCHEMA ────────────────────────────────────────────────────────────────────
const membershipSchema = z.object({
  locker_room_id: z.string().uuid({ message: 'locker_room_id must be a valid UUID' }),
})

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

  // ── ZOD VALIDATION ──────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' } },
      { status: 400 }
    )
  }

  const parsed = membershipSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    )
  }

  const { locker_room_id } = parsed.data

  const { membership, isNew } = await joinClub(user.id, locker_room_id)

  return NextResponse.json({ membership, isNew }, { status: isNew ? 201 : 200 })
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── ZOD VALIDATION ──────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' } },
      { status: 400 }
    )
  }

  const parsed = membershipSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    )
  }

  const { locker_room_id } = parsed.data

  const lastSwitch = await getLastClubSwitch(user.id)
  const { allowed, daysLeft } = canSwitchClub(lastSwitch)

  if (!allowed) {
    return NextResponse.json(
      { error: { code: 'CLUB_SWITCH_COOLDOWN', message: `Club switch available in ${daysLeft} day(s)` } },
      { status: 429 }
    )
  }

  const membership = await switchClub(user.id, locker_room_id)

  return NextResponse.json({ membership })
}
