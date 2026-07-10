'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getAuthToken } from '@/lib/supabase/get-auth-token'
import { useCreatePost } from '@/hooks/use-create-post'
import { PostCard } from '@/components/locker-room/PostCard'
import { ComposeBox } from '@/components/locker-room/ComposeBox'
import { Badge } from '@/components/ui/Badge'
import { LoadingBar } from '@/components/ui/LoadingBar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type MatchData = {
  id: string
  home_club_id: string
  away_club_id: string
  kickoff_at: string
  status: string
  home_score: number | null
  away_score: number | null
  home_club: { name: string; short_name: string; crest_url: string; primary_color: string; secondary_color: string }
  away_club: { name: string; short_name: string; crest_url: string; primary_color: string; secondary_color: string }
}

type PostWithDetails = {
  id: string; content: string; type: string; upvote_count: number
  is_raid_post: boolean; archived: boolean; created_at: string
  author: { id: string; username: string; avatar_url: string | null } | null
  match: { id: string; home_club_id: string; away_club_id: string; home_score: number | null; away_score: number | null; status: string } | null
  reactions: { type: string; user_id: string }[]
}

const PAGE_SIZE = 20

export default function MatchThreadPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.matchId as string

  const [match, setMatch] = useState<MatchData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState('')
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null)
  const [homeRoomId, setHomeRoomId] = useState<string | null>(null)
  const [isHomeMember, setIsHomeMember] = useState(false)
  const [loading, setLoading] = useState(true)

  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
    })
  }, [router])

  useEffect(() => {
    if (!currentUserId || !matchId) return

    supabase
      .from('matches')
      .select(`
        id, home_club_id, away_club_id, kickoff_at, status, home_score, away_score,
        home_club:clubs!home_club_id(name, short_name, crest_url, primary_color, secondary_color),
        away_club:clubs!away_club_id(name, short_name, crest_url, primary_color, secondary_color)
      `)
      .eq('id', matchId)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { router.push('/hot-takes'); return }
        setMatch(data as unknown as MatchData)

        const matchData = data as unknown as MatchData

        const [{ data: room }, { data: userData }] = await Promise.all([
          supabase.from('locker_rooms').select('id').eq('club_id', matchData.home_club_id).single(),
          supabase.from('users').select('username, avatar_url').eq('id', currentUserId).single(),
        ])

        if (room) setHomeRoomId(room.id)
        if (userData) {
          setCurrentUsername(userData.username)
          setCurrentAvatar(userData.avatar_url)
        }

        if (room) {
          const { data: membership } = await supabase
            .from('memberships')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('locker_room_id', room.id)
            .single()
          setIsHomeMember(!!membership)
        }

        setLoading(false)
      })
  }, [matchId, currentUserId, router])

  useEffect(() => {
    if (!matchId) return

    supabase
      .from('posts')
      .select(`
        id, content, type, upvote_count, is_raid_post, archived, created_at,
        author:users!author_id(id, username, avatar_url),
        match:matches(id, home_club_id, away_club_id, home_score, away_score, status),
        reactions(id, type, user_id)
      `)
      .eq('match_id', matchId)
      .eq('type', 'match_thread')
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .then(({ data, error }) => {
        if (!error && data) {
          setPosts(data as unknown as PostWithDetails[])
          setHasMore(data.length === PAGE_SIZE)
          setOffset(PAGE_SIZE)
        }
        setPostsLoading(false)
      })

    const channel = supabase
      .channel(`match-thread:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const newPost = payload.new as PostWithDetails
          setPosts((prev) => [newPost, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  const loadMore = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, content, type, upvote_count, is_raid_post, archived, created_at,
        author:users!author_id(id, username, avatar_url),
        match:matches(id, home_club_id, away_club_id, home_score, away_score, status),
        reactions(id, type, user_id)
      `)
      .eq('match_id', matchId)
      .eq('type', 'match_thread')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (!error && data) {
      setPosts((prev) => [...prev, ...(data as unknown as PostWithDetails[])])
      setHasMore(data.length === PAGE_SIZE)
      setOffset((prev) => prev + PAGE_SIZE)
    }
  }, [matchId, offset])

  async function handleReact(postId: string, reactionType: string) {
    const token = await getAuthToken()
    if (!token) return

    const res = await fetch(`/api/posts/${postId}/react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
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

  const { createPost } = useCreatePost()

  const handlePost = useCallback(async (content: string) => {
    if (!homeRoomId) return
    const { success } = await createPost({
      locker_room_id: homeRoomId,
      content,
      type: 'match_thread',
      match_id: matchId,
    })
    if (!success) throw new Error('Failed to create post')
  }, [homeRoomId, matchId, createPost])

  const isLive = match?.status === 'live'
  const isFinished = match?.status === 'finished'
  const isScheduled = match?.status === 'scheduled'

  if (loading) return <div className="flex justify-center py-20"><LoadingBar /></div>
  if (!match) return null

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          borderBottom: '1px solid var(--futfi8-color-border-default)',
          background: `linear-gradient(90deg, ${match.home_club.primary_color}, ${match.away_club.primary_color})`,
        }}
      >
        <Link href="/hot-takes" className="flex items-center" style={{ color: 'rgba(255,255,255,0.8)' }}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm font-semibold" style={{ color: '#fff' }}>Match Thread</span>
      </div>

      <div className="flex flex-col items-center gap-2 px-4 py-6" style={{
        background: `linear-gradient(135deg, ${match.home_club.secondary_color}, ${match.away_club.secondary_color})`,
      }}>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold" style={{ background: match.home_club.primary_color, color: '#fff' }}>
              {match.home_club.short_name}
            </div>
            <span className="text-xs font-medium text-center truncate max-w-[80px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {match.home_club.short_name}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold" style={{ color: '#fff', fontFamily: 'var(--futfi8-typography-font-family-display)' }}>
                {match.home_score ?? '-'}
              </span>
              <span className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>:</span>
              <span className="text-3xl font-bold" style={{ color: '#fff', fontFamily: 'var(--futfi8-typography-font-family-display)' }}>
                {match.away_score ?? '-'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isLive && <Badge variant="live">LIVE</Badge>}
              {isFinished && <Badge variant="default">FT</Badge>}
              {isScheduled && (
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {new Date(match.kickoff_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold" style={{ background: match.away_club.primary_color, color: '#fff' }}>
              {match.away_club.short_name}
            </div>
            <span className="text-xs font-medium text-center truncate max-w-[80px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {match.away_club.short_name}
            </span>
          </div>
        </div>
      </div>

      {isHomeMember && (isLive || isScheduled) && (
        <ComposeBox
          username={currentUsername}
          avatarUrl={currentAvatar}
          onPost={handlePost}
        />
      )}

      {isFinished && (
        <div className="px-4 py-3 text-center">
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--futfi8-color-text-muted)' }}>
            Match thread closed — posts are read-only
          </span>
        </div>
      )}

      {postsLoading ? (
        <div className="flex justify-center py-12"><LoadingBar /></div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-sm" style={{ color: 'var(--futfi8-color-text-muted)' }}>
            No match thread posts yet.
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
