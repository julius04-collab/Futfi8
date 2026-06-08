import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { MAX_RAID_POST_LENGTH, TOXICITY_THRESHOLD_RAID } from '@/lib/constants'
import { moderateContent } from '@/lib/huggingface/client'
import { notifyLockerRoomMembers } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { content, locker_room_id } = body

  if (!content || typeof content !== 'string' || content.length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  if (content.length > MAX_RAID_POST_LENGTH) {
    return NextResponse.json(
      { error: `Raid post cannot exceed ${MAX_RAID_POST_LENGTH} characters` },
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

  if (!locker_room_id) {
    return NextResponse.json({ error: 'locker_room_id is required' }, { status: 400 })
  }

  // 1. Check raid window is active
  const { data: raidWindow } = await supabaseAdmin
    .from('raid_windows')
    .select('*, match:matches(id, kickoff_at, home_club_id, away_club_id, home_score, away_score)')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!raidWindow) {
    return NextResponse.json({ error: 'Raid window not found or no longer active' }, { status: 404 })
  }

  // 2. Check user is from the winning club's locker room
  const { data: raidingRoom } = await supabaseAdmin
    .from('locker_rooms')
    .select('id')
    .eq('id', locker_room_id)
    .eq('club_id', raidWindow.raiding_club_id)
    .single()

  if (!raidingRoom) {
    return NextResponse.json({ error: 'You must be a member of the winning club' }, { status: 403 })
  }

  // 3. Check user joined before kickoff
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('joined_at')
    .eq('user_id', user.id)
    .eq('locker_room_id', locker_room_id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this locker room' }, { status: 403 })
  }

  const kickoff = new Date(raidWindow.match.kickoff_at)
  const joinedAt = new Date(membership.joined_at)
  if (joinedAt >= kickoff) {
    return NextResponse.json(
      { error: 'Must have joined before kickoff to raid' },
      { status: 403 }
    )
  }

  // 4. Age gate check
  if (user.user_metadata?.is_under_16 === true) {
    return NextResponse.json(
      { error: 'Users under 16 cannot participate in raids' },
      { status: 403 }
    )
  }

  // 5. One post per user per window (enforced at DB level, but check for better error msg)
  const { data: existingPost } = await supabaseAdmin
    .from('posts')
    .select('id')
    .eq('author_id', user.id)
    .eq('raid_window_id', id)
    .single()

  if (existingPost) {
    return NextResponse.json({ error: 'You have already posted in this raid window' }, { status: 409 })
  }

  // 6. Create the raid post — target the defending club's locker room
  const { data: defendingRoom } = await supabaseAdmin
    .from('locker_rooms')
    .select('id')
    .eq('club_id', raidWindow.defending_club_id)
    .single()

  if (!defendingRoom) {
    return NextResponse.json({ error: 'Defending locker room not found' }, { status: 500 })
  }

  const { data: post, error } = await supabaseAdmin
    .from('posts')
    .insert({
      author_id: user.id,
      locker_room_id: defendingRoom.id,
      content,
      type: 'raid',
      is_raid_post: true,
      raid_window_id: id,
      toxicity_score: toxicityScore,
      is_flagged: isFlagged,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You have already posted in this raid window' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify defending locker room members of raid post
  await notifyLockerRoomMembers(defendingRoom.id, 'raid_post', post.id)

  return NextResponse.json({ post }, { status: 201 })
}
