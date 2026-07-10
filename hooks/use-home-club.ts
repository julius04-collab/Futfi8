'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface HomeClub {
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

export function useHomeClub() {
  const [homeClub, setHomeClub] = useState<HomeClub | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (cancelled) return

        if (!user) {
          setIsLoading(false)
          return
        }

        const { data, error: queryError } = await supabase
          .from('users')
          .select(`
            id, username, avatar_url, home_club_id,
            home_club:clubs!home_club_id (
              id, name, short_name, primary_color, crest_url,
              locker_room:locker_rooms ( id )
            )
          `)
          .eq('id', user.id)
          .single()

        if (cancelled) return

        if (queryError || !data?.id) {
          setError(queryError?.message ?? 'Failed to load profile')
          setIsLoading(false)
          return
        }

        setUserId(data.id)
        setUsername(data.username)
        setAvatarUrl(data.avatar_url)

        if (data.home_club) {
          const club = data.home_club as unknown as {
            id: string
            name: string
            short_name: string
            primary_color: string
            crest_url: string | null
            locker_room: { id: string } | { id: string }[] | null
          }
          setHomeClub({
            id: club.id,
            name: club.name,
            short_name: club.short_name,
            primary_color: club.primary_color,
            crest_url: club.crest_url,
            locker_room_id: toLockerRoomId(club.locker_room),
          })
        }

        setIsLoading(false)
      } catch {
        setError('Failed to load profile')
        setIsLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [])

  return { homeClub, userId, username, avatarUrl, isLoading, error }
}
