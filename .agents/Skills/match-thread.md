# match-thread.md — Match Threads

## Overview

Match threads are auto-created discussion spaces that open 30 minutes
before every Premier League fixture and close 2 hours after the final
whistle. They are the heartbeat of Futfi8 on matchday — where fans
drop predictions, react to goals, and deliver post-match verdicts.

Every match creates two threads — one per locker room. Arsenal vs Chelsea
means an Arsenal thread for Arsenal fans and a Chelsea thread for Chelsea
fans. Fans discuss in their own room — the raid mechanic handles
cross-room interaction after the result.

When vibecoding this feature, always have these files active:
- `project.md`
- `database-mechanics.md`
- `database-schema.md`
- `realtime-channels.md`
- `realtime-lifecycle.md`
- `football-api-client.md`
- `football-api-polling.md`
- `access-control.md`

---

## Thread Lifecycle

```
T-30 mins before kick-off
      │
      ├─► Create match_thread records for both clubs (if not exists)
      ├─► Set status = 'open'
      └─► Send "match thread open" notifications to both locker rooms

MATCH IN PROGRESS
      │
      ├─► Members post in their club's thread
      ├─► Realtime subscription delivers new posts live
      └─► Thread phases guide the experience:
          - Pre-match (T-30 to kick-off): predictions, lineup takes
          - Live (kick-off to FT): goal reactions, live takes
          - Post-match (FT to T+2hr): ratings, verdict posts

MATCH FINISHED (or postponed)
      │
      ├─► Set status = 'closed' on both threads
      ├─► If decisive result → raid window creation (see raid-mechanic.skill.md)
      └─► Thread posts remain readable indefinitely — never deleted
```

---

## Thread Phases

The thread has three phases based on match timing. The UI adapts to
each phase — prompts, placeholders, and post starters change accordingly.

| Phase | Time Window | Prompt | Placeholder |
|---|---|---|---|
| Pre-match | T-30 to kick-off | "What's your prediction?" | "Score prediction, starting XI, who's key..." |
| Live | Kick-off to FT | "What just happened?" | "React to the action..." |
| Post-match | FT to T+2hr | "Verdict time." | "Rate the performance, who impressed..." |

Phase is derived client-side from `match.kickoff_at` and `match.status`.
Never store phase in the database — calculate it on render.

```ts
// lib/utils/match-phase.ts
type MatchPhase = 'pre' | 'live' | 'post' | 'closed'

export function getMatchPhase(match: Match): MatchPhase {
  const now = new Date()
  const kickoff = new Date(match.kickoff_at)
  const threadOpen = new Date(kickoff.getTime() - 30 * 60 * 1000)
  const threadClose = new Date(kickoff.getTime() + 120 * 60 * 1000)

  if (now < threadOpen) return 'closed'   // Not yet open
  if (now < kickoff) return 'pre'          // Pre-match window
  if (match.status === 'live') return 'live'
  if (match.status === 'finished' && now < threadClose) return 'post'
  return 'closed'
}
```

---

## Screens

### Match Thread Screen (`/match/[matchId]`)

```
┌─────────────────────────────────────┐
│  MATCH HEADER                       │
│  Arsenal  1 - 2  Chelsea            │
│  ● LIVE  72'                        │
├─────────────────────────────────────┤
│  PHASE INDICATOR                    │
│  ● LIVE THREAD · 847 posts          │
├─────────────────────────────────────┤
│                                     │
│  POST FEED                          │
│  Newest first, realtime updates     │
│  Standard + raid posts mixed        │
│                                     │
├─────────────────────────────────────┤
│  POST COMPOSER                      │
│  "React to the action..."           │
└─────────────────────────────────────┘
```

The match header is the only place in the app that shows the live
score. Pull `home_score` and `away_score` from the `matches` table —
updated by the polling cron job.

---

## Components

### `MatchHeader`

