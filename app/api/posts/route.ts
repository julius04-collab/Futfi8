import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { MAX_POST_LENGTH, MAX_RAID_POST_LENGTH, UUID_REGEX, TOXICITY_THRESHOLD_STANDARD } from '@/lib/constants'
import { moderateContent } from '@/lib/huggingface/client'

export const dynamic = 'force-dynamic'

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

  const body = await req.json()
  const { locker_room_id, content, type, match_id, raid_window_id } = body

  if (!locker_room_id || !UUID_REGEX.test(locker_room_id)) {
    return NextResponse.json({ error: 'Invalid locker_room_id' }, { status: 400 })
  }

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const maxLength = type === 'raid' ? MAX_RAID_POST_LENGTH : MAX_POST_LENGTH
  if (content.length > maxLength) {
    return NextResponse.json(
      { error: `Content exceeds ${maxLength} characters` },
      { status: 400 }
    )
  }

  if (!type || !['standard', 'raid', 'match_thread', 'hot_take'].includes(type)) {
    return NextResponse.json({ error: 'Invalid post type' }, { status: 400 })
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
