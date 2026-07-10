---
trigger: always_on
---

# Futfi8 Database Query Optimization & Asset Delivery Rules

## Server-Side Data Retrieval & Caching Configurations

```ts
// lib/data/locker-room.ts
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Static Ingestion Layer: Cache permanently across application bounds
export async function getClub(clubId: string) {
  const supabase = createSupabaseServerClient()
  return await supabase.from('clubs').select('*').eq('id', clubId).single()
}

// Transactional Interceptor Layer: Hard pass with absolute dynamic zero caching
export async function getActiveRaid(lockerRoomId: string) {
  const supabase = createSupabaseServerClient()
  return await supabase.from('raid_windows').select('*').eq('defending_locker_room_id', lockerRoomId).eq('status', 'active').single()
}

// Initial Boot Frame: Apply a tight 30-second revalidation loop before WebSockets take over
export async function getInitialPosts(lockerRoomId: string, limit = 20) {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('posts')
    .select('*, author:users(id, username, avatar_url)')
    .eq('locker_room_id', lockerRoomId)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
High-Performance Database Query Strategies
Explicit Column Selection Limits
Banned Query Signature: Never dispatch empty list criteria or select-all statements (.select('*')) inside loops or infinite scrolling feeds.

Mandatory Query Signature: Isolate parameters to explicit column targets needed directly by the user interface:

TypeScript
const { data } = await supabase
  .from('posts')
  .select('id, content, created_at, upvote_count, author:users(id, username, avatar_url)')
Mitigation of N+1 Fetch Degradations
Join Rule Constraint: Always join related user profiles directly within a single database transactional scope instead of executing secondary loop mappings downstream.

TypeScript
// GOOD — Relational attributes compiled instantly in 1 database connection pass
const { data } = await supabase.from('posts').select('*, author:users(id, username, avatar_url)').eq('locker_room_id', lockerRoomId)
Denormalized Counters Checkpoint
Rule: Never execute costly programmatic count algorithms (count()) against transactional tables at runtime. Exclusively read from denormalized counter values (posts.upvote_count, locker_rooms.member_count) that are pre-compiled and written via native internal PostgreSQL database triggers.

Asset & Image Optimization Layout
Mandatory Image Optimization Wrappers
Asset Processing Rules: Never render raw elements using standard <img> syntax. Route all asset processing through next/image structures to auto-convert imagery into modern compressed WebP/AVIF file formats.

TypeScript
import Image from 'next/image'

<Image
  src={`/crests/${club.slug}.svg`}
  alt={`${club.name} crest`}
  width={32}
  height={32}
  priority={isAboveFold} // Flag true for elements within primary mobile viewports
/>
Club Crest Metrics: Team logos must remain strictly in localized SVG vector formatting (public/crests/{slug}.svg).

User Profile Avatars: Profile assets load via Supabase Storage buckets utilizing explicit sizing properties (width={32} height={32}) to lock layouts and eliminate Cumulative Layout Shift (CLS).

Automated Client-Side Infinite Scroll Architecture
TypeScript
// hooks/use-infinite-feed.ts
import { useState, useEffect, useRef, useCallback } from 'react'

export function useInfiniteFeed<T>(
  fetchFn: (cursor: string | null) => Promise<{ data: T[]; nextCursor: string | null }>,
  initialData: T[]
) {
  const [items, setItems] = useState<T[]>(initialData)
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    try {
      const result = await fetchFn(cursor)
      setItems(prev => [...prev, ...result.data])
      setCursor(result.nextCursor)
      setHasMore(result.nextCursor !== null)
    } finally {
      setIsLoading(false)
    }
  }, [cursor, isLoading, hasMore, fetchFn])

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [loadMore])

  return { items, isLoading, hasMore, sentinelRef }
}
Deployment Routing Configuration (next.config.ts)
TypeScript
const nextConfig = {
  compress: true, // Compress asset text bytes using Gzip/Brotli mechanisms
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
    minimumCacheTTL: 86400, // Keep asset cache allocations active for 24 hours
  },
}