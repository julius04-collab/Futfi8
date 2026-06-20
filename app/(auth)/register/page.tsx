'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUnder16, setIsUnder16] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<{ username?: string; email?: string; password?: string }>({})

  function clearError(field: 'username' | 'email' | 'password') {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError('')

    const errors: { username?: string; email?: string; password?: string } = {}

    if (!username.trim() || username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters'
    }

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          is_under_16: isUnder16,
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    router.push('/pick-team')
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
          Join the community
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
          Create account
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

        <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError('email') }}
              autoComplete="email"
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder:text-sm"
              style={{
                background: 'var(--futfi8-color-background-input)',
                color: 'var(--futfi8-color-text-primary)',
                border: `1px solid ${formErrors.email ? 'rgba(255,107,107,0.4)' : 'var(--futfi8-color-border-default)'}`,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = formErrors.email ? 'rgba(255,107,107,0.6)' : 'var(--futfi8-color-border-accent)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = formErrors.email ? 'rgba(255,107,107,0.4)' : 'var(--futfi8-color-border-default)'
              }}
            />
            {formErrors.email && (
              <span className="mt-1 block text-xs tracking-wide text-red-400">
                {'⚠'} {formErrors.email}
              </span>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearError('username') }}
              minLength={3}
              autoComplete="username"
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder:text-sm"
              style={{
                background: 'var(--futfi8-color-background-input)',
                color: 'var(--futfi8-color-text-primary)',
                border: `1px solid ${formErrors.username ? 'rgba(255,107,107,0.4)' : 'var(--futfi8-color-border-default)'}`,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = formErrors.username ? 'rgba(255,107,107,0.6)' : 'var(--futfi8-color-border-accent)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = formErrors.username ? 'rgba(255,107,107,0.4)' : 'var(--futfi8-color-border-default)'
              }}
            />
            {formErrors.username && (
              <span className="mt-1 block text-xs tracking-wide text-red-400">
                {'⚠'} {formErrors.username}
              </span>
            )}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError('password') }}
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg px-4 py-3 pr-12 text-sm outline-none transition-colors placeholder:text-sm"
                style={{
                  background: 'var(--futfi8-color-background-input)',
                  color: 'var(--futfi8-color-text-primary)',
                  border: `1px solid ${formErrors.password ? 'rgba(255,107,107,0.4)' : 'var(--futfi8-color-border-default)'}`,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = formErrors.password ? 'rgba(255,107,107,0.6)' : 'var(--futfi8-color-border-accent)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = formErrors.password ? 'rgba(255,107,107,0.4)' : 'var(--futfi8-color-border-default)'
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
            {formErrors.password && (
              <span className="mt-1 block text-xs tracking-wide text-red-400">
                {'⚠'} {formErrors.password}
              </span>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-3 py-1">
            <input
              type="checkbox"
              checked={isUnder16}
              onChange={(e) => setIsUnder16(e.target.checked)}
              className="h-4 w-4 rounded"
              style={{
                accentColor: 'var(--futfi8-color-brand-electric-purple)',
              }}
            />
            <span
              className="text-sm"
              style={{ color: 'var(--futfi8-color-text-muted)' }}
            >
              I am under 16 years old
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: 'var(--futfi8-color-ui-cta-primary)',
              color: 'var(--futfi8-color-ui-cta-text)',
            }}
          >
            {loading ? 'Creating account...' : 'Continue'}
          </button>
        </form>
      </div>

      <p
        className="mt-6 text-center text-sm"
        style={{ color: 'var(--futfi8-color-text-muted)' }}
      >
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: 'var(--futfi8-color-text-accent)' }}
          className="font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
