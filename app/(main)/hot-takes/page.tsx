'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Flame } from 'lucide-react'
import { PostCard } from '@/components/locker-room/PostCard'
import { LoadingBar } from '@/components/ui/LoadingBar'

type PostWithDetails = {
  id: string
  content: string
  type: string
  upvote_count: number
  is_raid_post: boolean
  archived: boolean
  created_at: string
  author: { id: string; username: string; avatar_url: string | null } | null
  match: {
    id: string; home_club_id: string; away_club_id: string
    home_score: number | null; away_score: number | null; status: string
  } | null
  reactions: { type: string; user_id: string }[]
}

const PAGE_SIZE = 20

export default function HotTakesPage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [content, setContent] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
    })
  }, [router])

  useEffect(() => {
    if (!currentUserId) return

    supabase
      .from('posts')
      .select(`
        id, content, type, upvote_count, is_raid_post, archived, created_at,
        author:users!author_id(id, username, avatar_url),
        match:matches(id, home_club_id, away_club_id, home_score, away_score, status),
        reactions(id, type, user_id)
      `)
      .eq('type', 'hot_take')
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .then(({ data, error }) => {
        if (!error && data) {
          setPosts(data as unknown as PostWithDetails[])
          setHasMore(data.length === PAGE_SIZE)
          setOffset(PAGE_SIZE)
        }
        setLoading(false)
      })

    const channel = supabase
      .channel('hot-takes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `type=eq.hot_take` },
        (payload) => {
          const newPost = payload.new as PostWithDetails
          setPosts((prev) => [newPost, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  const loadMore = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, content, type, upvote_count, is_raid_post, archived, created_at,
        author:users!author_id(id, username, avatar_url),
        match:matches(id, home_club_id, away_club_id, home_score, away_score, status),
        reactions(id, type, user_id)
      `)
      .eq('type', 'hot_take')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (!error && data) {
      setPosts((prev) => [...prev, ...(data as unknown as PostWithDetails[])])
      setHasMore(data.length === PAGE_SIZE)
      setOffset((prev) => prev + PAGE_SIZE)
    }
  }, [offset])

  async function handleReact(postId: string, reactionType: string) {
    const res = await fetch(`/api/posts/${postId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: reactionType }),
    })
    if (!res.ok) return
    const data = await res.json()
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p
        const updated = { ...p }
        if (data.reacted) {
          updated.reactions = [...updated.reactions, { type: reactionType, user_id: currentUserId! }]
        } else {
          updated.reactions = updated.reactions.filter(
            (r) => !(r.type === reactionType && r.user_id === currentUserId)
          )
        }
        return updated
      })
    )
  }

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed || !currentUserId) return
    setContent('')
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed, type: 'hot_take' }),
    })
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: '1px solid var(--futfi8-color-border-default)' }}>
        <Flame className="h-5 w-5" style={{ color: 'var(--futfi8-color-text-accent)' }} />
        <h1
          className="text-lg font-bold"
          style={{
            fontFamily: 'var(--futfi8-typography-font-family-display)',
            color: 'var(--futfi8-color-text-primary)',
          }}
        >
          Hot Takes
        </h1>
      </div>

      <div
        className="flex gap-3 border-b px-4 py-3"
        style={{ borderColor: 'var(--futfi8-color-border-subtle)' }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Drop a hot take..."
          rows={2}
          className="min-h-[44px] flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            background: 'var(--futfi8-color-background-input)',
            color: 'var(--futfi8-color-text-primary)',
            border: '1px solid var(--futfi8-color-border-default)',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="shrink-0 self-end rounded-lg px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{
            background: 'var(--futfi8-color-brand-electric-purple)',
            color: '#fff',
          }}
        >
          Post
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingBar /></div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Flame className="mb-3 h-10 w-10" style={{ color: 'var(--futfi8-color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--futfi8-color-text-muted)' }}>
            No hot takes yet. Drop the first one.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 py-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId!}
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
      )}
    </div>
  )
}
