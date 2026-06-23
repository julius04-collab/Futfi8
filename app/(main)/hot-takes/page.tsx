'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LoadingBar } from '@/components/ui/LoadingBar'

const CLUBS = [
  { id: 'ars', name: 'Arsenal', abbr: 'ARS', primary: '#EF0107', secondary: '#063672' },
  { id: 'avl', name: 'Aston Villa', abbr: 'AVL', primary: '#95BFE5', secondary: '#670E36' },
  { id: 'bou', name: 'Bournemouth', abbr: 'BOU', primary: '#DA291C', secondary: '#000000' },
  { id: 'bre', name: 'Brentford', abbr: 'BRE', primary: '#E30613', secondary: '#FBB800' },
  { id: 'bha', name: 'Brighton', abbr: 'BHA', primary: '#0057B8', secondary: '#FFCD00' },
  { id: 'che', name: 'Chelsea', abbr: 'CHE', primary: '#034694', secondary: '#DBA111' },
  { id: 'cry', name: 'Crystal Palace', abbr: 'CRY', primary: '#1B458F', secondary: '#C4122E' },
  { id: 'eve', name: 'Everton', abbr: 'EVE', primary: '#003399', secondary: '#FFFFFF' },
  { id: 'ful', name: 'Fulham', abbr: 'FUL', primary: '#000000', secondary: '#CC0000' },
  { id: 'lee', name: 'Leeds United', abbr: 'LEE', primary: '#FFCD00', secondary: '#1D428A' },
  { id: 'liv', name: 'Liverpool', abbr: 'LIV', primary: '#C8102E', secondary: '#00B2A9' },
  { id: 'mci', name: 'Manchester City', abbr: 'MCI', primary: '#6CABDD', secondary: '#1C2C5B' },
  { id: 'mun', name: 'Manchester United', abbr: 'MUN', primary: '#DA291C', secondary: '#FBE122' },
  { id: 'new', name: 'Newcastle United', abbr: 'NEW', primary: '#241F20', secondary: '#F1F1F1' },
  { id: 'nfo', name: "Nottingham Forest", abbr: 'NFO', primary: '#DD0000', secondary: '#FFFFFF' },
  { id: 'tot', name: 'Tottenham Hotspur', abbr: 'TOT', primary: '#132257', secondary: '#FFFFFF' },
]

const CLUB_MAP = Object.fromEntries(CLUBS.map((c) => [c.id, c]))

type PostRecord = {
  id: string
  content: string
  upvote_count: number
  created_at: string
  author: { id: string; username: string; home_club_id: string } | null
  reactions: { type: string; user_id: string }[]
}

type SortMode = 'hot' | 'new'

