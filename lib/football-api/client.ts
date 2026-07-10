import { PREMIER_LEAGUE_CODE } from '@/lib/constants'

export const CURRENT_SEASON = 2024

const API_BASE = 'https://api.football-data.org/v4'

export type MatchStatus = 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'AWARDED' | 'SUSPENDED'

export type FootballDataTeam = {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

export type FootballDataScore = {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  fullTime: { home: number | null; away: number | null }
  halfTime: { home: number | null; away: number | null }
}

export type FootballDataMatch = {
  id: number
  utcDate: string
  status: MatchStatus
  matchday: number
  stage: string
  group: string | null
  lastUpdated: string
  homeTeam: FootballDataTeam
  awayTeam: FootballDataTeam
  score: FootballDataScore
}

type MatchesResponse = {
  count: number
  competition: { id: number; name: string; code: string }
  matches: FootballDataMatch[]
}

type TeamsResponse = {
  count: number
  competition: { id: number; name: string; code: string }
  teams: FootballDataTeam[]
}

async function apiRequest<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    throw new Error('FOOTBALL_DATA_API_KEY is not configured')
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'X-Auth-Token': apiKey,
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`football-data.org error: ${response.status} ${response.statusText} — ${body}`)
  }

  return response.json()
}

export async function getCompetitionMatches(
  status?: MatchStatus | `${MatchStatus},${MatchStatus}`,
  dateFrom?: string,
  dateTo?: string,
  limit: number = 50,
): Promise<FootballDataMatch[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  if (limit) params.set('limit', String(limit))

  const qs = params.toString()
  const data = await apiRequest<MatchesResponse>(`/competitions/${PREMIER_LEAGUE_CODE}/matches${qs ? `?${qs}` : ''}`)
  return data.matches
}

export async function getCompetitionTeams(): Promise<FootballDataTeam[]> {
  const data = await apiRequest<TeamsResponse>(`/competitions/${PREMIER_LEAGUE_CODE}/teams`)
  return data.teams
}

export async function getTeamMatches(
  teamId: number,
  limit: number = 10,
  status?: MatchStatus | `${MatchStatus},${MatchStatus}`,
): Promise<FootballDataMatch[]> {
  const params = new URLSearchParams()
  if (limit) params.set('limit', String(limit))
  if (status) params.set('status', status)

  const qs = params.toString()
  const data = await apiRequest<MatchesResponse>(`/teams/${teamId}/matches${qs ? `?${qs}` : ''}`)
  return data.matches
}

export async function getFixtureById(fixtureId: number): Promise<FootballDataMatch | null> {
  try {
    const data = await apiRequest<{ match: FootballDataMatch }>(`/matches/${fixtureId}`)
    return data.match
  } catch {
    return null
  }
}

export async function getLiveFixtures(): Promise<FootballDataMatch[]> {
  return getCompetitionMatches('IN_PLAY,PAUSED')
}

export async function getUpcomingFixtures(days: number = 7): Promise<FootballDataMatch[]> {
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + days)

  const from = today.toISOString().split('T')[0]
  const to = endDate.toISOString().split('T')[0]

  return getCompetitionMatches('SCHEDULED,TIMED', from, to)
}

export async function getFixturesByDate(date: string): Promise<FootballDataMatch[]> {
  return getCompetitionMatches(undefined, date, date)
}

export async function getTeamFixtures(teamId: number, limit: number = 5): Promise<FootballDataMatch[]> {
  return getTeamMatches(teamId, limit, 'SCHEDULED,TIMED')
}

export async function getLiveMatchesWidget(): Promise<FootballDataMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY is not configured')

  const baseUrl = `${API_BASE}/competitions/${PREMIER_LEAGUE_CODE}/matches`
  const headers = { 'X-Auth-Token': apiKey }

  const liveRes = await fetch(`${baseUrl}?status=LIVE`, { headers, next: { revalidate: 60 } })
  if (liveRes.ok) {
    const data: MatchesResponse = await liveRes.json()
    if (data.count > 0) return data.matches
  }

  const inPlayRes = await fetch(`${baseUrl}?status=IN_PLAY`, { headers, next: { revalidate: 60 } })
  if (inPlayRes.ok) {
    const data: MatchesResponse = await inPlayRes.json()
    if (data.count > 0) return data.matches
  }

  return []
}

export function isMatchFinished(status: MatchStatus): boolean {
  return status === 'FINISHED' || status === 'AWARDED'
}

export function isMatchLive(status: MatchStatus): boolean {
  return status === 'IN_PLAY' || status === 'PAUSED'
}
