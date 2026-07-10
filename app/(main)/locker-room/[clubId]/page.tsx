import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase/server-component'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getLiveMatchesWidget } from '@/lib/football-api/client'
import { LockerRoomClient } from './LockerRoomClient'

type ClubData = {
  id: string
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
  crest_url?: string
}

type LockerRoomData = {
  id: string
  is_under_raid: boolean
  raided_by: string | null
  raid_expires_at: string | null
  raiding_club: {
    name: string
    short_name: string
    primary_color: string
    secondary_color: string
  } | null
}

type Props = {
  params: Promise<{ clubId: string }>
}

export default async function LockerRoomPage({ params }: Props) {
  const { clubId } = await params

  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [userResult, clubResult, roomResult] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('username, avatar_url, home_club_id')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('clubs')
      .select('id, name, short_name, primary_color, secondary_color, crest_url')
      .eq('id', clubId)
      .single(),
    supabaseAdmin
      .from('locker_rooms')
      .select(`
        id,
        is_under_raid,
        raided_by,
        raid_expires_at,
        raiding_club:clubs!raided_by(name, short_name, primary_color, secondary_color)
      `)
      .eq('club_id', clubId)
      .maybeSingle(),
  ])

  if (clubResult.error || !clubResult.data) {
    redirect('/hot-takes')
  }

  const club = clubResult.data as ClubData
  const lockerRoom = roomResult.data as LockerRoomData | null
  const profile = userResult.data ?? { username: null, avatar_url: null, home_club_id: null }

  const liveMatches = await getLiveMatchesWidget()

  return (
    <LockerRoomClient
      club={club}
      lockerRoom={lockerRoom}
      userId={user.id}
      username={profile.username}
      avatarUrl={profile.avatar_url}
      homeClubId={profile.home_club_id}
      liveMatches={liveMatches}
    />
  )
}
