'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

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

interface Post {
  id: string
  created_at: string
  content: string
  author_id: string
  author: AuthorInfo | null
}

const CLUB_CODES = ['ALL CLUBS', 'ARS', 'AVL', 'BOU', 'BRE', 'BHA', 'CHE', 'COV', 'CRY', 'EVE', 'FUL', 'HUL', 'IPS', 'LEE', 'LIV', 'MCI', 'MUN', 'NEW', 'NFO', 'SUN', 'TOT']

export default function HotTakesDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<AuthorInfo | null>(null)
  const [homeLockerRoomId, setHomeLockerRoomId] = useState<string | null>(null)
  const [clubMap, setClubMap] = useState<Record<string, ClubInfo>>({})
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClubFilter, setSelectedClubFilter] = useState('ALL CLUBS')
  const [postContent, setPostContent] = useState('')

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const [profileRes, clubsRes] = await Promise.all([
          supabase
            .from('users')
            .select('id, username, avatar_url, home_club_id')
            .eq('id', session.user.id)
            .single(),
          supabase
            .from('clubs')
            .select('id, short_name, name, primary_color, secondary_color, crest_url'),
        ])

        if (!profileRes.error && profileRes.data) {
          setProfile(profileRes.data)
          if (profileRes.data.home_club_id) {
            const { data: lr } = await supabase
              .from('locker_rooms')
              .select('id')
              .eq('club_id', profileRes.data.home_club_id)
              .maybeSingle()
            if (lr?.id) setHomeLockerRoomId(lr.id)
          }
        }

        if (!clubsRes.error && clubsRes.data) {
          const map: Record<string, ClubInfo> = {}
          for (const club of clubsRes.data) {
            map[club.id] = club
          }
          setClubMap(map)
        }

        await fetchPosts()
      } catch (err) {
        console.error('Error hydrating dashboard payload:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [router])

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, created_at, content, author_id,
          author:users!author_id(id, username, avatar_url, home_club_id)
        `)
        .eq('type', 'hot_take')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setPosts(data as unknown as Post[])
      }
    } catch {
      // fallback to empty
    }
  }

  const getClubShortName = (author: AuthorInfo | null): string => {
    if (!author?.home_club_id) return ''
    const club = clubMap[author.home_club_id]
    return club?.short_name ?? ''
  }

  const handleCreatePost = async (content: string) => {
    if (!content.trim() || !profile) return
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          locker_room_id: homeLockerRoomId,
          content: content.trim(),
          type: 'hot_take',
        }),
      })

      if (res.ok) {
        const { post } = await res.json()
        if (post) {
          setPosts([post as unknown as Post, ...posts])
        }
      } else {
        const optimisticPost: Post = {
          id: Math.random().toString(),
          created_at: new Date().toISOString(),
          content: content.trim(),
          author_id: profile.id,
          author: {
            id: profile.id,
            username: profile.username,
            avatar_url: null,
            home_club_id: profile.home_club_id,
          },
        }
        setPosts([optimisticPost, ...posts])
      }
      setPostContent('')
    } catch {
      console.error('Failed to submit post')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPosts = posts.filter(post => {
    const shortName = getClubShortName(post.author)
    const textMatch = post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.author?.username || '').toLowerCase().includes(searchQuery.toLowerCase())
    const clubMatch = selectedClubFilter === 'ALL CLUBS' || shortName === selectedClubFilter
    return textMatch && clubMatch
  })

  return (
    <div className="w-full max-w-[1250px] flex">
      {/* MAIN FEED */}
      <main className="flex-1 min-h-screen border-r border-[#1e2230] flex flex-col max-w-[590px]">
        <header className="sticky top-0 bg-[#0b0c10]/80 backdrop-blur-md border-b border-[#1e2230] px-4 py-3.5 z-10">
          <h2 className="text-xl font-bold text-white tracking-tight">The Hot Take Board</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Every club. Every fan. One main feed.</p>
        </header>

        {profile && (
          <div className="border-b border-[#1e2230] p-4 flex gap-3 bg-[#0d0e12]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xs uppercase text-white shadow-sm flex-shrink-0">
              {profile.username.substring(0, 2)}
            </div>

            <div className="flex-1 space-y-2">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What's happening in football today?"
                maxLength={280}
                className="w-full bg-transparent text-white text-[15px] placeholder-zinc-600 focus:outline-none resize-none pt-1 min-h-[44px] max-h-[160px] scrollbar-thin"
              />

              <div className="flex justify-between items-center pt-2 border-t border-zinc-900/50">
                <div className="flex items-center gap-4 text-[#a855f7]">
                  <button className="hover:bg-purple-950/20 p-1.5 rounded-full transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </button>
                  <button className="hover:bg-purple-950/20 p-1.5 rounded-full transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>

                <button
                  onClick={() => handleCreatePost(postContent)}
                  disabled={submitting || !postContent.trim()}
                  className="px-5 py-1.5 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-purple-950/30 disabled:text-purple-400/40 text-white font-bold text-xs uppercase tracking-wider rounded-full transition duration-150 flex-shrink-0"
                >
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-b border-[#1e2230] bg-[#0b0c10] px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none select-none">
          {CLUB_CODES.map((club) => (
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

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-8 h-1 bg-[#1e2230] rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-[#a855f7] rounded-full" />
            </div>
            <p className="text-xs text-gray-500 mt-4 tracking-wider">Hydrating match feeds...</p>
          </div>
        ) : (
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
        )}
      </main>

      {/* COLUMN 3: RIGHT SIDEBAR */}
      <aside className="w-[350px] h-screen sticky top-0 hidden lg:flex flex-col gap-4 px-4 py-6 overflow-y-auto scrollbar-none z-10">
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
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          </div>

          <div className="space-y-3 divide-y divide-zinc-900/40">
            <div className="pt-2 flex items-center justify-between text-xs">
              <div className="flex flex-col gap-1 font-semibold text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-600 rounded flex items-center justify-center text-[10px] text-white font-bold">M</span>
                  <span>Manchester Utd</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center text-[10px] text-white font-bold">A</span>
                  <span>Arsenal</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 font-mono text-white">
                <span>1</span>
                <span>1</span>
                <span className="text-[10px] text-red-500 font-bold tracking-wider animate-pulse">66'</span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between text-xs">
              <div className="flex flex-col gap-1 font-semibold text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[10px] text-white font-bold">C</span>
                  <span>Chelsea</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-sky-400 rounded flex items-center justify-center text-[10px] text-white font-bold">M</span>
                  <span>Manchester City</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 font-mono text-white">
                <span>3</span>
                <span>2</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase">FT</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#12141c] border border-[#1e2230] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 pb-2">
            <h3 className="text-md font-bold tracking-tight text-white">Football Trending</h3>
          </div>

          <div className="divide-y divide-[#1e2230]/50">
            <div className="p-4 hover:bg-zinc-950/20 cursor-pointer transition" onClick={() => setSearchQuery('#AmorimCooking')}>
              <span className="text-[11px] text-gray-500 font-medium">Trending in United Locker Room</span>
              <p className="text-sm font-bold text-white mt-0.5">#AmorimCooking</p>
              <span className="text-[11px] text-[#a855f7] font-semibold mt-1 block">12.5K takes dropped</span>
            </div>

            <div className="p-4 hover:bg-zinc-950/20 cursor-pointer transition" onClick={() => setSearchQuery('Saka')}>
              <span className="text-[11px] text-gray-500 font-medium">Trending in London</span>
              <p className="text-sm font-bold text-white mt-0.5">Saka &amp; Odegaard</p>
              <span className="text-[11px] text-[#a855f7] font-semibold mt-1 block">8.4K takes dropped</span>
            </div>

            <div className="p-4 hover:bg-zinc-950/20 cursor-pointer transition" onClick={() => setSearchQuery('#HaalandBrace')}>
              <span className="text-[11px] text-gray-500 font-medium">Trending Worldwide</span>
              <p className="text-sm font-bold text-white mt-0.5">#HaalandBrace</p>
              <span className="text-[11px] text-[#a855f7] font-semibold mt-1 block">22.1K takes dropped</span>
            </div>
          </div>
        </div>

        <div className="bg-[#12141c] border border-[#1e2230] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 pb-2 border-b border-[#1e2230]/50">
            <h3 className="text-md font-bold tracking-tight text-white">Today's Football News</h3>
          </div>

          <div className="p-4 space-y-3.5">
            <div className="space-y-1 hover:opacity-85 cursor-pointer transition">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Transfer Market</span>
              <p className="text-xs font-bold leading-snug text-gray-100">Arsenal eyes premium striker target in coming window; €80M bid prepared.</p>
            </div>

            <div className="space-y-1 hover:opacity-85 cursor-pointer transition">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Locker Room Raid</span>
              <p className="text-xs font-bold leading-snug text-gray-100">United fans completely raid Chelsea locker room following dynamic 3-1 win!</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
