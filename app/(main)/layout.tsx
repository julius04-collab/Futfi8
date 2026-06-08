'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Flame, Bell, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/locker-room', label: 'Locker Room', icon: Home },
  { href: '/hot-takes', label: 'Hot Takes', icon: Flame },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
] as const

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [homeClubId, setHomeClubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      supabase
        .from('users')
        .select('home_club_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (!cancelled && data?.home_club_id) {
            setHomeClubId(data.home_club_id)
          }
        })
        .then(() => {
          if (!cancelled) setLoading(false)
        })
    })
    return () => { cancelled = true }
  }, [router])

  if (loading) {
    return (
      <div
        className="flex min-h-full flex-1 items-center justify-center"
        style={{ background: 'var(--futfi8-color-background-base)' }}
      >
        <div
          className="h-1 w-32 overflow-hidden rounded-full"
          style={{ background: 'var(--futfi8-color-background-input)' }}
        >
          <div
            className="h-full w-1/3 animate-pulse rounded-full"
            style={{ background: 'var(--futfi8-color-brand-electric-purple)' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-full flex-col"
      style={{ background: 'var(--futfi8-color-background-base)' }}
    >
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid var(--futfi8-color-border-default)',
          background: 'var(--futfi8-color-background-surface)',
        }}
      >
        <Link href={homeClubId ? `/locker-room/${homeClubId}` : '/hot-takes'}>
          <span
            className="text-lg font-bold tracking-tight"
            style={{
              fontFamily: 'var(--futfi8-typography-font-family-display)',
              color: 'var(--futfi8-color-text-primary)',
            }}
          >
            FUTFI8
          </span>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <nav
        className="flex items-center justify-around px-2 py-1"
        style={{
          background: 'var(--futfi8-color-background-surface)',
          borderTop: '1px solid var(--futfi8-color-border-default)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const href =
            item.href === '/locker-room' && homeClubId
              ? `/locker-room/${homeClubId}`
              : item.href

          return (
            <Link
              key={item.href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 transition-colors"
              style={{
                color: isActive
                  ? 'var(--futfi8-color-text-accent)'
                  : 'var(--futfi8-color-text-muted)',
              }}
            >
              <item.icon className="h-5 w-5" />
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--futfi8-typography-font-family-label)',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
