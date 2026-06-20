'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Club = {
  id: string
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
  crest_url?: string
}

export default function PickTeamPage() {
  const router = useRouter()
  const [clubs, setClubs] = useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession()

      if (!session?.session) {
        router.push('/login?redirect=pick-team')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('clubs')
        .select('id, name, short_name, primary_color, secondary_color, crest_url')
        .order('name')

      if (fetchError) {
        setError(fetchError.message)
      } else if (data) {
        const seen = new Set<string>()
        const unique = data
          .sort((a, b) => {
            if (a.crest_url && !b.crest_url) return -1
            if (!a.crest_url && b.crest_url) return 1
            return 0
          })
          .filter((club) => {
            const key = club.short_name.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        setClubs(unique)
      }
      setLoading(false)
    }
    init()
  }, [router])

  async function handleContinue() {
    if (!selectedClubId) return
    setSaving(true)
    setError('')

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ home_club_id: selectedClubId }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Failed to save club')
      setSaving(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-sm" style={{ color: 'var(--futfi8-color-text-muted)' }}>
          Loading clubs...
        </span>
      </div>
    )
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
          className="mb-1 text-center text-lg font-semibold"
          style={{ color: 'var(--futfi8-color-text-primary)' }}
        >
          Pick your club
        </h2>
        <p
          className="mb-6 text-center text-sm"
          style={{ color: 'var(--futfi8-color-text-muted)' }}
        >
          Choose your Premier League home
        </p>

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

        <div className="grid grid-cols-4 gap-3">
          {clubs.map((club) => {
            const isSelected = selectedClubId === club.id
            return (
              <button
                key={club.id}
                onClick={() => setSelectedClubId(club.id)}
                className="flex flex-col items-center gap-2 rounded-lg px-3 py-4 text-center transition-all duration-150"
                style={{
                  background: isSelected
                    ? `${club.primary_color}20`
                    : 'var(--futfi8-color-background-input)',
                  border: `2px solid ${
                    isSelected ? club.primary_color : 'var(--futfi8-color-border-default)'
                  }`,
                }}
              >
                {club.crest_url && !brokenImages.has(club.id) ? (
                  <img
                    src={club.crest_url}
                    alt={club.short_name}
                    className="h-10 w-10 object-contain"
                    onError={() => setBrokenImages((prev) => new Set(prev).add(club.id))}
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      background: club.primary_color,
                      color: club.secondary_color || '#fff',
                    }}
                  >
                    {club.short_name.slice(0, 2)}
                  </div>
                )}
                <span
                  className="text-xs font-medium leading-tight"
                  style={{
                    color: isSelected
                      ? 'var(--futfi8-color-text-primary)'
                      : 'var(--futfi8-color-text-muted)',
                  }}
                >
                  {club.short_name}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedClubId || saving}
          className="mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: 'var(--futfi8-color-ui-cta-primary)',
            color: 'var(--futfi8-color-ui-cta-text)',
          }}
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
