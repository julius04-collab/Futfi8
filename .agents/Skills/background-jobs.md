# background-jobs.md — Background Jobs & Cron Tasks

## Overview

Futfi8's matchday engine runs on background jobs. Match threads opening,
raid windows triggering, Fan Cred recalculating, weekly digests sending —
none of this happens from user actions. It all runs on scheduled cron jobs
and event-driven tasks.

A failing cron job on matchday is a product failure. These jobs must be
reliable, observable, and resilient to partial failures.

When vibecoding this feature, always have these files active:
- `project.md`
- `database-mechanics.md`
- `database-schema.md`
- `football-api-client.md`
- `football-api-polling.md`
- `notifications-logic.md`
- `notifications-types.md`
- `error-handling.md`

---

## Cron Job Overview

| Job | Schedule | Purpose |
|---|---|---|
| `poll-matches` | `*/2 * * * *` | Poll API-Football for live scores and results |
| `close-raid-windows` | `*/5 * * * *` | Close expired raid windows |
| `open-match-threads` | `*/5 * * * *` | Open scheduled match threads + snapshot eligibility |
| `sync-fixtures` | `0 0 * * *` | Pull next 7 days of fixtures from API-Football |
| `recalculate-cred` | `0 0 * * *` | Daily Fan Cred score recalculation |
| `weekly-digest` | `0 10 * * 0` | Send weekly email digest every Sunday 10am WAT |

---

## Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/poll-matches",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/close-raid-windows",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/open-match-threads",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/sync-fixtures",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/recalculate-cred",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 10 * * 0"
    }
  ]
}
```

All cron routes verify the `CRON_SECRET` header before processing.
Vercel automatically sends this header when invoking cron endpoints.

---

## Auth Pattern for All Cron Routes

```ts
// Standard cron auth check — use at top of every cron route
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}
```

---

## Job 1: `poll-matches`

**Schedule:** Every 2 minutes
**File:** `app/api/cron/poll-matches/route.ts`
**Purpose:** Fetch live scores from API-Football, update match records,
trigger status transition side effects.

```ts
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    skipped: false,
    processed: 0,
    failed: 0,
    errors: [] as string[],
    startedAt: new Date().toISOString(),
    finishedAt: '',
  }

  try {
    const supabase = createSupabaseServiceClient()

    // Only poll when matches are live or about to kick off
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const { data: activeMatches } = await supabase
      .from('matches')
      .select('id')
      .or(`status.eq.live,and(status.eq.scheduled,kickoff_at.lte.${fiveMinutesFromNow})`)

    if (!activeMatches || activeMatches.length === 0) {
      results.skipped = true
      results.finishedAt = new Date().toISOString()
      return NextResponse.json(results)
    }

    // Fetch live fixtures from API-Football
    const apiFixtures = await footballApi.getLiveFixtures()

    // Process each fixture — catch individual errors, don't fail the whole job
    const settled = await Promise.allSettled(
      apiFixtures.map(fixture => processFixtureUpdate(fixture))
    )

    settled.forEach(result => {
      if (result.status === 'fulfilled') {
        results.processed++
      } else {
        results.failed++
        results.errors.push(result.reason?.message ?? 'Unknown error')
        console.error('[cron/poll-matches] Fixture error', result.reason)
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    results.errors.push(message)
    console.error('[cron/poll-matches] Fatal error', { error: message })
  }

  results.finishedAt = new Date().toISOString()

  // Return 500 only if everything failed — partial failure is OK
  const status = results.failed > 0 && results.processed === 0 ? 500 : 200
  return NextResponse.json(results, { status })
}
```

---

## Job 2: `close-raid-windows`

**Schedule:** Every 5 minutes
**File:** `app/api/cron/close-raid-windows/route.ts`
**Purpose:** Find raid windows where `closes_at <= now()` and
`status = 'active'` — close them, archive posts, update Fan Cred.

```ts
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    closed: 0,
    failed: 0,
    errors: [] as string[],
    startedAt: new Date().toISOString(),
    finishedAt: '',
  }

  try {
    const supabase = createSupabaseServiceClient()

    const { data: expiredWindows } = await supabase
      .from('raid_windows')
      .select(`
        *,
        raiding_club:clubs!raiding_club_id(name, slug),
        defending_club:clubs!defending_club_id(name, slug)
      `)
      .eq('status', 'active')
      .lte('closes_at', new Date().toISOString())

    if (!expiredWindows || expiredWindows.length === 0) {
      results.finishedAt = new Date().toISOString()
      return NextResponse.json(results)
    }

    for (const window of expiredWindows) {
      try {
        // 1. Close the window
        await supabase
          .from('raid_windows')
          .update({ status: 'closed' })
          .eq('id', window.id)

        // 2. Recalculate Fan Cred for all participants
        await recalculateRaidCred(window.id)

        // 3. Notify both clubs
        await notifyRaidClosed(window)

        results.closed++

        console.info('[cron/close-raid-windows] Closed', {
          raidWindowId: window.id,
          raiding: window.raiding_club.name,
          defending: window.defending_club.name,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.failed++
        results.errors.push(`RaidWindow ${window.id}: ${message}`)
        console.error('[cron/close-raid-windows] Failed to close window', {
          raidWindowId: window.id,
          error: message,
        })
        // Continue to next window — don't let one failure block others
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    results.errors.push(message)
    console.error('[cron/close-raid-windows] Fatal error', { error: message })
  }

  results.finishedAt = new Date().toISOString()
  const status = results.failed > 0 && results.closed === 0 ? 500 : 200
  return NextResponse.json(results, { status })
}
```

---

## Job 3: `open-match-threads`

**Schedule:** Every 5 minutes
**File:** `app/api/cron/open-match-threads/route.ts`
**Purpose:** Create match threads for fixtures kicking off in the next
35 minutes. Snapshot raid eligibility at kick-off.

```ts
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    threadsCreated: 0,
    snapshotsTaken: 0,
    failed: 0,
    errors: [] as string[],
    startedAt: new Date().toISOString(),
    finishedAt: '',
  }

  try {
    const supabase = createSupabaseServiceClient()
    const now = new Date()
    const window = new Date(now.getTime() + 35 * 60 * 1000)

    // Find matches kicking off within the window
    const { data: upcomingMatches } = await supabase
      .from('matches')
      .select(`
        id, kickoff_at, home_club_id, away_club_id,
        home_club:clubs!home_club_id(id, name),
        away_club:clubs!away_club_id(id, name)
      `)
      .eq('status', 'scheduled')
      .gte('kickoff_at', now.toISOString())
      .lte('kickoff_at', window.toISOString())

    if (!upcomingMatches || upcomingMatches.length === 0) {
      results.finishedAt = new Date().toISOString()
      return NextResponse.json(results)
    }

    for (const match of upcomingMatches) {
      try {
        // Get both locker rooms
        const { data: rooms } = await supabase
          .from('locker_rooms')
          .select('id, club_id')
          .in('club_id', [match.home_club_id, match.away_club_id])

        const kickoff = new Date(match.kickoff_at)
        const opensAt = new Date(kickoff.getTime() - 30 * 60 * 1000)
        const closesAt = new Date(kickoff.getTime() + 120 * 60 * 1000)

        for (const room of rooms ?? []) {
          // Idempotency check — don't create duplicate threads
          const { data: existing } = await supabase
            .from('match_threads')
            .select('id')
            .eq('match_id', match.id)
            .eq('locker_room_id', room.id)
            .single()

          if (existing) continue

          await supabase.from('match_threads').insert({
            match_id: match.id,
            locker_room_id: room.id,
            opens_at: opensAt.toISOString(),
            closes_at: closesAt.toISOString(),
            status: 'open',
          })

          results.threadsCreated++
        }

        // Snapshot raid eligibility for both clubs at this point
        // (represents who is a member at kick-off time)
        const isAtKickoff = Math.abs(now.getTime() - kickoff.getTime()) < 5 * 60 * 1000

        if (isAtKickoff) {
          await snapshotRaidEligibility(match.id)
          results.snapshotsTaken++
        }

        // Notify both clubs their match thread is open
        await notifyMatchThreadOpen(match.id)

        console.info('[cron/open-match-threads] Threads created', {
          matchId: match.id,
          home: match.home_club.name,
          away: match.away_club.name,
          threadsCreated: rooms?.length ?? 0,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.failed++
        results.errors.push(`Match ${match.id}: ${message}`)
        console.error('[cron/open-match-threads] Failed', {
          matchId: match.id,
          error: message,
        })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    results.errors.push(message)
    console.error('[cron/open-match-threads] Fatal error', { error: message })
  }

  results.finishedAt = new Date().toISOString()
  const status = results.failed > 0 && results.threadsCreated === 0 ? 500 : 200
  return NextResponse.json(results, { status })
}
```

---

## Job 4: `sync-fixtures`

**Schedule:** Daily at midnight UTC
**File:** `app/api/cron/sync-fixtures/route.ts`
**Purpose:** Pull next 7 days of EPL fixtures from API-Football and
upsert into the `matches` table.

```ts
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    upserted: 0,
    skipped: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
    finishedAt: '',
  }

  try {
    const today = new Date()
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const fixtures = await footballApi.getFixtures({
      from: today.toISOString().split('T')[0],
      to: sevenDaysLater.toISOString().split('T')[0],
    })

    for (const fixture of fixtures) {
      try {
        await upsertMatch(fixture)
        results.upserted++
      } catch (err) {
        results.failed++
        console.error('[cron/sync-fixtures] Failed to upsert fixture', {
          fixtureId: fixture.fixture.id,
          error: err instanceof Error ? err.message : 'Unknown',
        })
      }
    }
  } catch (err) {
    console.error('[cron/sync-fixtures] Fatal error', {
      error: err instanceof Error ? err.message : 'Unknown',
    })
  }

  results.finishedAt = new Date().toISOString()
  return NextResponse.json(results)
}
```

---

## Job 5: `recalculate-cred`

**Schedule:** Daily at midnight UTC
**File:** `app/api/cron/recalculate-cred/route.ts`
**Purpose:** Recalculate Fan Cred scores for all memberships.
Detect badge unlocks and send notifications.

```ts
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    updated: 0,
    badgesUnlocked: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
    finishedAt: '',
  }

  try {
    const { updated, badgesUnlocked } = await recalculateDailyCred()
    results.updated = updated
    results.badgesUnlocked = badgesUnlocked
  } catch (err) {
    console.error('[cron/recalculate-cred] Fatal error', {
      error: err instanceof Error ? err.message : 'Unknown',
    })
    results.finishedAt = new Date().toISOString()
    return NextResponse.json(results, { status: 500 })
  }

  results.finishedAt = new Date().toISOString()
  return NextResponse.json(results)
}
```

---

## Job 6: `weekly-digest`

**Schedule:** Every Sunday at 10:00 WAT (09:00 UTC)
**File:** `app/api/cron/weekly-digest/route.ts`
**Purpose:** Send weekly email digest to all active members — top posts
from their locker room and upcoming fixtures.

```ts
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    sent: 0,
    skipped: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
    finishedAt: '',
  }

  try {
    const supabase = createSupabaseServiceClient()

    // Get all users who have weekly_digest enabled
    const { data: eligibleUsers } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('weekly_digest', true)

    if (!eligibleUsers || eligibleUsers.length === 0) {
      results.finishedAt = new Date().toISOString()
      return NextResponse.json(results)
    }

    // Get user details + home club for each
    const userIds = eligibleUsers.map(u => u.user_id)
    const { data: users } = await supabase
      .from('users')
      .select(`
        id, username,
        home_club:clubs!home_club_id(id, name, slug)
      `)
      .in('id', userIds)
      .not('home_club_id', 'is', null)

    // Get auth emails for users
    // Note: requires service role — email is in auth.users
    const topHotTakes = await getTopHotTakesForDigest(3)

    // Process in batches of 50 to avoid overwhelming Resend
    const BATCH_SIZE = 50
    for (let i = 0; i < (users?.length ?? 0); i += BATCH_SIZE) {
      const batch = users!.slice(i, i + BATCH_SIZE)

      await Promise.allSettled(
        batch.map(async (user) => {
          try {
            // Get user's email from auth
            const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
            if (!authUser.user?.email) {
              results.skipped++
              return
            }

            // Get top posts from their locker room
            const topPosts = await getTopPostsForDigest(
              user.home_club.id,
              3
            )

            // Get upcoming fixtures for their club
            const upcomingFixtures = await getUpcomingFixtures(
              user.home_club.id,
              3
            )

            await sendWeeklyDigest({
              to: authUser.user.email,
              clubName: user.home_club.name,
              topPosts,
              upcomingFixtures,
              topHotTakes,
            })

            results.sent++
          } catch (err) {
            results.failed++
            console.error('[cron/weekly-digest] Failed for user', {
              userId: user.id,
              error: err instanceof Error ? err.message : 'Unknown',
            })
          }
        })
      )

      // Brief pause between batches — respect Resend rate limits
      if (i + BATCH_SIZE < (users?.length ?? 0)) {
        await sleep(1000)
      }
    }
  } catch (err) {
    console.error('[cron/weekly-digest] Fatal error', {
      error: err instanceof Error ? err.message : 'Unknown',
    })
  }

  results.finishedAt = new Date().toISOString()
  return NextResponse.json(results)
}
```

---

## Idempotency

All cron jobs must be idempotent — safe to run multiple times with
the same outcome. This matters because Vercel may retry failed jobs.

| Job | Idempotency mechanism |
|---|---|
| `poll-matches` | `processFixtureUpdate` skips if no change detected |
| `close-raid-windows` | Only processes `status = 'active'` windows |
| `open-match-threads` | Checks for existing thread before creating |
| `sync-fixtures` | Uses `upsert` with `onConflict: 'api_match_id'` |
| `recalculate-cred` | Full recalculation overwrites — safe to rerun |
| `weekly-digest` | Not fully idempotent — users may receive duplicate emails on retry. Accept this risk for MVP. |

---

## Job Health Monitoring

Log a structured result object from every cron job. This makes it easy
to monitor job health in Vercel logs or a logging service.

```ts
// Standard result shape for all cron jobs
interface CronResult {
  startedAt: string
  finishedAt: string
  processed?: number
  skipped?: boolean
  closed?: number
  sent?: number
  updated?: number
  failed: number
  errors: string[]
}
```

**Failure classification:**
- `failed > 0 && processed === 0` → Full failure → return 500 (Vercel retries)
- `failed > 0 && processed > 0` → Partial failure → return 200 (log, don't retry)
- `failed === 0` → Full success → return 200

---

## Background Jobs Rules

1. All cron routes verify `CRON_SECRET` — never process unauthenticated requests
2. Every job is wrapped in try/catch — no unhandled promise rejections
3. Per-item errors are caught individually — one bad fixture never kills the whole poll
4. All jobs return structured result JSON — even on failure
5. Return 500 only on full failure — partial failure returns 200 with error details
6. All jobs are idempotent — safe to run multiple times
7. `poll-matches` skips API call when no live or imminent matches — saves quota
8. `open-match-threads` checks for existing threads before creating — no duplicates
9. Weekly digest batches in groups of 50 with 1-second pause between batches
10. Log `startedAt` and `finishedAt` on every job — duration is a key health signal