export default function HotTakesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [userClubId, setUserClubId] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sort, setSort] = useState<SortMode>('hot')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
    })
  }, [router])

  useEffect(() => {
    if (!userId) return
    supabase
      .from('users')
      .select('username, home_club_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username)
          setUserClubId(data.home_club_id)
        }
      })
  }, [userId])

  useEffect(() => {
    if (!userId) return

    let query = supabase
      .from('posts')
      .select(
        'id, content, upvote_count, created_at, author:users!author_id(id, username, home_club_id), reactions(id, type, user_id)'
      )
      .eq('type', 'hot_take')

    if (sort === 'hot') {
      query = query.order('upvote_count', { ascending: false }).order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query.limit(80).then(({ data, error }) => {
      if (!error && data) setPosts(data as unknown as PostRecord[])
      setLoading(false)
    })

    const channel = supabase
      .channel('hot-takes-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: 'type=eq.hot_take' }, (payload) => {
        setPosts((prev) => [payload.new as PostRecord, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, sort])

  const filtered = useMemo(() => {
    if (!filter) return posts
    return posts.filter((p) => p.author?.home_club_id === filter)
  }, [posts, filter])

  async function handlePost() {
    const trimmed = body.trim()
    if (trimmed.length < 2) return
    setBody('')
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed, type: 'hot_take' }),
    })
  }

  async function handleVote(postId: string, value: 1 | -1) {
    if (!userId) return
    await fetch(`/api/posts/${postId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: value === 1 ? 'upvote' : 'downvote' }),
    })
  }

  function userVote(post: PostRecord): 1 | -1 | 0 {
    if (!userId) return 0
    const up = post.reactions.some((r) => r.type === 'upvote' && r.user_id === userId)
    if (up) return 1
    return 0
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-5 border-b border-slate-800/60">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-purple-500">
          // Cross-club feed
        </div>
        <h1 className="mt-2 font-display text-4xl text-white leading-[0.9]">
          The Hot Take Board
        </h1>
        <p className="mt-2 max-w-lg text-sm text-slate-400 leading-relaxed">
          Every club. Every fan. One feed. Best takes float — worst takes die alone.
        </p>
      </div>

      {/* Premium composer — always shown for authenticated users */}
      <div className="px-4 py-4 border-b border-slate-800/60">
        <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-400 mb-2 font-mono">
            Posting as{' '}
            <span className="text-white font-semibold">@{username || 'user'}</span>
            {' '}&bull;{' '}
            <span className="text-[#a855f7] uppercase font-bold">
              {userClubId && CLUB_MAP[userClubId] ? CLUB_MAP[userClubId].abbr : 'FC'}
            </span>
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's the take?"
            maxLength={280}
            className="w-full bg-transparent text-white text-base placeholder-gray-600 focus:outline-none resize-none min-h-[80px]"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="font-mono text-[10px] text-gray-600">{280 - body.length} left</span>
            <button
              onClick={handlePost}
              disabled={body.trim().length < 2}
              className="px-6 py-2 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-bold uppercase tracking-wider rounded-md transition duration-150"
            >
              POST TAKE
            </button>
          </div>
        </div>

        {/* Sort + club filter pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 font-mono text-[10px] uppercase tracking-widest">
            {(['hot', 'new'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`rounded-sm border px-3 py-1.5 transition ${
                  sort === s
                    ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                    : 'border-slate-800 text-slate-500 hover:text-white'
                }`}
              >
                {s === 'hot' ? 'Hot' : 'Newest'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilter('')}
              className={`rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition ${
                filter === '' ? 'border-white text-white' : 'border-slate-800 text-slate-500 hover:text-white'
              }`}
            >
              All clubs
            </button>
            {CLUBS.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition ${
                  filter === c.id ? 'border-purple-500 text-white' : 'border-slate-800 text-slate-500 hover:text-white'
                }`}
              >
                {c.abbr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingBar />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="text-sm text-slate-500">No takes here yet. Be the first.</p>
          </div>
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {filtered.map((post) => {
              const club = post.author ? CLUB_MAP[post.author.home_club_id] : null
              const myVote = userVote(post)
              return (
                <article
                  key={post.id}
                  className="flex gap-3 rounded-sm border border-slate-800/60 bg-slate-900/50 p-4 transition hover:border-purple-500/50"
                >
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleVote(post.id, 1)}
                      className={`text-lg leading-none transition ${
                        myVote === 1 ? 'text-purple-500' : 'text-slate-600 hover:text-white'
                      }`}
                    >
                      ▲
                    </button>
                    <span className="font-display text-sm text-white">{post.upvote_count}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {club && (
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[8px] font-bold"
                          style={{
                            background: `linear-gradient(135deg, ${club.primary}, ${club.secondary})`,
                            color: '#fff',
                          }}
                        >
                          {club.abbr}
                        </div>
                      )}
                      <span className="text-sm text-white truncate">
                        @{post.author?.username ?? 'unknown'}
                      </span>
                      {club && (
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 shrink-0">
                          {club.abbr}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-display text-lg leading-snug text-white">
                      &ldquo;{post.content}&rdquo;
                    </p>
                    <div className="mt-2 font-mono text-[10px] text-slate-600">
                      {new Date(post.created_at).toLocaleString()}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
