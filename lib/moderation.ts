import { supabaseAdmin } from '@/lib/supabase/server'
import { FAN_CRED } from '@/lib/constants'
import { updateFanCredScore } from '@/lib/membership'

export async function isModerator(userId: string, lockerRoomId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('locker_room_mods')
    .select('id')
    .eq('user_id', userId)
    .eq('locker_room_id', lockerRoomId)
    .single()

  return !!data
}

export async function flagPost(postId: string, moderatorId: string): Promise<void> {
  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('author_id, locker_room_id')
    .eq('id', postId)
    .single()

  if (!post) throw new Error('Post not found')

  const mod = await isModerator(moderatorId, post.locker_room_id)
  if (!mod) throw new Error('Not authorized to moderate this locker room')

  await supabaseAdmin
    .from('posts')
    .update({ is_flagged: true, archived: true })
    .eq('id', postId)

  await updateFanCredScore(post.author_id, post.locker_room_id, FAN_CRED.MODERATION_STRIKE)

  await supabaseAdmin.from('user_strikes').insert({
    user_id: post.author_id,
    reason: 'Content violates community guidelines',
    post_id: postId,
    issued_by: moderatorId,
  })
}

export async function removePost(postId: string, moderatorId: string): Promise<void> {
  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('locker_room_id')
    .eq('id', postId)
    .single()

  if (!post) throw new Error('Post not found')

  const mod = await isModerator(moderatorId, post.locker_room_id)
  if (!mod) throw new Error('Not authorized to moderate this locker room')

  await supabaseAdmin
    .from('posts')
    .update({ archived: true })
    .eq('id', postId)
}
