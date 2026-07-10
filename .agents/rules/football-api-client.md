---
trigger: always_on
---

# Futfi8 Football Data API Client & Typings Setup

## Overview
Futfi8 uses API-Football (via RapidAPI) as the primary data orchestrator for fixtures, live scores, and match result processing. The integration is polling-based—not webhook-based—ensuring predictable error states and simplified isolation tracking during your 30-day MVP build challenge.

---

## Shared Provider Channels
- **Primary Platform Engine:** API-Football by API-Sports via RapidAPI. Quota limits evaluate at 100 queries/day on free bounds, upgrading to the $10/month plan for high-frequency matchday polling loops.
- **Fallback Platform Engine:** Football-Data.org. Limited to 10 queries/minute. Used strictly for passive match result confirmations if the primary provider pipeline encounters down states.

---

## Core API Client Wrapper Module

```ts
// lib/api-football/client.ts
const BASE_URL = '[https://api-football-v1.p.rapidapi.com/v3](https://api-football-v1.p.rapidapi.com/v3)'
const PREMIER_LEAGUE_ID = 39   // API-Football league ID for EPL
const CURRENT_SEASON = 2025    // Dynamic tracking identifier

const headers = {
  'X-RapidAPI-Key': process.env.FOOTBALL_API_KEY!,
  'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
}

async function apiFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  let attempts = 0
  const MAX_ATTEMPTS = 3

  while (attempts < MAX_ATTEMPTS) {
    try {
      const res = await fetch(url.toString(), {
        headers,
        next: { revalidate: 0 }, // Enforce revalidate: 0 to bypass Next.js route caching
      })

      if (!res.ok) {
        throw new Error(`API-Football error: ${res.status} ${res.statusText}`)
      }

      const json = await res.json()

      if (json.errors && Object.keys(json.errors).length > 0) {
        throw new Error(`API-Football errors: ${JSON.stringify(json.errors)}`)
      }

      const remaining = res.headers.get('X-RateLimit-Requests-Remaining')
      const limit = res.headers.get('X-RateLimit-Requests-Limit')
      console.info('[API-Football] Quota Metrics', { remaining, limit })

      return json.response as T
    } catch (err) {
      attempts++
      if (attempts === MAX_ATTEMPTS) throw err
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts)) // Exponential backoff
    }
  }

  throw new Error('API-Football: max retries exceeded')
}

export const footballApi = {
  getFixtures: async (options: { from?: string; to?: string; status?: string }) => {
    return apiFetch<ApiFixture[]>('/fixtures', {
      league: String(PREMIER_LEAGUE_ID),
      season: String(CURRENT_SEASON),
      ...(options.from && { from: options.from }),
      ...(options.to && { to: options.to }),
      ...(options.status && { status: options.status }),
    })
  },
  getLiveFixtures: async () => {
    return apiFetch<ApiFixture[]>('/fixtures', {
      league: String(PREMIER_LEAGUE_ID),
      season: String(CURRENT_SEASON),
      live: 'all',
    })
  },
  getFixtureById: async (fixtureId: number) => {
    const results = await apiFetch<ApiFixture[]>('/fixtures', { id: String(fixtureId) })
    return results[0] ?? null
  }
}
Typing Definitions & Status Mappings
TypeScript
// types/api-football.types.ts
interface ApiFixture {
  fixture: {
    id: number           // Maps directly to matches.api_match_id in Postgres
    status: {
      short: string      // NS | 1H | HT | 2H | ET | P | FT | AET | PEN | PST | CANC
      elapsed: number | null
    }
    date: string         // ISO 8601 UTC string format
  }
  league: { id: number; name: string; season: number }
  teams: {
    home: { id: number; name: string; winner: boolean | null }
    away: { id: number; name: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
}
Internal Status Translator Engine
TypeScript
// lib/api-football/map-status.ts
export function mapFixtureStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' | 'postponed' {
  const liveStatuses = ['1H', 'HT', '2H', 'ET', 'P', 'BT']
  const finishedStatuses = ['FT', 'AET', 'PEN']
  const postponedStatuses = ['PST', 'CANC', 'ABD', 'AWD', 'WO']

  if (liveStatuses.includes(apiStatus)) return 'live'
  if (finishedStatuses.includes(apiStatus)) return 'finished'
  if (postponedStatuses.includes(apiStatus)) return 'postponed'
  return 'scheduled'
}
Daily Calendar Sync Automation Runner
Executes at midnight (0 0 * * *) via backend scheduler tasks to query upcoming calendars.

TypeScript
// app/api/cron/sync-fixtures/route.ts
import { NextResponse } from 'next/server'
import { footballApi } from '@/lib/api-football/client'
import { upsertMatch } from '@/lib/api-football/upsert-match'

export async function GET() {
  const today = new Date()
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    const fixtures = await footballApi.getFixtures({
      from: today.toISOString().split('T')[0],
      to: sevenDaysLater.toISOString().split('T')[0],
    })

    for (const fixture of fixtures) {
      await upsertMatch(fixture)
    }
    return NextResponse.json({ success: true, count: fixtures.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}