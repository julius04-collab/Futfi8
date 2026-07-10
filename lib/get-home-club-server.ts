import { supabaseAdmin } from '@/lib/supabase/server'

export interface HomeClubServer {
  id: string
  name: string
  short_name: string
  primary_color: string
  crest_url: string | null
  locker_room_id: string | null
}

function toLockerRoomId(raw: unknown): string | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as { id: string } | undefined)?.id ?? null
  return (raw as { id: string }).id ?? null
}

export async function getHomeClubServer(userId: string): Promise<{
  homeClub: HomeClubServer | null
  error: string | null
}> {
  const { data, error: queryError } = await supabaseAdmin
    .from('users')
    .select(`
      home_club_id,
      home_club:clubs!home_club_id (
        id, name, short_name, primary_color, crest_url,
        locker_room:locker_rooms!club_id ( id )
      )
    `)
    .eq('id', userId)
    .single()

  if (queryError || !data?.home_club) {
    return { homeClub: null, error: queryError?.message ?? 'No home club set' }
  }

  const club = data.home_club as unknown as {
    id: string
    name: string
    short_name: string
    primary_color: string
    crest_url: string | null
    locker_room: unknown
  }

  return {
    homeClub: {
      id: club.id,
      name: club.name,
      short_name: club.short_name,
      primary_color: club.primary_color,
      crest_url: club.crest_url,
      locker_room_id: toLockerRoomId(club.locker_room),
    },
    error: null,
  }
}