```tsx
// components/match/MatchHeader.tsx
interface MatchHeaderProps {
  match: Match & {
    home_club: Club
    away_club: Club
  }
}

export function MatchHeader({ match }: MatchHeaderProps) {
  const phase = getMatchPhase(match)

  return (
    <div className="bg-midnight px-4 pt-6 pb-4">
      {/* Score display */}
      <div className="flex items-center justify-between mb-4">
        {/* Home club */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <Image
            src={`/crests/${match.home_club.slug}.svg`}
            alt={match.home_club.name}
            width={40}
            height={40}
          />
          <p className="text-body-sm text-secondary text-center">
            {match.home_club.short_name}
          </p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center px-4">
          {match.status === 'scheduled' ? (
            <p className="text-display-md text-white">
              vs
            </p>
          ) : (
            <p className="text-display-md text-white">
              {match.home_score ?? 0} - {match.away_score ?? 0}
            </p>
          )}

          {/* Status badge */}
          {phase === 'live' && (
            <span className="flex items-center gap-1.5 text-label-sm text-loss mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
              LIVE
            </span>
          )}
          {phase === 'post' && (
            <span className="text-label-sm text-muted mt-1">FT</span>
          )}
          {phase === 'pre' && (
            <KickoffCountdown kickoffAt={match.kickoff_at} />
          )}
        </div>

        {/* Away club */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <Image
            src={`/crests/${match.away_club.slug}.svg`}
            alt={match.away_club.name}
            width={40}
            height={40}
          />
          <p className="text-body-sm text-secondary text-center">
            {match.away_club.short_name}
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

### `KickoffCountdown`

```tsx
// components/match/KickoffCountdown.tsx
export function KickoffCountdown({ kickoffAt }: { kickoffAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(kickoffAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('KO'); return }

      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)

      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, '0')}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [kickoffAt])

  return (
    <span className="text-label-lg text-accent font-label">{timeLeft}</span>
  )
}
```

---

### `MatchPhaseIndicator`

```tsx
// components/match/MatchPhaseIndicator.tsx
export function MatchPhaseIndicator({
  phase,
  postCount,
}: {
  phase: MatchPhase
  postCount: number
}) {
  const phaseLabel = {
    pre: 'PRE-MATCH THREAD',
    live: 'LIVE THREAD',
    post: 'POST-MATCH THREAD',
    closed: 'THREAD CLOSED',
  }[phase]

  return (
    <div className="px-4 py-3 bg-midnight border-b border-subtle
                    flex items-center justify-between">
      <div className="flex items-center gap-2">
        {phase === 'live' && (
          <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
        )}
        <span className="text-label-lg text-accent">{phaseLabel}</span>
      </div>
      <span className="text-label-sm text-muted">
        {postCount.toLocaleString()} POSTS
      </span>
    </div>
  )
}
```

---

### `MatchThreadFeed`

```tsx
// components/match/MatchThreadFeed.tsx
'use client'

