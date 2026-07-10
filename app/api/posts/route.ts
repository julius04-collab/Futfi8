import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { MAX_POST_LENGTH, MAX_RAID_POST_LENGTH, UUID_REGEX, TOXICITY_THRESHOLD_STANDARD } from '@/lib/constants'
import { moderateContent } from '@/lib/huggingface/client'

export const dynamic = 'force-dynamic'

// ── SCHEMA ────────────────────────────────────────────────────────────────────
const createPostSchema = z.object({
  locker_room_id: z.string().uuid({ message: 'locker_room_id must be a valid UUID' }),
  content: z
    .string()
    .min(1, { message: 'Content cannot be empty' })
    .max(MAX_POST_LENGTH, { message: `Content exceeds ${MAX_POST_LENGTH} characters` }),
  type: z.enum(['standard', 'raid', 'match_thread', 'hot_take'], {
    message: 'type must be one of: standard, raid, match_thread, hot_take',
  }),
  match_id: z.string().uuid().optional().nullable(),
  raid_window_id: z.string().uuid().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const lockerRoomId = searchParams.get('locker_room_id')
  const type = searchParams.get('type')
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)
  const offset = Number(searchParams.get('offset')) || 0

  if (!lockerRoomId || !UUID_REGEX.test(lockerRoomId)) {
    return NextResponse.json({ error: 'Invalid locker_room_id' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('posts')
    .select(`
      id, content, type, upvote_count, is_raid_post, archived, created_at,
      author:users!author_id(id, username, avatar_url),
      match:matches(id, home_club_id, away_club_id, home_score, away_score, status)
    `)
    .eq('locker_room_id', lockerRoomId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type && ['standard', 'raid', 'match_thread', 'hot_take'].includes(type)) {
    query = query.eq('type', type)
  }

  const { data: posts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts, limit, offset })
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

  const parsed = createPostSchema.safeParse(body)
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

  const { locker_room_id, content, type, match_id, raid_window_id } = parsed.data

  // Raid posts may be longer — enforce separately after schema validation
  if (type === 'raid' && content.length > MAX_RAID_POST_LENGTH) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Raid post content exceeds ${MAX_RAID_POST_LENGTH} characters`,
        },
      },
      { status: 400 }
    )
  }

  // Content moderation
  let toxicityScore: number | null = null
  let isFlagged = false
  try {
    const result = await moderateContent(content)
    toxicityScore = result.toxicity.toxic
    isFlagged = result.isFlagged
    if (isFlagged) {
      return NextResponse.json({ error: 'Content violates community guidelines' }, { status: 422 })
    }
  } catch {
    // If moderation service is unavailable, allow post through (fail open)
  }

  // Verify user's home_club_id matches this locker room's club_id
  const [{ data: posterUser }, { data: targetRoom }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('home_club_id')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('locker_rooms')
      .select('club_id')
      .eq('id', locker_room_id)
      .single(),
  ])

  if (!posterUser?.home_club_id || !targetRoom) {
    return NextResponse.json({ error: 'Cannot post in this locker room' }, { status: 403 })
  }

  if (posterUser.home_club_id !== targetRoom.club_id) {
    return NextResponse.json({ error: 'Cannot post in another club\'s locker room' }, { status: 403 })
  }

  // Verify user is a member of this locker room
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('locker_room_id', locker_room_id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this locker room' }, { status: 403 })
  }

  const { data: post, error } = await supabaseAdmin
    .from('posts')
    .insert({
      author_id: user.id,
      locker_room_id,
      content,
      type,
      match_id: match_id || null,
      is_raid_post: type === 'raid',
      raid_window_id: raid_window_id || null,
      toxicity_score: toxicityScore,
      is_flagged: isFlagged,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Duplicate post' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post }, { status: 201 })
}
