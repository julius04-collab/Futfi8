'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    supabase.auth.getUser()
      .then(({ data: { user: authUser } }) => {
        if (cancelled) return
        if (!authUser) {
          if (!cancelled) setLoading(false)
          return
        }
        supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
          .then(({ data }) => {
            if (!cancelled) {
              if (data) setUser(data as User)
              setLoading(false)
            }
          })
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
      }
    })

    return () => {
      cancelled = true
      mountedRef.current = false
      listener?.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
