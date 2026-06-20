'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.push(redirectTo)
    router.refresh()
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
      options: {
        redirectTo: `${getSiteUrl()}/api/auth/callback`,
      },
    })

    setGoogleLoading(false)

    if (oauthError) {
      setError(oauthError.message)
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1
          className="text-4xl font-extrabold tracking-tight"
          style={{ fontFamily: 'var(--futfi8-typography-font-family-display)' }}
        >
          FUTFI8
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--futfi8-color-text-muted)' }}
        >
          The football. The fight.
        </p>
      </div>

      <div
        className="rounded-xl p-6"
        style={{
          background: 'var(--futfi8-color-background-surface)',
          border: '1px solid var(--futfi8-color-border-default)',
        }}
      >
        <h2
          className="mb-6 text-center text-lg font-semibold"
          style={{ color: 'var(--futfi8-color-text-primary)' }}
        >
          Sign in
        </h2>

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
            autoComplete="email"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder:text-sm"
            style={{
              background: 'var(--futfi8-color-background-input)',
              color: 'var(--futfi8-color-text-primary)',
              border: '1px solid var(--futfi8-color-border-default)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--futfi8-color-border-accent)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--futfi8-color-border-default)'
            }}
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg px-4 py-3 pr-12 text-sm outline-none transition-colors placeholder:text-sm"
              style={{
                background: 'var(--futfi8-color-background-input)',
                color: 'var(--futfi8-color-text-primary)',
                border: '1px solid var(--futfi8-color-border-default)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--futfi8-color-border-accent)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--futfi8-color-border-default)'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'var(--futfi8-color-text-muted)' }}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: 'var(--futfi8-color-ui-cta-primary)',
              color: 'var(--futfi8-color-ui-cta-text)',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{ background: 'var(--futfi8-color-border-subtle)' }}
          />
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--futfi8-color-text-muted)' }}
          >
            or
          </span>
          <div
            className="h-px flex-1"
            style={{ background: 'var(--futfi8-color-border-subtle)' }}
          />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            background: 'var(--futfi8-color-background-base)',
            color: 'var(--futfi8-color-text-primary)',
            border: '1px solid var(--futfi8-color-border-default)',
          }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>
      </div>

      <p
        className="mt-6 text-center text-sm"
        style={{ color: 'var(--futfi8-color-text-muted)' }}
      >
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          style={{ color: 'var(--futfi8-color-text-accent)' }}
          className="font-medium hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
