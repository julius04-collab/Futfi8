# Futfi8 Football Data API Client

## Provider

**football-data.org v4** — used as the sole football data provider. We switched from API-Football (RapidAPI) because their free tier only covers seasons 2022–2024, not the current 2025/26 season. football-data.org's free plan provides access to the 2024 season with 10 requests/minute.

## Configuration

| Variable | Value |
|---|---|
| **Base URL** | `https://api.football-data.org/v4` |
| **Auth header** | `X-Auth-Token` |
| **Env var** | `FOOTBALL_DATA_API_KEY` |
| **League code** | `PL` (Premier League) |
| **Season** | `2024` (current season available on free tier) |
| **Rate limit** | 10 requests/minute (free plan) |

## Source file

`lib/football-api/client.ts`

## Exported functions

### `getCompetitionMatches(status?, dateFrom?, dateTo?, limit?)`
Fetches Premier League matches with optional status filter (e.g. `'IN_PLAY,PAUSED'`, `'FINISHED,AWARDED'`), date range, and limit. Returns `FootballDataMatch[]`.

### `getCompetitionTeams()`
Fetches all Premier League teams. Returns `FootballDataTeam[]`.

### `getTeamMatches(teamId, limit?, status?)`
Fetches matches for a specific team by football-data.org team ID.

### `getFixtureById(fixtureId)`
Fetches a single match by football-data.org fixture ID. Returns `FootballDataMatch | null`.

### `getLiveFixtures()`
Shorthand for `getCompetitionMatches('IN_PLAY,PAUSED')`.

### `getUpcomingFixtures(days?)`
Fetches scheduled/timed matches for the next N days (default 7).

### `getFixturesByDate(date)`
Fetches all matches for a specific date (ISO string `YYYY-MM-DD`).

### `getTeamFixtures(teamId, limit?)`
Fetches upcoming fixtures for a specific team.

### `getLiveMatchesWidget()`
Dedicated endpoint for the live matches widget. Tries `LIVE` status first, falls back to `IN_PLAY`. Returns empty array if none found.

## Helper functions

- **`isMatchFinished(status)`** — returns `true` for `FINISHED | AWARDED`
- **`isMatchLive(status)`** — returns `true` for `IN_PLAY | PAUSED`

## Types

```typescript
type MatchStatus = 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'AWARDED' | 'SUSPENDED'

interface FootballDataMatch {
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

interface FootballDataTeam {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

interface FootballDataScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  fullTime: { home: number | null; away: number | null }
  halfTime: { home: number | null; away: number | null }
}
```

## Internal request function

```typescript
async function apiRequest<T>(endpoint: string): Promise<T>
```

All public functions delegate to `apiRequest`, which:
1. Reads `FOOTBALL_DATA_API_KEY` from env
2. Sets `X-Auth-Token` header
3. Uses `next: { revalidate: 0 }` to bypass Next.js cache
4. Throws on non-OK responses with status text and body

## Season note

`CURRENT_SEASON = 2024` matches the most recent complete season available on football-data.org's free plan. The 2025/26 season data requires a paid plan. When upgrading, change `CURRENT_SEASON` in `lib/football-api/client.ts` and `PREMIER_LEAGUE_SEASON` in `lib/constants.ts`.
