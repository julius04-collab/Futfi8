'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) {
        setLoading(false)
        return
      }
      supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()
        .then(({ data }) => {
          if (data) setUser(data as User)
          setLoading(false)
        })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
      }
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  return { user, loading }
}
