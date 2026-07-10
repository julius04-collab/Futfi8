'use client'

import { useState, useRef, useMemo } from 'react'
import { useCreatePost } from '@/hooks/use-create-post'
import { UpcomingFixtures } from '@/components/locker-room/UpcomingFixtures'

interface ClubInfo {
  id: string
  short_name: string
  name: string
  primary_color: string
  secondary_color: string
  crest_url?: string
}

interface AuthorInfo {
  id: string
  username: string
  avatar_url: string | null
  home_club_id: string | null
}

type LiveMatchTeam = {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

type LiveMatchData = {
  id: number
  utcDate: string
  status: string
  homeTeam: LiveMatchTeam
  awayTeam: LiveMatchTeam
  score: { fullTime: { home: number | null; away: number | null } }
}

interface Post {
  id: string
  created_at: string
  content: string
  author_id: string
  author: AuthorInfo | null
}

type Props = {
  initialClubs: ClubInfo[]
  initialPosts: Post[]
  userId: string
  username: string | null
  avatarUrl: string | null
  liveMatches: LiveMatchData[]
}

export function HotTakesClient({ initialClubs, initialPosts, userId, username, liveMatches }: Props) {
  const [clubMap, setClubMap] = useState<Record<string, ClubInfo>>(() => {
    const map: Record<string, ClubInfo> = {}
    for (const club of initialClubs) map[club.id] = club
    return map
  })
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const { createPost, isSubmitting } = useCreatePost()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClubFilter, setSelectedClubFilter] = useState('ALL CLUBS')
  const [postContent, setPostContent] = useState('')

  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const chipsContainerRef = useRef<HTMLDivElement>(null)

  const getClubShortName = (author: AuthorInfo | null): string => {
    if (!author?.home_club_id) return ''
    const club = clubMap[author.home_club_id]
    return club?.short_name ?? ''
  }

  const handleCreatePost = async () => {
    if (!postContent.trim() || !userId || isSubmitting) return
    const result = await createPost({
      content: postContent.trim(),
      type: 'hot_take',
    })
    if (result.success && result.data) {
      setPosts([result.data as Post, ...posts])
    } else {
      setPosts([{
        id: Math.random().toString(),
        created_at: new Date().toISOString(),
        content: postContent.trim(),
        author_id: userId,
        author: {
          id: userId,
          username: username ?? '',
          avatar_url: null,
          home_club_id: null,
        },
      }, ...posts])
    }
    setPostContent('')
  }

  const handleChipsScroll = () => {
    if (chipsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = chipsContainerRef.current
      setShowLeftArrow(scrollLeft > 15)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 15)
    }
  }

  const scrollChips = (direction: 'left' | 'right') => {
    if (chipsContainerRef.current) {
      chipsContainerRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' })
    }
  }

  const filteredPosts = posts.filter(post => {
    const shortName = getClubShortName(post.author)
    const textMatch = post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.author?.username || '').toLowerCase().includes(searchQuery.toLowerCase())
    const clubMatch = selectedClubFilter === 'ALL CLUBS' || shortName === selectedClubFilter
    return textMatch && clubMatch
  })

  const clubCodes = useMemo(() => {
    const seen = new Set<string>()
    const codes: string[] = []
    for (const club of Object.values(clubMap)) {
      if (!seen.has(club.short_name)) {
        seen.add(club.short_name)
        codes.push(club.short_name)
      }
    }
    return ['ALL CLUBS', ...codes]
  }, [clubMap])

  return (
    <div className="flex-1 flex w-full">

      {/* MAIN FEED */}
      <main className="flex-1 min-h-screen border-r border-[#1e2230] flex flex-col w-full max-w-[780px] bg-[#0b0c10]">
        <header className="sticky top-0 bg-[#0b0c10]/85 backdrop-blur-md border-b border-[#1e2230] px-4 py-3.5 z-10">
          <h2 className="text-xl font-bold text-white tracking-tight">The Hot Take Board</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Every club. Every fan. One main feed.</p>
        </header>

        {userId && (
          <div className="border-b border-[#1e2230] p-4 flex gap-3 bg-[#0d0e12]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xs uppercase text-white shadow-sm flex-shrink-0">
              {username?.substring(0, 2) || '??'}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's happening in football today?"
                maxLength={280}
                className="w-full bg-transparent text-white text-[15px] placeholder-zinc-600 focus:outline-none resize-none pt-1 min-h-[44px] max-h-[160px] scrollbar-none"
              />
              <div className="flex justify-between items-center pt-2 border-t border-zinc-900/50">
                <div className="flex items-center gap-4 text-[#a855f7]">
                  <button className="hover:bg-purple-950/20 p-1.5 rounded-full transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                </div>
                <button
                  onClick={handleCreatePost}
                  disabled={isSubmitting || !postContent.trim()}
                  className="px-5 py-1.5 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-purple-950/30 disabled:text-purple-400/40 text-white font-bold text-xs uppercase tracking-wider rounded-full transition duration-150 flex-shrink-0"
                >
                  {isSubmitting ? 'Posting...' : 'Drop Take'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Club Capsule Filter Row with HOVER CHEVRONS */}
        <div className="relative border-b border-[#1e2230] bg-[#0b0c10] group">
          {showLeftArrow && (
            <button
              onClick={() => scrollChips('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#12141c]/80 hover:bg-[#a855f7] border border-[#1e2230] rounded-full flex items-center justify-center text-white transition duration-150 z-20 pointer-events-auto hidden group-hover:flex"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {showRightArrow && (
            <button
              onClick={() => scrollChips('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#12141c]/80 hover:bg-[#a855f7] border border-[#1e2230] rounded-full flex items-center justify-center text-white transition duration-150 z-20 pointer-events-auto hidden group-hover:flex"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          <div
            ref={chipsContainerRef}
            onScroll={handleChipsScroll}
            className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none select-none transition-all duration-150 scroll-smooth"
          >
            {clubCodes.map((club) => (
              <button
                key={club}
                onClick={() => setSelectedClubFilter(club)}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-full transition duration-150 flex-shrink-0 border ${
                  selectedClubFilter === club
                    ? 'bg-[#a855f7] text-white border-transparent'
                    : 'bg-zinc-900/60 text-gray-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                }`}
              >
                {club}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 divide-y divide-[#1e2230]">
          {filteredPosts.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-10 h-10 text-zinc-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <p className="text-sm text-gray-500">No matching hot takes found in this room grid.</p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const shortName = getClubShortName(post.author)
              return (
                <article key={post.id} className="p-4 flex gap-3 hover:bg-zinc-950/20 transition duration-100">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xs uppercase text-white shadow-sm flex-shrink-0">
                    {post.author?.username?.substring(0, 2) || '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate max-w-[140px]">
                        {post.author?.username || 'Football Fan'}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        @{post.author?.username}
                      </span>
                      {shortName && (
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-purple-400 rounded uppercase tracking-wider flex-shrink-0">
                          {shortName}
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] text-gray-200 mt-1.5 leading-normal whitespace-pre-wrap select-text">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-8 text-gray-600 mt-4">
                      <button className="flex items-center gap-1.5 text-xs hover:text-[#a855f7] transition group">
                        <svg className="w-4 h-4 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <span>0</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-xs hover:text-red-500 transition group">
                        <svg className="w-4 h-4 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        <span>0</span>
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-[320px] h-screen sticky top-0 hidden lg:flex flex-col gap-4 px-4 py-6 overflow-y-auto scrollbar-none z-10 flex-shrink-0">
        <div className="relative sticky top-0 bg-[#0b0c10] pb-2 z-10">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trending takes..."
            className="w-full py-3 pl-12 pr-4 bg-[#12141c] border border-[#1e2230] text-sm text-white placeholder-zinc-500 rounded-full focus:outline-none focus:border-[#a855f7] transition"
          />
          <svg className="w-5 h-5 text-zinc-600 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        <div className="bg-[#12141c] border border-[#1e2230] rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-extrabold tracking-tight text-white uppercase text-xs font-mono">Live on Matchday</h3>
            {liveMatches.length > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
          </div>
          {liveMatches.length > 0 ? (
            <div className="space-y-3 divide-y divide-zinc-900/40">
              {liveMatches.map((m) => {
                const isPaused = m.status === 'PAUSED'
                const isInPlay = m.status === 'IN_PLAY'
                return (
                  <div key={m.id} className="pt-2 flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-1 font-semibold text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-gray-600 rounded flex items-center justify-center text-[10px] text-white font-bold">{m.homeTeam.tla?.slice(0, 1) ?? '?'}</span>
                        <span>{m.homeTeam.shortName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-gray-600 rounded flex items-center justify-center text-[10px] text-white font-bold">{m.awayTeam.tla?.slice(0, 1) ?? '?'}</span>
                        <span>{m.awayTeam.shortName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 font-mono text-white">
                      <span>{m.score.fullTime.home ?? '-'}</span>
                      <span>{m.score.fullTime.away ?? '-'}</span>
                      <span className={`text-[10px] font-bold tracking-wider ${isInPlay ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                        {isPaused ? 'HT' : isInPlay ? 'LIVE' : m.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-xs text-gray-500">No matches live right now</p>
            </div>
          )}
        </div>

        <div className="bg-[#12141c] border border-[#1e2230] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 pb-2"><h3 className="text-md font-bold tracking-tight text-white">Football Trending</h3></div>
          <div className="p-4">
            <p className="text-xs text-gray-500">Trending topics will appear here once matchday action heats up.</p>
          </div>
        </div>

        <UpcomingFixtures />
      </aside>

    </div>
  )
}
