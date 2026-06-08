'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setChecking(false)
        return
      }
      supabase
        .from('users')
        .select('home_club_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.home_club_id) {
            router.push(`/locker-room/${data.home_club_id}`)
          } else {
            router.push('/hot-takes')
          }
        })
    })
  }, [router])

  if (checking) {
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
      className="flex min-h-full flex-1 flex-col items-center justify-center px-4"
      style={{ background: 'var(--futfi8-color-background-base)' }}
    >
      <div className="text-center">
        <h1
          className="text-6xl font-extrabold tracking-tight"
          style={{
            fontFamily: 'var(--futfi8-typography-font-family-display)',
            color: 'var(--futfi8-color-text-primary)',
          }}
        >
          FUTFI8
        </h1>
        <p
          className="mt-2 text-lg"
          style={{ color: 'var(--futfi8-color-text-secondary)' }}
        >
          The football. The fight.
        </p>
        <p
          className="mx-auto mt-4 max-w-xs text-sm leading-relaxed"
          style={{ color: 'var(--futfi8-color-text-muted)' }}
        >
          Premier League fan community. Locker rooms, raids, and reputation.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/register"
            className="w-56 rounded-lg px-6 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--futfi8-color-ui-cta-primary)',
              color: 'var(--futfi8-color-ui-cta-text)',
            }}
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="w-56 rounded-lg px-6 py-3 text-center text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              background: 'transparent',
              color: 'var(--futfi8-color-text-secondary)',
              border: '1px solid var(--futfi8-color-border-default)',
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
