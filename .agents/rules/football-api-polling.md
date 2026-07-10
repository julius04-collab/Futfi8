---
trigger: always_on
---

# Futfi8 Live Polling Architecture & State Mutation Core

## Real-Time Live Polling Route Orchestrator
Dispatched exactly every 2 minutes (`*/2 * * * *`) on active matchdays.

```ts
// app/api/cron/poll-matches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { footballApi } from '@/lib/api-football/client'
import { processFixtureUpdate } from '@/lib/api-football/process-fixture'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseServiceClient()
  const { data: liveMatches } = await supabase.from('matches').select('id, api_match_id').eq('status', 'live')

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const { data: kickingOffSoon } = await supabase
    .from('matches')
    .select('id, api_match_id')
    .eq('status', 'scheduled')
    .lte('kickoff_at', fiveMinutesFromNow)

  const matchesToWatch = [...(liveMatches ?? []), ...(kickingOffSoon ?? [])]

  // Quota Preservation Shield: Immediately step out if zero matches are imminent
  if (matchesToWatch.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'No live or imminent matches' })
  }

  const apiFixtures = await footballApi.getLiveFixtures()
  const results = await Promise.allSettled(apiFixtures.map(fixture => processFixtureUpdate(fixture)))

  const processed = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ processed, failed, total: apiFixtures.length })
}
Ingestion Core Logic Engine
TypeScript
// lib/api-football/process-fixture.ts
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { mapFixtureStatus } from './map-status'
import { onMatchGoesLive, onMatchFinished, onMatchPostponed } from './transitions'

export async function processFixtureUpdate(fixture: any) {
  const supabase = createSupabaseServiceClient()
  const newStatus = mapFixtureStatus(fixture.fixture.status.short)

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('api_match_id', fixture.fixture.id)
    .single()

  if (!match) return

  // Performance Safeguard: Skip updates if status and score matrix are perfectly matched
  if (
    match.status === newStatus &&
    match.home_score === fixture.goals.home &&
    match.away_score === fixture.goals.away
  ) return

  let winnerClubId: string | null = null
  if (newStatus === 'finished') {
    if (fixture.teams.home.winner === true) winnerClubId = match.home_club_id
    if (fixture.teams.away.winner === true) winnerClubId = match.away_club_id
  }

  await supabase
    .from('matches')
    .update({
      status: newStatus,
      home_score: fixture.goals.home,
      away_score: fixture.goals.away,
      winner_club_id: winnerClubId,
      api_last_synced: new Date().toISOString(),
    })
    .eq('id', match.id)

  // Status Edge Transition Triggers
  if (match.status !== 'live' && newStatus === 'live') {
    await onMatchGoesLive(match.id)
  }
  if (match.status !== 'finished' && newStatus === 'finished') {
    await onMatchFinished(match.id, winnerClubId)
  }
  if (match.status !== 'postponed' && newStatus === 'postponed') {
    await onMatchPostponed(match.id)
  }
}
State Transition Hook Pipelines
TypeScript
// lib/api-football/transitions.ts
import { createSupabaseServiceClient } from '@/lib/supabase/server'

export async function onMatchGoesLive(matchId: string) {
  // 1. Instantiates localized match thread containers across locker rooms
  // 2. Commits frozen snapshot of current fans into public.raid_eligibility
  // 3. Dispatches system alerts notifying target clubs that match threads are open
}

export async function onMatchFinished(matchId: string, winnerClubId: string | null) {
  // 1. Shuts down match thread active comment entries parameters
  // 2. Core Rule Execution: If result maps a winner, open a 2-hour record in public.raid_windows
}

export async function onMatchPostponed(matchId: string) {
  // Immediately close match threads safely and flag match status updates
}
Static Club Ingestion Parser
TypeScript
// lib/api-football/upsert-match.ts
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { mapFixtureStatus } from './map-status'

export async function upsertMatch(fixture: any) {
  const supabase = createSupabaseServiceClient()

  const { data: homeClub } = await supabase.from('clubs').select('id').eq('api_team_id', fixture.teams.home.id).single()
  const { data: awayClub } = await supabase.from('clubs').select('id').eq('api_team_id', fixture.teams.away.id).single()

  if (!homeClub || !awayClub) return // Skips leaked cup tie results outside base scope

  await supabase
    .from('matches')
    .upsert({
      home_club_id: homeClub.id,
      away_club_id: awayClub.id,
      kickoff_at: fixture.fixture.date,
      status: mapFixtureStatus(fixture.fixture.status.short),
      home_score: fixture.goals.home,
      away_score: fixture.goals.away,
      api_match_id: fixture.fixture.id,
      api_last_synced: new Date().toISOString(),
    }, {
      onConflict: 'api_match_id',
    })
}
