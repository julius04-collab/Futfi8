'use client'

import { useEffect, useState } from 'react'
import type { FootballDataMatch } from '@/lib/football-api/client'

function formatDate(utcDate: string): string {
  const d = new Date(utcDate)
  const now = new Date()
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const datePart =
    diffDays === 0
      ? 'Today'
      : diffDays === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${datePart}, ${timePart}`
}

export function UpcomingFixtures() {
  const [matches, setMatches] = useState<FootballDataMatch[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/football/upcoming')
      .then((r) => r.json())
      .then((data) => {
        if (data.matches) setMatches(data.matches)
        else setError(true)
      })
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="bg-[#12141c] border border-[#1e2230] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 pb-2 border-b border-[#1e2230]/50">
          <h3 className="text-md font-bold tracking-tight text-white">Upcoming Fixtures</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500">Unable to load fixtures right now.</p>
        </div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="bg-[#12141c] border border-[#1e2230] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 pb-2 border-b border-[#1e2230]/50">
          <h3 className="text-md font-bold tracking-tight text-white">Upcoming Fixtures</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500">No upcoming matches scheduled.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#12141c] border border-[#1e2230] rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 pb-2 border-b border-[#1e2230]/50">
        <h3 className="text-md font-bold tracking-tight text-white">Upcoming Fixtures</h3>
      </div>
      <div className="p-4 space-y-3.5">
        {matches.map((m) => (
          <div key={m.id} className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
              {formatDate(m.utcDate)}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <img
                src={m.homeTeam.crest}
                alt=""
                className="w-4 h-4 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span className="font-semibold text-gray-100 flex-1">{m.homeTeam.shortName || m.homeTeam.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <img
                src={m.awayTeam.crest}
                alt=""
                className="w-4 h-4 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span className="font-semibold text-gray-100 flex-1">{m.awayTeam.shortName || m.awayTeam.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
