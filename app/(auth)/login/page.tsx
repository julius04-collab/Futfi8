'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      const targetRoute = '/hot-takes'

      router.push(targetRoute)
      router.refresh()

      window.location.href = targetRoute
    } catch (error) {
      console.error('AUTH_FAILURE_DETAILED:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      setLoading(false)
    }
  }

  function getSiteUrl() {
    if (typeof window !== 'undefined') return window.location.origin
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${getSiteUrl()}/auth/callback` },
    })

    setGoogleLoading(false)

    if (oauthError) {
      setError(oauthError.message)
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-normal tracking-wide text-foreground">FUTFI8</h1>
        <p className="mt-1 text-sm text-muted">The football. The fight.</p>
      </div>

      <div
        className="rounded-xl p-6"
        style={{
          background: 'var(--futfi8-color-background-surface)',
          border: '1px solid var(--futfi8-color-border-default)',
        }}
      >
        <h2 className="mb-6 text-center text-lg font-normal text-foreground">Sign in</h2>

        {error && (
          <div
            className="mb-4 rounded-lg px-4 py-2 text-sm"
            style={{
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.3)',
              color: 'var(--futfi8-color-state-loss)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md px-4 py-3 text-sm outline-none transition-all placeholder:text-sm bg-slate-900/50 border border-slate-800 text-white placeholder-slate-500 focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md px-4 py-3 text-sm outline-none transition-all placeholder:text-sm bg-slate-900/50 border border-slate-800 text-white placeholder-slate-500 focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-4 py-3 text-sm font-black tracking-wide uppercase transition-all duration-200 disabled:opacity-50 bg-accent text-background hover:opacity-90 shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'var(--futfi8-color-border-subtle)' }} />
          <span className="text-xs font-medium uppercase tracking-wider text-muted">or</span>
          <div className="h-px flex-1" style={{ background: 'var(--futfi8-color-border-subtle)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium transition-all duration-200 disabled:opacity-50"
          style={{
            background: '#111113',
            color: 'var(--futfi8-color-text-primary)',
            border: '1px solid var(--futfi8-color-border-default)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1A1A1D'
            e.currentTarget.style.borderColor = 'var(--futfi8-color-border-subtle)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#111113'
            e.currentTarget.style.borderColor = 'var(--futfi8-color-border-default)'
          }}
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium hover:underline" style={{ color: 'var(--futfi8-color-text-accent)' }}>
          Create one
        </Link>
      </p>
    </>
  )
}
