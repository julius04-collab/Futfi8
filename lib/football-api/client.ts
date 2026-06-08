/**
 * API-Football client wrapper.
 * All external football data calls go through this module.
 * Endpoint: https://v3.football.api-sports.io
 * Docs: https://www.api-football.com/documentation-v3
 */

import { PREMIER_LEAGUE_ID, PREMIER_LEAGUE_SEASON } from '@/lib/constants'

const API_BASE = 'https://v3.football.api-sports.io'

type ApiFootballResponse<T> = {
  response: T[]
  errors: Record<string, string>
  results: number
}

type FixtureStatus = {
  long: string
  short: string
  elapsed: number | null
}

type FixtureTeam = {
  id: number
  name: string
  logo: string
}

type FixtureGoals = {
  home: number | null
  away: number | null
}

export type Fixture = {
  fixture: {
    id: number
    date: string
    timestamp: number
    status: FixtureStatus
  }
  teams: {
    home: FixtureTeam
    away: FixtureTeam
  }
  goals: FixtureGoals
}

async function apiRequest<T>(endpoint: string, params?: Record<string, string>): Promise<ApiFootballResponse<T>> {
  const apiKey = process.env.FOOTBALL_API_KEY
  if (!apiKey) {
    throw new Error('FOOTBALL_API_KEY is not configured')
  }

  const url = new URL(`${API_BASE}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const response = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
    next: { revalidate: 0 }, // never cache API-Football responses
  })

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get fixtures for a specific date (YYYY-MM-DD format).
 * Filters to Premier League only.
 */
export async function getFixturesByDate(date: string): Promise<Fixture[]> {
  const data = await apiRequest<Fixture>('/fixtures', {
    league: String(PREMIER_LEAGUE_ID),
    season: String(PREMIER_LEAGUE_SEASON),
    date,
  })
  return data.response
}

/**
 * Get all currently live Premier League fixtures.
 */
export async function getLiveFixtures(): Promise<Fixture[]> {
  const data = await apiRequest<Fixture>('/fixtures', {
    league: String(PREMIER_LEAGUE_ID),
    season: String(PREMIER_LEAGUE_SEASON),
    live: 'all',
  })
  return data.response
}

/**
 * Get a specific fixture by its API-Football fixture ID.
 */
export async function getFixtureById(fixtureId: number): Promise<Fixture | null> {
  const data = await apiRequest<Fixture>('/fixtures', {
    id: String(fixtureId),
  })
  return data.response[0] ?? null
}

/**
 * Get upcoming fixtures for the next N days.
 */
export async function getUpcomingFixtures(days: number = 7): Promise<Fixture[]> {
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + days)

  const from = today.toISOString().split('T')[0]
  const to = endDate.toISOString().split('T')[0]

  const data = await apiRequest<Fixture>('/fixtures', {
    league: String(PREMIER_LEAGUE_ID),
    season: String(PREMIER_LEAGUE_SEASON),
    from,
    to,
  })
  return data.response
}

/**
 * Get teams for the current Premier League season.
 * Used during seeding to verify API-Football team IDs.
 */
export async function getLeagueTeams(): Promise<{ team: { id: number; name: string } }[]> {
  const data = await apiRequest<{ team: { id: number; name: string } }>('/teams', {
    league: String(PREMIER_LEAGUE_ID),
    season: String(PREMIER_LEAGUE_SEASON),
  })
  return data.response
}

/**
 * Determine if a fixture status means the match is finished.
 * API-Football status codes: FT (Full Time), AET (After Extra Time), PEN (Penalties).
 */
export function isMatchFinished(statusShort: string): boolean {
  return ['FT', 'AET', 'PEN'].includes(statusShort)
}

/**
 * Determine if a fixture status means the match is currently live.
 * API-Football status codes: 1H, HT, 2H, ET, BT, P, SUSP, INT, LIVE.
 */
export function isMatchLive(statusShort: string): boolean {
  return ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(statusShort)
}
