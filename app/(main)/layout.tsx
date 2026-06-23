'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Flame, Bell, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingBar } from '@/components/ui/LoadingBar'

interface Profile {
  id: string
  username: string
  avatar_url?: string | null
  home_club_id?: string | null
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showPostModal, setShowPostModal] = useState(false)
  const [modalPostContent, setModalPostContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [homeLockerRoomId, setHomeLockerRoomId] = useState<string | null>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.push('/login')
          return
        }
        supabase
          .from('users')
          .select('id, username, avatar_url, home_club_id')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (cancelled) return
            if (data) {
              setProfile(data)
              if (data.home_club_id) {
                supabase
                  .from('locker_rooms')
                  .select('id')
                  .eq('club_id', data.home_club_id)
                  .maybeSingle()
                  .then(({ data: lr }) => {
                    if (lr?.id) setHomeLockerRoomId(lr.id)
                  })
              }
            }
            setLoading(false)
          })
      })
      .catch(() => {
        if (!cancelled) {
          router.push('/login')
        }
      })
    return () => { cancelled = true }
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCreatePostFromModal = async () => {
    if (!modalPostContent.trim() || !profile) return
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
          content: modalPostContent.trim(),
          type: 'hot_take',
        }),
      })
      if (res.ok) {
        setModalPostContent('')
        setShowPostModal(false)
      }
    } catch (err) {
      console.error('Failed to create post:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const navItems = [
    { href: '/locker-room', label: 'Locker Room', icon: Home },
    { href: '/hot-takes', label: 'Hot Takes', icon: Flame },
    { href: '/notifications', label: 'Alerts', icon: Bell },
    { href: '/profile', label: 'Profile', icon: User },
  ]

  function isActive(href: string) {
    if (href === '/locker-room') return pathname.startsWith('/locker-room')
    return pathname.startsWith(href)
  }

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-[#0b0c10]">
        <LoadingBar />
      </div>
    )
  }

  return (
    <div className="flex min-h-full bg-[#0b0c10]">
      {/* LEFT SIDEBAR — Desktop */}
      <aside className="hidden md:flex w-[275px] h-screen sticky top-0 flex-col justify-between border-r border-[#1e2230] px-4 py-6 z-10">
        <div className="space-y-6">
          <div className="px-3 flex items-center gap-2 cursor-pointer" onClick={() => router.push('/hot-takes')}>
            <h1 className="text-2xl font-medium tracking-tight text-white select-none">
              FUT<span className="text-[#a855f7]">FI8</span>
            </h1>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-4 px-3 py-3 rounded-full transition duration-150 hover:bg-zinc-900/50 hover:text-white text-lg ${
                    active
                      ? 'bg-zinc-900/50 text-white font-semibold'
                      : 'text-gray-300 font-medium'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${active && item.href === '/hot-takes' ? 'text-[#a855f7]' : ''}`} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <button
            onClick={() => setShowPostModal(true)}
            className="w-full py-3.5 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold tracking-wide uppercase rounded-full transition duration-150 shadow-md shadow-purple-500/10 active:scale-[0.98]"
          >
            Post
          </button>
        </div>

        <div className="relative" ref={profileMenuRef}>
          {showProfileMenu && (
            <div className="absolute bottom-16 left-0 w-full bg-[#12141c] border border-[#1e2230] rounded-2xl p-2.5 shadow-2xl z-20">
              <button className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-zinc-800/40 rounded-lg transition text-gray-300 hover:text-white font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Add existing account</span>
              </button>
              <div className="h-[1px] bg-[#1e2230] my-1.5" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-red-950/20 text-red-400 hover:text-red-300 rounded-lg transition font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Log out @{profile?.username || 'user'}</span>
              </button>
            </div>
          )}

          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between p-3 rounded-full hover:bg-zinc-900/50 cursor-pointer transition duration-150 select-none border border-transparent hover:border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <Avatar src={profile?.avatar_url} name={profile?.username || '?'} size={40} />
              <div className="text-left leading-tight hidden xl:block">
                <p className="text-sm font-semibold text-white truncate max-w-[110px]">{profile?.username || 'User'}</p>
                <p className="text-xs text-gray-500 truncate max-w-[110px]">@{profile?.username || 'user'}</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT — page controls its own columns */}
      <div className="flex-1 flex">
        {children}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0b0c10]/80 backdrop-blur-md border-t border-[#1e2230] flex items-center justify-around px-4 z-40">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 ${
                active ? 'text-[#a855f7]' : 'text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* GLOBAL POST MODAL */}
      {showPostModal && (
        <div className="fixed inset-0 bg-[#050508]/80 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-[520px] bg-[#12141c] border border-[#1e2230] rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2230]">
              <button
                onClick={() => {
                  setModalPostContent('')
                  setShowPostModal(false)
                }}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500">Draft Hot Take</h4>
              <div className="w-5 h-5" />
            </div>

            <div className="p-4 flex gap-3">
              <Avatar src={profile?.avatar_url} name={profile?.username || '?'} size={36} />
              <div className="flex-1 space-y-4">
                <textarea
                  value={modalPostContent}
                  onChange={(e) => setModalPostContent(e.target.value)}
                  placeholder="What is your latest hot football take?"
                  maxLength={280}
                  className="w-full bg-transparent text-white text-[16px] placeholder-zinc-600 focus:outline-none resize-none pt-1 min-h-[120px]"
                  autoFocus
                />
                <div className="flex justify-between items-center pt-3 border-t border-[#1e2230]">
                  <div className="flex items-center gap-4 text-[#a855f7]">
                    <button className="hover:bg-purple-950/20 p-1.5 rounded-full transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                  <button
                    onClick={handleCreatePostFromModal}
                    disabled={submitting || !modalPostContent.trim()}
                    className="px-6 py-2 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-purple-950/30 disabled:text-purple-400/40 text-white font-bold text-xs uppercase tracking-wider rounded-full transition duration-150"
                  >
                    {submitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
