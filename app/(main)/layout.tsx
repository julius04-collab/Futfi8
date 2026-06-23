'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { Home, Flame, Bell, User, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingBar } from '@/components/ui/LoadingBar'

const NAV_ITEMS = [
  { href: '/locker-room', label: 'Locker Room', icon: Home },
  { href: '/hot-takes', label: 'Hot Takes', icon: Flame },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
] as const

function clearAuthState() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('sb-') || key.startsWith('supabase-'))) {
      keys.push(key)
    }
  }
  keys.forEach((k) => localStorage.removeItem(k))
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [homeClubId, setHomeClubId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
          .select('home_club_id, username, avatar_url')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (!cancelled) {
              if (data) {
                setHomeClubId(data.home_club_id)
                setUsername(data.username || '')
                setAvatarUrl(data.avatar_url)
              }
              setLoading(false)
            }
          })
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthState()
          window.location.href = '/login'
        }
      })
    return () => { cancelled = true }
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div
        className="flex min-h-full flex-1 items-center justify-center"
        style={{ background: 'var(--futfi8-color-background-base)' }}
      >
        <LoadingBar />
      </div>
    )
  }

  const lockerRoomHref = homeClubId ? `/locker-room/${homeClubId}` : '/hot-takes'

  function navigate(item: (typeof NAV_ITEMS)[number]) {
    router.push(item.href)
  }

  function isActive(item: (typeof NAV_ITEMS)[number]) {
    if (item.href === '/locker-room') {
      return pathname.startsWith('/locker-room')
    }
    return pathname.startsWith(item.href)
  }

  return (
    <div className="flex min-h-full bg-background text-foreground">
      {/* Desktop Sidebar — md+ */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 bg-background border-r border-border/40 flex-col justify-between p-6 z-40">
        <div>
          <Link href={lockerRoomHref} prefetch={false} className="text-left">
            <div className="flex flex-col">
              <span className="text-white font-sans font-medium tracking-tight text-lg">
                FUT<span className="text-[#a855f7]">FI8</span>
              </span>
              <span className="text-[11px] text-white/50 font-sans tracking-wide">
                The football. The fight.
              </span>
            </div>
          </Link>

          <nav className="mt-10 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item)
              const Icon = item.icon
              const sharedClasses = `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors`
              const sharedStyle = {
                color: active
                  ? 'var(--futfi8-color-text-accent)'
                  : 'var(--futfi8-color-text-muted)',
                background: active
                  ? 'rgba(155, 110, 255, 0.08)'
                  : 'transparent',
                borderLeft: active
                  ? '3px solid var(--futfi8-color-brand-electric-purple)'
                  : '3px solid transparent',
              } as React.CSSProperties

              if (item.href === '/locker-room') {
                return (
                  <Link
                    key={item.href}
                    href="/locker-room"
                    className={`${sharedClasses} text-left`}
                    style={sharedStyle}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                )
              }

              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item)}
                  className={`${sharedClasses} text-left`}
                  style={sharedStyle}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 border-t border-border/30 pt-4">
          <Avatar src={avatarUrl} name={username || '?'} size={36} />
          <span
            className="flex-1 truncate text-sm font-medium"
            style={{ color: 'var(--futfi8-color-text-secondary)' }}
          >
            {username || 'User'}
          </span>
          <button
            onClick={handleSignOut}
            className="shrink-0 rounded-lg p-2 transition-colors"
            style={{ color: 'var(--futfi8-color-text-muted)' }}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav — below md */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-md border-t border-border/30 flex items-center justify-around px-4 z-40">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          const iconColor = active
            ? 'var(--futfi8-color-text-accent)'
            : 'var(--futfi8-color-text-muted)'

          const content = (
            <>
              <Icon className="h-5 w-5" style={{ color: iconColor }} />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: iconColor }}
              >
                {item.label}
              </span>
            </>
          )

          if (item.href === '/locker-room') {
            return (
              <Link
                key={item.href}
                href="/locker-room"
                className="flex flex-col items-center gap-0.5 py-1 px-3"
              >
                {content}
              </Link>
            )
          }

          return (
            <button
              key={item.href}
              onClick={() => navigate(item)}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
            >
              {content}
            </button>
          )
        })}
      </nav>

      {/* Main Content — X-Style 3-Column Architecture */}
      <main className="flex flex-row items-start justify-start w-full max-w-7xl mx-auto md:pl-64 text-white">
        {/* Center Feed Column */}
        <div className="max-w-[600px] w-full border-r border-slate-800/60 min-h-screen">
          {children}
        </div>

        {/* Right Widget Sidebar — lg+ */}
        <aside className="hidden lg:block w-[350px] p-6">
          <div className="sticky top-6 flex flex-col gap-4">
            <div
              className="rounded-xl border p-4"
              style={{
                background: 'var(--futfi8-color-background-surface)',
                borderColor: 'var(--futfi8-color-border-default)',
              }}
            >
              <h2
                className="mb-3 text-sm font-bold"
                style={{
                  color: 'var(--futfi8-color-text-primary)',
                  fontFamily: 'var(--futfi8-typography-font-family-display)',
                }}
              >
                Active Locker Rooms
              </h2>
              <div className="flex flex-col gap-3">
                {[
                  { club: 'Arsenal', tag: '#COYG', posts: '12K' },
                  { club: 'Liverpool', tag: '#YNWA', posts: '8.4K' },
                  { club: 'Manchester City', tag: '#MCI', posts: '6.1K' },
                  { club: 'Chelsea', tag: '#CFC', posts: '5.7K' },
                ].map((item) => (
                  <div key={item.club}>
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'var(--futfi8-color-text-primary)' }}
                    >
                      {item.club}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs"
                        style={{ color: 'var(--futfi8-color-text-muted)' }}
                      >
                        {item.tag}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: 'var(--futfi8-color-text-muted)' }}
                      >
                        {item.posts} posts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
