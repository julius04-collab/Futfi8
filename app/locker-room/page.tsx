'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LoadingBar } from '@/components/ui/LoadingBar'

export default function LockerRoomRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.push('/login')
          return
        }
        supabase
          .from('users')
          .select('home_club_id')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.home_club_id) {
              router.push(`/locker-room/${data.home_club_id}`)
            } else {
              router.push('/hot-takes')
            }
          })
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center">
      <LoadingBar />
    </div>
  )
}
