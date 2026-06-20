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
  const [homeClubId, setHomeClubId] = useState('')
  const [isUnder16, setIsUnder16] = useState(false)
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clubsLoading, setClubsLoading] = useState(true)

  useEffect(() => {
    async function fetchClubs() {
      const { data, error: fetchError } = await supabase
        .from('clubs')
        .select('id, name, short_name, primary_color, secondary_color')
        .order('name')

      if (!fetchError && data) {
        setClubs(data.filter((c) => c.name !== 'Brighton & Hove Albion'))
      }
      setClubsLoading(false)
    }
    fetchClubs()
  }, [])

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError('')

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
    <>
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-normal tracking-wide text-foreground">FUTFI8</h1>
        <p className="mt-1 text-sm text-muted">Join the community</p>
      </div>

      <div
        className="rounded-xl p-6"
        style={{
          background: 'var(--futfi8-color-background-surface)',
          border: '1px solid var(--futfi8-color-border-default)',
        }}
      >
        <h2 className="mb-6 text-center text-lg font-normal text-foreground">Create account</h2>

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
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Username</label>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="border border-slate-800 bg-slate-900/40 text-white rounded-md h-11 px-4 focus:border-accent focus:ring-1 focus:ring-accent w-full outline-none transition-all placeholder:text-sm placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-slate-800 bg-slate-900/40 text-white rounded-md h-11 px-4 focus:border-accent focus:ring-1 focus:ring-accent w-full outline-none transition-all placeholder:text-sm placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border border-slate-800 bg-slate-900/40 text-white rounded-md h-11 px-4 pr-10 focus:border-accent focus:ring-1 focus:ring-accent w-full outline-none transition-all placeholder:text-sm placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
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
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Home club</label>
            {clubsLoading ? (
              <div className="flex items-center justify-center border border-slate-800 bg-slate-900/40 text-muted rounded-md h-11 px-4 text-sm">
                Loading clubs...
              </div>
            ) : (
              <select
                value={homeClubId}
                onChange={(e) => setHomeClubId(e.target.value)}
                className="border border-slate-800 bg-slate-900/40 text-white rounded-md h-11 px-4 focus:border-accent focus:ring-1 focus:ring-accent w-full outline-none transition-all"
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
              style={{ accentColor: 'var(--futfi8-color-brand-electric-purple)' }}
            />
            <span className="text-sm text-muted">I am under 16 years old</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-background font-black tracking-wide uppercase h-12 rounded-md hover:opacity-90 transition-all w-full disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--futfi8-color-text-accent)' }}>
          Sign in
        </Link>
      </p>
    </>
  )
}