export function MatchThreadFeed({
  thread,
  match,
  initialPosts,
  currentUserId,
}: MatchThreadFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const phase = getMatchPhase(match)

  // Realtime subscription for live posts
  useMatchThreadFeed(thread.id, (newPost) => {
    setPosts(prev => {
      if (prev.find(p => p.id === newPost.id)) return prev
      return [newPost, ...prev]
    })
  })

  const placeholder = {
    pre: 'Score prediction, starting XI, who\'s key...',
    live: 'React to the action...',
    post: 'Rate the performance, who impressed...',
    closed: '',
  }[phase]

  return (
    <div className="flex flex-col min-h-screen">
      <MatchHeader match={match} />
      <MatchPhaseIndicator phase={phase} postCount={posts.length} />

      {/* Feed */}
      <div className="flex-1 p-4 space-y-3 pb-32">
        {posts.length === 0 ? (
          <EmptyState
            title="Thread is warming up."
            description="Drop the first take."
          />
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))
        )}
      </div>

      {/* Composer — only when thread is open */}
      {phase !== 'closed' && (
        <PostComposer
          lockerRoomId={thread.locker_room_id}
          type="match_thread"
          matchThreadId={thread.id}
          placeholder={placeholder}
        />
      )}

      {phase === 'closed' && (
        <div className="fixed bottom-0 left-0 right-0 bg-midnight
                        border-t border-subtle p-4 text-center">
          <p className="text-label-sm text-muted">Thread closed.</p>
        </div>
      )}
    </div>
  )
}
```

---

## Auto-Creation Logic

Match threads are created by the `open-match-threads` cron job. It
runs every 5 minutes and checks for matches approaching kick-off.

```ts
// app/api/cron/open-match-threads/route.ts
export async function openScheduledMatchThreads() {
  const supabase = createSupabaseServiceClient()
  const now = new Date()

  // Find matches that should have their threads open right now
  // (kickoff_at - 30 mins <= now <= kickoff_at + 120 mins)
  const threadOpenTime = new Date(now.getTime() + 30 * 60 * 1000) // 30 mins from now

  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select('id, home_club_id, away_club_id, kickoff_at')
    .eq('status', 'scheduled')
    .lte('kickoff_at', threadOpenTime.toISOString())
    .gte('kickoff_at', now.toISOString())

  if (!upcomingMatches || upcomingMatches.length === 0) return { opened: 0 }

  let opened = 0

  for (const match of upcomingMatches) {
    // Get locker rooms for both clubs
    const { data: rooms } = await supabase
      .from('locker_rooms')
      .select('id, club_id')
      .in('club_id', [match.home_club_id, match.away_club_id])

    for (const room of rooms ?? []) {
      const opensAt = new Date(new Date(match.kickoff_at).getTime() - 30 * 60 * 1000)
      const closesAt = new Date(new Date(match.kickoff_at).getTime() + 120 * 60 * 1000)

      // Upsert — safe to run multiple times
      const { error } = await supabase
        .from('match_threads')
        .upsert({
          match_id: match.id,
          locker_room_id: room.id,
          opens_at: opensAt.toISOString(),
          closes_at: closesAt.toISOString(),
          status: 'open',
        }, { onConflict: 'match_id,locker_room_id' })

      if (!error) {
        opened++
        // Snapshot raid eligibility at kick-off
        await snapshotRaidEligibility(match.id)
        // Notify members
        await notifyMatchThreadOpen(match.id, room.id)
      }
    }
  }

  return { opened }
}
```

---

## Closing Match Threads

Called by `onMatchFinished()` and `onMatchPostponed()` in the fixture
processing logic.

```ts
// lib/match-threads/close-threads.ts
export async function closeMatchThreads(matchId: string) {
  const supabase = createSupabaseServiceClient()

  const { error } = await supabase
    .from('match_threads')
    .update({ status: 'closed' })
    .eq('match_id', matchId)
    .neq('status', 'closed')  // Idempotent — don't error if already closed

  if (error) {
    console.error('[closeMatchThreads]', { matchId, error })
    throw error
  }

  console.info('[closeMatchThreads] Closed threads for match', matchId)
}
```

---

## Data Fetching

```ts
// Server-side initial data fetch for match thread page
// app/(main)/match/[matchId]/page.tsx

export default async function MatchPage({
  params,
}: {
  params: { matchId: string }
}) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get match with club data
  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      home_club:clubs!home_club_id(*),
      away_club:clubs!away_club_id(*)
    `)
    .eq('id', params.matchId)
    .single()

  if (!match) notFound()

  // Get user's locker room thread (based on their home club)
  const { data: profile } = user
    ? await supabase
        .from('users')
        .select('home_club_id')
        .eq('id', user.id)
        .single()
    : { data: null }

  // Find the thread for the user's club
  const { data: thread } = await supabase
    .from('match_threads')
    .select('*')
    .eq('match_id', params.matchId)
    .eq('locker_room_id', profile?.home_club_id
        ? await getLockerRoomId(profile.home_club_id)
        : match.home_locker_room_id)  // Default to home team thread for guests
    .single()

  // Initial posts
  const { data: initialPosts } = thread
    ? await supabase
        .from('posts')
        .select('*, author:users(id, username, avatar_url), reactions(*)')
        .eq('match_thread_id', thread.id)
        .eq('is_removed', false)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  return (
    <MatchThreadFeed
      thread={thread}
      match={match}
      initialPosts={initialPosts ?? []}
      currentUserId={user?.id}
    />
  )
}
```

---

## Match Thread Rules

1. Two threads per match — one per club's locker room
2. Thread opens 30 mins before kick-off — created by cron job
3. Thread closes 120 mins after kick-off (approx FT + extra time allowance)
4. Phase (pre/live/post/closed) is calculated client-side — never stored in DB
5. Posts in a closed thread are read-only — composer is hidden
6. Thread auto-creation uses upsert — safe to run the cron multiple times
7. Postponed match → threads closed immediately, no raid triggered
8. Guest users (not logged in) see the home team's thread by default
9. Live score in the match header comes from `matches` table — not a separate API call
10. Thread post count is shown in `MatchPhaseIndicator` — use `post_count` denormalised field
