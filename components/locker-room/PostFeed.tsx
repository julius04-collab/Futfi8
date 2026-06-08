'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { PostCard } from './PostCard'
import { LoadingBar } from '@/components/ui/LoadingBar'
export type PostWithDetails = {
  id: string
  content: string
  type: string
  upvote_count: number
  is_raid_post: boolean
  archived: boolean
  created_at: string
  author: { id: string; username: string; avatar_url: string | null } | null
  match: {
    id: string
    home_club_id: string
    away_club_id: string
    home_score: number | null
    away_score: number | null
    status: string
  } | null
  reactions: { type: string; user_id: string }[]
}

type PostFeedProps = {
  lockerRoomId: string
  currentUserId: string
  type?: string
}

const PAGE_SIZE = 20

export function PostFeed({ lockerRoomId, currentUserId, type }: PostFeedProps) {
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    let query = supabase
      .from('posts')
      .select(`
        id, content, type, upvote_count, is_raid_post, archived, created_at,
        author:users!author_id(id, username, avatar_url),
        match:matches(id, home_club_id, away_club_id, home_score, away_score, status),
        reactions(id, type, user_id)
      `)
      .eq('locker_room_id', lockerRoomId)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)

    if (type) {
      query = query.eq('type', type)
    }

    query.then(({ data, error }) => {
      if (!error && data) {
        setPosts(data as unknown as PostWithDetails[])
        setHasMore(data.length === PAGE_SIZE)
        setOffset(PAGE_SIZE)
      }
      setLoading(false)
    })

    const channel = supabase
      .channel(`posts:${lockerRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `locker_room_id=eq.${lockerRoomId}`,
        },
        (payload) => {
          const newPost = payload.new as PostWithDetails
          setPosts((prev) => [newPost, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [lockerRoomId, type])

  const loadMore = useCallback(async () => {
    let query = supabase
      .from('posts')
      .select(`
        id, content, type, upvote_count, is_raid_post, archived, created_at,
        author:users!author_id(id, username, avatar_url),
        match:matches(id, home_club_id, away_club_id, home_score, away_score, status),
        reactions(id, type, user_id)
      `)
      .eq('locker_room_id', lockerRoomId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (!error && data) {
      setPosts((prev) => [...prev, ...(data as unknown as PostWithDetails[])])
      setHasMore(data.length === PAGE_SIZE)
      setOffset((prev) => prev + PAGE_SIZE)
    }
  }, [lockerRoomId, type, offset])

  async function handleReact(postId: string, reactionType: string) {
    const res = await fetch(`/api/posts/${postId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: reactionType }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Reaction failed:', err.error)
      return
    }

    const data = await res.json()

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post

        const updated = { ...post }
        if (data.reacted) {
          updated.reactions = [...updated.reactions, { type: reactionType, user_id: currentUserId }]
        } else {
          updated.reactions = updated.reactions.filter(
            (r) => !(r.type === reactionType && r.user_id === currentUserId)
          )
        }
        return updated
      })
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingBar />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex flex-col items-center gap-4 py-10">
          <p className="text-sm" style={{ color: 'var(--futfi8-color-text-muted)' }}>
            No posts yet. Be the first to share a take.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onReact={handleReact}
        />
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full py-3 text-center text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--futfi8-color-text-accent)' }}
        >
          Load more
        </button>
      )}
    </div>
  )
}
