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
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    router.prefetch('/hot-takes')
  }, [router])

  async function handleCompleteOnboarding() {
    if (!selectedClubId) return

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.id) {
        router.push('/login')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          home_club_id: selectedClubId,
          bio: bio.trim() || null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      router.refresh()
      router.push('/hot-takes')
    } catch (err) {
      console.error('Onboarding failed:', err)
      setError('Failed to save your club selection. Please try again.')
    }
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
        <h1 className="text-3xl font-medium tracking-tight text-white">
          FUT<span className="text-[#a855f7]">FI8</span>
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

        <div className="grid grid-cols-5 gap-3">
          {clubs.map((club) => {
            const isSelected = selectedClubId === club.id
            return (
              <button
                key={club.id}
                onClick={() => setSelectedClubId(club.id)}
                className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-center transition-all duration-150"
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
                    className="h-8 w-8 object-contain"
                    onError={() => setBrokenImages((prev) => new Set(prev).add(club.id))}
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
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

        <div className="mt-8 w-full max-w-md mx-auto space-y-4">
          <div className="text-left">
            <span className="text-xs font-mono tracking-widest text-gray-500 uppercase">03 &bull; BIO (OPTIONAL)</span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="One line. Make it count."
            maxLength={160}
            className="w-full min-h-[50px] p-4 bg-[#12141c] border border-[#1e2230] text-sm text-white rounded-lg focus:outline-none focus:border-[#a855f7] transition resize-none"
          />
          <button
            onClick={handleCompleteOnboarding}
            disabled={!selectedClubId}
            className="w-full py-4 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold tracking-wider uppercase rounded-md transition duration-150 ease-in-out text-sm shadow-lg shadow-purple-500/10"
          >
            ENTER THE ROOM &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
