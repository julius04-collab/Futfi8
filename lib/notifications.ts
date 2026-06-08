import { supabaseAdmin } from '@/lib/supabase/server'

type NotificationType = 'upvote' | 'raid_opened' | 'raid_post'

/**
 * Insert a notification for a single user.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  referenceId: string
): Promise<void> {
  await supabaseAdmin
    .from('notifications')
    .insert({ user_id: userId, type, reference_id: referenceId })
    .maybeSingle()
}

/**
 * Insert notifications for all members of a locker room.
 */
export async function notifyLockerRoomMembers(
  lockerRoomId: string,
  type: NotificationType,
  referenceId: string,
  excludeUserId?: string
): Promise<void> {
  const { data: members } = await supabaseAdmin
    .from('memberships')
    .select('user_id')
    .eq('locker_room_id', lockerRoomId)

  if (!members) return

  const notifications = members
    .filter((m) => m.user_id !== excludeUserId)
    .map((m) => ({
      user_id: m.user_id,
      type,
      reference_id: referenceId,
    }))

  if (notifications.length > 0) {
    await supabaseAdmin.from('notifications').insert(notifications)
  }
}
