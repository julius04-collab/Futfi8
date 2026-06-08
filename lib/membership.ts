import { supabaseAdmin } from '@/lib/supabase/server'
import { CLUB_SWITCH_COOLDOWN_DAYS } from '@/lib/constants'

export interface JoinResult {
  membership: { id: string; locker_room_id: string; fan_cred_score: number }
  isNew: boolean
}

export async function joinClub(userId: string, lockerRoomId: string): Promise<JoinResult> {
  const { data: existing } = await supabaseAdmin
    .from('memberships')
    .select('id, locker_room_id, fan_cred_score')
    .eq('user_id', userId)
    .eq('locker_room_id', lockerRoomId)
    .single()

  if (existing) {
    return { membership: existing, isNew: false }
  }

  const { data: membership, error } = await supabaseAdmin
    .from('memberships')
    .insert({ user_id: userId, locker_room_id: lockerRoomId })
    .select('id, locker_room_id, fan_cred_score')
    .single()

  if (error) throw new Error(error.message)

  await supabaseAdmin.rpc('increment_member_count', { room_id: lockerRoomId })

  return { membership, isNew: true }
}

export async function getLastClubSwitch(userId: string): Promise<Date | null> {
  const { data } = await supabaseAdmin
    .from('club_membership_history')
    .select('left_at')
    .eq('user_id', userId)
    .order('left_at', { ascending: false })
    .limit(1)
    .single()

  return data?.left_at ? new Date(data.left_at) : null
}

export function canSwitchClub(lastSwitch: Date | null): { allowed: boolean; daysLeft: number } {
  if (!lastSwitch) return { allowed: true, daysLeft: 0 }

  const elapsed = Date.now() - lastSwitch.getTime()
  const daysLeft = Math.max(0, Math.ceil((CLUB_SWITCH_COOLDOWN_DAYS * 86400000 - elapsed) / 86400000))

  return { allowed: daysLeft === 0, daysLeft }
}

export async function switchClub(userId: string, newLockerRoomId: string) {
  const { data: currentMembership } = await supabaseAdmin
    .from('memberships')
    .select('id, locker_room_id, fan_cred_score')
    .eq('user_id', userId)
    .single()

  if (currentMembership) {
    const lockerRoom = await supabaseAdmin
      .from('locker_rooms')
      .select('club_id')
      .eq('id', currentMembership.locker_room_id)
      .single()

    if (lockerRoom.data) {
      await supabaseAdmin.from('club_membership_history').insert({
        user_id: userId,
        club_id: lockerRoom.data.club_id,
        left_at: new Date().toISOString(),
      })
    }

    await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('id', currentMembership.id)

    await supabaseAdmin.rpc('decrement_member_count', { room_id: currentMembership.locker_room_id })
  }

  const { data: membership, error } = await supabaseAdmin
    .from('memberships')
    .insert({ user_id: userId, locker_room_id: newLockerRoomId })
    .select('id, locker_room_id, fan_cred_score')
    .single()

  if (error) throw new Error(error.message)

  await supabaseAdmin.rpc('increment_member_count', { room_id: newLockerRoomId })

  return membership
}

export async function updateFanCredScore(
  userId: string,
  lockerRoomId: string,
  delta: number
): Promise<number> {
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('fan_cred_score')
    .eq('user_id', userId)
    .eq('locker_room_id', lockerRoomId)
    .single()

  if (!membership) throw new Error('Membership not found')

  const newScore = Math.max(0, membership.fan_cred_score + delta)
  const badgeLevel = getBadgeLevel(newScore)

  await supabaseAdmin
    .from('memberships')
    .update({ fan_cred_score: newScore, badge_level: badgeLevel })
    .eq('user_id', userId)
    .eq('locker_room_id', lockerRoomId)

  return newScore
}

export function getBadgeLevel(score: number): string {
  if (score >= 2000) return 'Legend'
  if (score >= 1000) return 'Veteran'
  if (score >= 500) return 'OG'
  if (score >= 100) return 'Regular'
  return 'Rookie'
}
