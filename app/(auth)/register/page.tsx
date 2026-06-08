'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

type Club = {
  id: string
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [homeClubId, setHomeClubId] = useState('')
  const [isUnder16, setIsUnder16] = useState(false)
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [clubsLoading, setClubsLoading] = useState(true)

  useEffect(() => {
    async function fetchClubs() {
      const { data, error: fetchError } = await supabase
        .from('clubs')
        .select('id, name, short_name, primary_color, secondary_color')
        .order('name')

      if (!fetchError && data) {
        setClubs(data)
      }
      setClubsLoading(false)
    }
    fetchClubs()
  }, [])

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          home_club_id: homeClubId || null,
          is_under_16: isUnder16,
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    router.push('/login?verified=false')
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

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
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

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
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

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
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

          <div>
            <label
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--futfi8-color-text-secondary)' }}
            >
              Home club
            </label>
            {clubsLoading ? (
              <div
                className="flex items-center justify-center rounded-lg px-4 py-3"
                style={{
                  background: 'var(--futfi8-color-background-input)',
                  border: '1px solid var(--futfi8-color-border-default)',
                }}
              >
                <span
                  className="text-sm"
                  style={{ color: 'var(--futfi8-color-text-muted)' }}
                >
                  Loading clubs...
                </span>
              </div>
            ) : (
              <select
                value={homeClubId}
                onChange={(e) => setHomeClubId(e.target.value)}
                className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
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
              >
                <option value="">Pick your club</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
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
            {loading ? 'Creating account...' : 'Create account'}
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
