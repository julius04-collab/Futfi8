'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
        if (!cancelled) router.push('/login')
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
    { href: '/locker-room', label: 'Locker Room', icon: 'locker' },
    { href: '/hot-takes', label: 'Hot Takes', icon: 'flame' },
    { href: '/explore', label: 'Explore', icon: 'explore' },
    { href: '/notifications', label: 'Notifications', icon: 'bell' },
    { href: '/profile', label: 'Profile', icon: 'user' },
  ] as const

  function isActive(href: string) {
    if (href === '/locker-room') return pathname.startsWith('/locker-room')
    return pathname.startsWith(href)
  }

  const iconSVG = (icon: string, active: boolean) => {
    const cls = 'w-6 h-6'
    switch (icon) {
      case 'locker':
        return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      case 'flame':
        return <svg className={`${cls} ${active ? 'text-[#a855f7]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
      case 'explore':
        return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      case 'bell':
        return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
      case 'user':
        return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-[#0b0c10]">
        <LoadingBar />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white flex justify-center selection:bg-purple-500/30 overflow-x-hidden pb-16 md:pb-0">
      <div className="w-full max-w-[1250px] flex px-0 sm:px-4 md:px-0">

        {/* DESKTOP SIDEBAR — hidden on mobile, icon-only on md, full on lg */}
        <aside className="hidden md:flex w-[80px] lg:w-[275px] h-screen sticky top-0 flex-col justify-between border-r border-[#1e2230] px-2 lg:px-4 py-6 z-10 flex-shrink-0">
          <div className="space-y-6">
            <div className="px-3 flex items-center gap-2 cursor-pointer justify-center lg:justify-start" onClick={() => router.push('/hot-takes')}>
              <h1 className="text-2xl font-medium tracking-tight text-white select-none hidden lg:block">
                FUT<span className="text-[#a855f7]">FI8</span>
              </h1>
              <div className="lg:hidden text-2xl font-medium text-[#a855f7]">FI8</div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href)
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center justify-center lg:justify-start gap-4 px-3 py-3 rounded-full transition duration-150 hover:bg-zinc-900/50 hover:text-white font-medium text-lg ${
                      active ? 'bg-zinc-900/50 text-white font-semibold' : 'text-gray-300'
                    }`}
                    title={item.label}
                  >
                    {iconSVG(item.icon, active)}
                    <span className="hidden lg:inline">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <button
              onClick={() => setShowPostModal(true)}
              className="w-full py-3 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold tracking-wide uppercase rounded-full transition duration-150 shadow-md shadow-purple-500/10 active:scale-[0.98] flex items-center justify-center"
            >
              <span className="hidden lg:inline">Drop Take</span>
              <span className="lg:hidden">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </span>
            </button>
          </div>

          <div className="relative" ref={profileMenuRef}>
            {showProfileMenu && (
              <div className="absolute bottom-16 left-0 w-full lg:w-[250px] bg-[#12141c] border border-[#1e2230] rounded-2xl p-2.5 shadow-2xl z-20">
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
              className="w-full flex items-center justify-between p-2 lg:p-3 rounded-full hover:bg-zinc-900/50 cursor-pointer transition duration-150 select-none border border-transparent hover:border-zinc-800 justify-center lg:justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar src={profile?.avatar_url} name={profile?.username || '?'} size={40} />
                <div className="text-left leading-tight hidden lg:block">
                  <p className="text-sm font-semibold text-white truncate max-w-[110px]">{profile?.username || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate max-w-[110px]">@{profile?.username || 'user'}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-500 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
            </div>
          </div>
        </aside>

        {/* MOBILE TOP HEADER */}
        <header className="md:hidden w-full h-[56px] fixed top-0 left-0 bg-[#0b0c10]/95 backdrop-blur-md border-b border-[#1e2230] px-4 flex items-center justify-between z-30">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white uppercase text-xs" onClick={() => setShowProfileMenu(true)}>
            {profile?.username ? profile.username.substring(0, 2) : 'FI'}
          </div>
          <h1 className="text-xl font-medium tracking-tight text-white select-none">
            FUT<span className="text-[#a855f7]">FI8</span>
          </h1>
          <button
            onClick={() => setShowPostModal(true)}
            className="w-8 h-8 rounded-full bg-[#a855f7] flex items-center justify-center text-white shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          </button>
        </header>

        {/* CORE CONTENT */}
        <div className="flex-1 flex pt-[56px] md:pt-0 pb-[58px] md:pb-0">
          {children}
        </div>

      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-[58px] bg-[#0b0c10]/95 backdrop-blur-md border-t border-[#1e2230] flex items-center justify-around z-30 px-2">
        {navItems.slice(0, 4).map((item) => {
          const active = isActive(item.href)
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center ${active ? 'text-[#a855f7]' : 'text-gray-400'}`}
            >
              {iconSVG(item.icon, active)}
              <span className="text-[10px] mt-0.5">{item.label}</span>
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
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500">Draft Take</h4>
              <div className="w-5 h-5" />
            </div>

            <div className="p-4 flex gap-3">
              <Avatar src={profile?.avatar_url} name={profile?.username || '?'} size={36} />
              <div className="flex-1 space-y-4">
                <textarea
                  value={modalPostContent}
                  onChange={(e) => setModalPostContent(e.target.value)}
                  placeholder="Drop a hot take..."
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
                    {submitting ? 'Posting...' : 'Drop Take'}
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
