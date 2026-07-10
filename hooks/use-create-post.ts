'use client'
import { useState } from 'react'
import { getAuthToken } from '@/lib/supabase/get-auth-token'

export function useCreatePost() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createPost(payload: {
    endpoint?: string
    content: string
    locker_room_id?: string
    type: 'standard' | 'match_thread' | 'hot_take' | 'raid'
    match_id?: string
    raid_window_id?: string
  }) {
    setIsSubmitting(true)
    setError(null)

    const token = await getAuthToken()
    if (!token) {
      setError('Not authenticated')
      setIsSubmitting(false)
      return { success: false }
    }

    const { endpoint, ...body } = payload

    const res = await fetch(endpoint ?? '/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setIsSubmitting(false)

    if (!res.ok) {
      setError(json.error?.message ?? 'Failed to post')
      return { success: false }
    }

    return { success: true, data: json.post }
  }

  return { createPost, isSubmitting, error }
}
