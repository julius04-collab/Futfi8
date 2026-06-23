'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LoadingBar } from '@/components/ui/LoadingBar'

async function findDefaultClubId(): Promise<string | null> {
  const { data } = await supabase
    .from('clubs')
    .select('id')
    .eq('short_name', 'MUN')
    .maybeSingle()
  return data?.id ?? null
}

export default function LockerRoomRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (cancelled) return
        if (!user) {
          router.push('/login')
          return
        }
        supabase
          .from('users')
          .select('home_club_id')
          .eq('id', user.id)
          .single()
          .then(async ({ data }) => {
            if (cancelled) return
            const clubId = data?.home_club_id ?? await findDefaultClubId()
            if (clubId) {
              router.push(`/locker-room/${clubId}`)
            } else {
              router.push('/hot-takes')
            }
          })
      })
      .catch(() => {
        if (!cancelled) router.push('/login')
      })
    return () => { cancelled = true }
  }, [router])

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <LoadingBar />
    </div>
  )
}
