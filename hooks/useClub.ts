'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Club } from '@/types'

export function useClub(clubId: string | null) {
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clubId) return

    supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setClub(data as Club)
        setLoading(false)
      })
  }, [clubId])

  return { club, loading }
}
