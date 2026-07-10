---
trigger: always_on
---

# Futfi8 Realtime UI Lifecycle, Connection Rules, & Optimistic Logic

## Subscription Lifecycle Hooks
Always follow this explicit pattern in React components — subscribe on mount, unsubscribe cleanly on unmount. Memory leaks from orphaned socket subscriptions will degrade performance rapidly during active match windows.

```ts
// hooks/use-locker-room-feed.ts
import { useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useLockerRoomFeed(lockerRoomId: string, onNewPost: (post: Post) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!lockerRoomId) return

    channelRef.current = supabase
      .channel(`locker-room:${lockerRoomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `locker_room_id=eq.${lockerRoomId}`,
      }, (payload) => {
        onNewPost(payload.new as Post)
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [lockerRoomId])
}
Rule: Always capture and mutate channels via a useRef wrapper — never use local reactive component states.

Rule: Always call supabase.removeChannel() inside effect hook returns.

Optimistic UI Mutation Patterns
For interactive feed pipelines (posting text, upvoting banter), mutate interface components immediately. Revert state logic on network validation rejections.

Optimistic Content Creation Function
TypeScript
const handleSubmitPost = async (content: string) => {
  const optimisticPost: Post = {
    id: `temp-${Date.now()}`,
    content,
    author_id: user.id,
    created_at: new Date().toISOString(),
    upvote_count: 0,
    is_optimistic: true,
  }

  setPosts(prev => [optimisticPost, ...prev])

  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content, locker_room_id: lockerRoomId, type: 'standard' }),
    })
    const { data } = await response.json()

    setPosts(prev => prev.map(p => p.id === optimisticPost.id ? data : p))
  } catch {
    setPosts(prev => prev.filter(p => p.id !== optimisticPost.id))
    showErrorToast('Failed to post your take. Try again.')
  }
}
Optimistic Reaction Mutation Function
TypeScript
const handleUpvote = async (postId: string) => {
  setPosts(prev => prev.map(p =>
    p.id === postId ? { ...p, upvote_count: p.upvote_count + 1, userHasUpvoted: true } : p
  ))

  try {
    await fetch('/api/reactions', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId, type: 'upvote' }),
    })
  } catch {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, upvote_count: p.upvote_count - 1, userHasUpvoted: false } : p
    ))
  }
}
Client-Side Raid Countdown Tracker
The active window countdown mechanism operates entirely via local client polling intervals — it does not subscribe to real-time sync tables. Tick intervals process calculations tracking the closes_at parameter.

TypeScript
// hooks/use-raid-countdown.ts
import { useState, useEffect } from 'react'

export function useRaidCountdown(closesAt: string) {
  const [remaining, setRemaining] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(closesAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining(0)
        setIsExpired(true)
        return
      }
      setRemaining(diff)
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [closesAt])

  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

  return {
    display: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    isExpired,
    remaining,
  }
}
Rule: Render countdown timer variants using font-label text-label-lg text-accent properties for uniform character grid spacing widths.

Connection State Recovery
Gracefully manage dropping connections on unstable cellular data networks by rendering reconnection warning tags inside client viewports.

TypeScript
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') setRealtimeConnected(true)
  if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setRealtimeConnected(false)
})
TypeScript
{!realtimeConnected && (
  <div className="text-label-sm text-muted text-center py-2 animate-pulse">
    Reconnecting to match thread...
  </div>
)}