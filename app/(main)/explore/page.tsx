'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useHomeClub } from '@/hooks/use-home-club'
import { LoadingBar } from '@/components/ui/LoadingBar'

type Club = {
  id: string
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
  crest_url?: string
}

type UserResult = {
  id: string
  username: string
  avatar_url: string | null
  home_club_id: string | null
}

type PostResult = {
  id: string
  content: string
  created_at: string
  author: { id: string; username: string; avatar_url: string | null } | null
}

type SearchMode = 'clubs' | 'fans' | 'takes'

export default function ExplorePage() {
  const router = useRouter()
  const { isLoading: authLoading, userId } = useHomeClub()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('clubs')
  const [fanResults, setFanResults] = useState<UserResult[]>([])
  const [takeResults, setTakeResults] = useState<PostResult[]>([])
  const [searching, setSearching] = useState(false)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      router.replace('/login')
    }
  }, [authLoading, userId, router])

  useEffect(() => {
    async function loadClubs() {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, short_name, primary_color, secondary_color, crest_url')
        .order('name')

      if (!error && data) {
        const seen = new Set<string>()
        const unique = data
          .sort((a, b) => {
            if (a.crest_url && !b.crest_url) return -1
            if (!a.crest_url && b.crest_url) return 1
            return 0
          })
          .filter((club) => {
            const key = club.short_name.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        setClubs(unique)
      }
      setLoading(false)
    }
    loadClubs()
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setFanResults([])
        setTakeResults([])
        return
      }

      setSearching(true)

      if (searchMode === 'fans') {
        const { data } = await supabase
          .from('users')
          .select('id, username, avatar_url, home_club_id')
          .ilike('username', `%${searchQuery}%`)
          .limit(20)
        setFanResults(data || [])
      } else if (searchMode === 'takes') {
        const { data } = await supabase
          .from('posts')
          .select(`
            id, content, created_at,
            author:users!author_id(id, username, avatar_url)
          `)
          .ilike('content', `%${searchQuery}%`)
          .order('created_at', { ascending: false })
          .limit(20)
        setTakeResults((data || []) as unknown as PostResult[])
      }

      setSearching(false)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery, searchMode])

  const filteredClubs = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleClubClick = async (clubId: string) => {
    const { data: lr } = await supabase
      .from('locker_rooms')
      .select('id')
      .eq('club_id', clubId)
      .maybeSingle()
    if (lr?.id) {
      router.push(`/locker-room/${clubId}`)
    }
  }

  function formatTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <LoadingBar />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen">
      {/* Header */}
      <header className="sticky top-0 bg-[#0b0c10]/90 backdrop-blur-md border-b border-[#1e2230] px-4 py-3.5 z-10">
        <h2 className="text-xl font-bold text-white tracking-tight">Explore</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">Discover clubs, fans & takes</p>
      </header>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchMode === 'clubs'
                ? 'Search clubs by name or code...'
                : searchMode === 'fans'
                  ? 'Search fans by username...'
                  : 'Search takes by content...'
            }
            className="w-full py-3 pl-12 pr-4 bg-[#12141c] border border-[#1e2230] text-sm text-white placeholder-zinc-500 rounded-full focus:outline-none focus:border-[#a855f7] transition"
          />
          <svg
            className="w-5 h-5 text-zinc-600 absolute left-4 top-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Search Mode Tabs */}
        <div className="flex gap-2 mt-3">
          {(['clubs', 'fans', 'takes'] as SearchMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSearchMode(mode)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition duration-150 border ${
                searchMode === mode
                  ? 'bg-[#a855f7] text-white border-transparent'
                  : 'bg-zinc-900/60 text-gray-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-4 py-3">
        {searchMode === 'clubs' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredClubs.map((club) => (
              <button
                key={club.id}
                onClick={() => handleClubClick(club.id)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-[#1e2230] bg-[#12141c] hover:border-[#a855f7]/40 hover:bg-[#12141c]/80 transition-all duration-200 group cursor-pointer"
                style={{
                  background: `linear-gradient(160deg, ${club.primary_color}08, transparent)`,
                }}
              >
                {club.crest_url && !brokenImages.has(club.id) ? (
                  <img
                    src={club.crest_url}
                    alt={club.short_name}
                    className="h-12 w-12 object-contain group-hover:scale-110 transition-transform duration-200"
                    onError={() =>
                      setBrokenImages((prev) => new Set(prev).add(club.id))
                    }
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold group-hover:scale-110 transition-transform duration-200"
                    style={{
                      background: club.primary_color,
                      color: club.secondary_color || '#fff',
                    }}
                  >
                    {club.short_name.slice(0, 3)}
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs font-semibold text-white truncate max-w-[100px]">
                    {club.name}
                  </p>
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                    style={{ color: club.primary_color }}
                  >
                    {club.short_name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {searchMode === 'fans' && (
          <div className="space-y-1">
            {searching ? (
              <div className="flex justify-center py-12">
                <LoadingBar />
              </div>
            ) : !searchQuery.trim() ? (
              <div className="text-center py-16">
                <svg className="w-10 h-10 text-zinc-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-sm text-gray-500">Search for fans by username</p>
              </div>
            ) : fanResults.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-gray-500">No fans found matching &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              fanResults.map((fan) => (
                <div
                  key={fan.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-900/40 transition cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xs uppercase text-white shadow-sm flex-shrink-0">
                    {fan.username.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{fan.username}</p>
                    <p className="text-xs text-gray-500">@{fan.username}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {searchMode === 'takes' && (
          <div className="space-y-1 divide-y divide-[#1e2230]">
            {searching ? (
              <div className="flex justify-center py-12">
                <LoadingBar />
              </div>
            ) : !searchQuery.trim() ? (
              <div className="text-center py-16">
                <svg className="w-10 h-10 text-zinc-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-gray-500">Search for takes by content</p>
              </div>
            ) : takeResults.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-gray-500">No takes found matching &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              takeResults.map((post) => (
                <article key={post.id} className="p-3 flex gap-3 hover:bg-zinc-950/20 transition duration-100">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xs uppercase text-white shadow-sm flex-shrink-0">
                    {post.author?.username?.substring(0, 2) || '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {post.author?.username || 'Fan'}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {formatTime(post.created_at)}
                      </span>
                    </div>
                    <p className="text-[14px] text-gray-200 mt-1 leading-normal whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
