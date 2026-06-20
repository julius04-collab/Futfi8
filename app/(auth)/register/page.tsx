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

const CREST_MAP: Record<string, string> = {
  'Arsenal': 'arsenal',
  'Aston Villa': 'aston-villa',
  'Bournemouth': 'bournemouth',
  'Brentford': 'brentford',
  'Brighton & Hove Albion': 'brighton',
  'Chelsea': 'chelsea',
  'Coventry City': 'coventry-city',
  'Crystal Palace': 'crystal-palace',
  'Everton': 'everton',
  'Fulham': 'fulham',
  'Hull City': 'hull-city',
  'Ipswich Town': 'ipswich-town',
  'Leeds United': 'leeds-united',
  'Liverpool': 'liverpool',
  'Manchester City': 'manchester-city',
  'Manchester United': 'manchester-united',
  'Newcastle United': 'newcastle-united',
  'Nottingham Forest': 'nottingham-forest',
  'Sunderland A.F.C.': 'sunderland',
  'Tottenham Hotspur': 'tottenham-hotspur',
}

function crestUrl(clubName: string) {
  const slug = CREST_MAP[clubName]
  return slug ? `/Images/crests/${slug}.png` : null
}

export default function RegisterPage() {
  const router = useRouter()
  const [registerStep, setRegisterStep] = useState(1)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [homeClubId, setHomeClubId] = useState('')
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
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

  function validateStep1(): boolean {
    const errs: Record<string, string> = {}

    if (!username.trim() || username.trim().length < 3) {
      errs.username = 'Username must be at least 3 characters'
    }
    if (!email.trim()) {
      errs.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Enter a valid email address'
    }
    if (!password || password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleContinue() {
    if (validateStep1()) {
      setRegisterStep(2)
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    if (!homeClubId) {
      setFieldErrors({ club: 'Please select your home club' })
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
          home_club_id: homeClubId,
          is_under_16: false,
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

      <div className="rounded-xl border border-zinc-800 bg-black p-6">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className={`h-2 w-2 rounded-full ${registerStep === 1 ? 'bg-purple-500' : 'bg-zinc-700'}`} />
          <span className="h-px w-8 bg-zinc-800" />
          <span className={`h-2 w-2 rounded-full ${registerStep === 2 ? 'bg-purple-500' : 'bg-zinc-700'}`} />
        </div>

        <h2 className="mb-6 text-center text-lg font-normal text-foreground">
          {registerStep === 1 ? 'Your details' : 'Pick your club'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {registerStep === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Username</label>
              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.username; return n }) }}
                className={`w-full rounded-lg border bg-black px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-1 ${
                  fieldErrors.username
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-zinc-800 focus:border-purple-500 focus:ring-purple-500/30'
                }`}
                autoFocus
              />
              {fieldErrors.username && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.email; return n }) }}
                className={`w-full rounded-lg border bg-black px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-1 ${
                  fieldErrors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-zinc-800 focus:border-purple-500 focus:ring-purple-500/30'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Password</label>
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => { const n = { ...p }; delete n.password; return n }) }}
                className={`w-full rounded-lg border bg-black px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-1 ${
                  fieldErrors.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-zinc-800 focus:border-purple-500 focus:ring-purple-500/30'
                }`}
              />
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-lg bg-purple-600 py-3 text-sm font-medium text-white transition-all hover:bg-purple-500"
            >
              Continue
            </button>
          </div>
        )}

        {registerStep === 2 && (
          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            {clubsLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-zinc-500">Loading clubs...</div>
            ) : (
              <div className="grid grid-cols-4 gap-2.5">
                {clubs.map((club) => {
                  const isSelected = homeClubId === club.id
                  const crest = crestUrl(club.name)
                  return (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => { setHomeClubId(club.id); setFieldErrors({}) }}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500'
                          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-600'
                      }`}
                    >
                      <div
                        className="flex items-center justify-center rounded-sm overflow-hidden"
                        style={{ width: 40, height: 40 }}
                      >
                        {crest ? (
                          <img src={crest} alt={club.short_name} className="h-full w-full object-contain" />
                        ) : (
                          <span className="font-display text-xs text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                            {club.short_name?.slice(0, 3).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-zinc-400 leading-tight text-center">
                        {club.short_name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {fieldErrors.club && (
              <p className="text-xs text-red-400 text-center -mt-2">{fieldErrors.club}</p>
            )}

            <button
              type="submit"
              disabled={loading || !homeClubId}
              className="w-full rounded-lg bg-purple-600 py-3 text-sm font-medium text-white transition-all hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium hover:underline text-purple-400">
          Sign in
        </Link>
      </p>
    </>
  )
}
