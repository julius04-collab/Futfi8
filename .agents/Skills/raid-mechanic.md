# raid-mechanic.md — The Raid Mechanic

## Overview

The Raid is Futfi8's defining mechanic. It is the most complex, most
critical, and most entertaining feature in the product. Every part of
it must work flawlessly — a broken raid on matchday is the worst possible
product failure.

When vibecoding this feature, always have these files active alongside it:
- `project.md`
- `database-mechanics.md`
- `database-schema.md`
- `access-control.md`
- `realtime-channels.md`
- `realtime-lifecycle.md`
- `notifications-logic.md`
- `notifications-types.md`
- `football-api-client.md`
- `football-api-polling.md`
---

## The Mechanic — Plain English

1. Two clubs play each other in the Premier League
2. The match ends with a decisive result (not a draw)
3. The winning club's locker room earns a **Raid Window** — 2 hours
4. During those 2 hours, members of the winning club who were members
   **before kick-off** can enter the losing club's locker room
5. Each raider gets **one post** in the losing room — that's it
6. The losing club's members can see and react to raid posts but cannot
   remove them during the window
7. After 2 hours, the window closes automatically — raid posts are
   archived in Raid History, room seals back to members-only

**What makes it work:**
- Earned access — you only raid if your club won
- Pre-kickoff eligibility — you can't join after the result to raid
- One post limit — forces raiders to make their one post count
- Time pressure — 2-hour window creates urgency
- Asymmetry — winners celebrate, losers defend

---

## Full Raid Lifecycle

```
MATCH SCHEDULED
      │
      ▼
MATCH GOES LIVE (kick-off)
      │
      ├─► Snapshot raid eligibility for BOTH clubs
      │   (all current members of both locker rooms)
      │
      ├─► Open match threads for both clubs
      │
      └─► Send "match thread open" notifications
      │
      ▼
MATCH IN PROGRESS
      │
      └─► Poll API every 2 mins for score updates
      │
      ▼
MATCH FINISHED
      │
      ├─► Close match threads
      │
      ├─► If DECISIVE RESULT (not draw):
      │   ├─► Create RaidWindow record
      │   │   opens_at = now()
      │   │   closes_at = now() + 2 hours
      │   │   status = 'active'
      │   │
      │   ├─► Populate raid_eligibility from snapshot
      │   │   (only winning club members)
      │   │
      │   ├─► Notify winning club — "Get in there"
      │   └─► Notify losing club — "Raid incoming"
      │
      └─► If DRAW: nothing — no raid triggered
      │
      ▼
RAID WINDOW ACTIVE (0–2 hours)
      │
      ├─► Losing locker room UI enters raid mode
      │   Header → bg-raid-bg
      │   Raid banner → animates in
      │   Countdown timer ticking
      │
      ├─► Raiders enter via "Enter Rival Locker Room" CTA
      │
      ├─► Each raider posts one take (enforced by raid_eligibility)
      │
      ├─► Raid posts appear in losing room with ⚔️ RAID badge
      │
      ├─► At 30 mins remaining: notify raiders who haven't posted yet
      │
      └─► Losing fans can react + reply to raid posts
      │
      ▼
RAID WINDOW CLOSES (closes_at reached)
      │
      ├─► Cron job detects closes_at <= now() + status = 'active'
      │
      ├─► Update raid_window.status = 'closed'
      │
      ├─► Archive raid posts (they stay in DB, visible in Raid History)
      │
      ├─► Losing locker room exits raid mode
      │
      ├─► Recalculate Fan Cred scores for all participants
      │
      └─► Notify both clubs — "Raid over"
```

---

## Database Operations

### Creating a Raid Window

Called by `onMatchFinished()` in `lib/api-football/process-fixture.ts`.

```ts
// lib/raids/create-raid-window.ts
export async function createRaidWindow(matchId: string, winnerClubId: string) {
  const supabase = createSupabaseServiceClient()

  // Get match details
  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      home_club:clubs!home_club_id(id, name, slug),
      away_club:clubs!away_club_id(id, name, slug)
    `)
    .eq('id', matchId)
    .single()

  if (!match) throw new Error(`Match not found: ${matchId}`)

  // Determine raiding and defending clubs
  const isHomeWinner = match.home_club_id === winnerClubId
  const raidingClub = isHomeWinner ? match.home_club : match.away_club
  const defendingClub = isHomeWinner ? match.away_club : match.home_club

  // Get locker room IDs
  const { data: rooms } = await supabase
    .from('locker_rooms')
    .select('id, club_id')
    .in('club_id', [raidingClub.id, defendingClub.id])

  const raidingRoom = rooms?.find(r => r.club_id === raidingClub.id)
  const defendingRoom = rooms?.find(r => r.club_id === defendingClub.id)

  if (!raidingRoom || !defendingRoom) {
    throw new Error('Locker rooms not found for raid window creation')
  }

  const now = new Date()
  const closesAt = new Date(now.getTime() + 2 * 60 * 60 * 1000) // +2 hours

  // Create the raid window
  const { data: raidWindow, error } = await supabase
    .from('raid_windows')
    .insert({
      match_id: matchId,
      raiding_club_id: raidingClub.id,
      defending_club_id: defendingClub.id,
      raiding_locker_room_id: raidingRoom.id,
      defending_locker_room_id: defendingRoom.id,
      opens_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
      status: 'active',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create raid window: ${error.message}`)

  // Populate raid eligibility from kick-off snapshot
  await populateRaidEligibility(raidWindow.id, raidingClub.id, matchId)

  // Send notifications
  await notifyRaidOpened({
    ...raidWindow,
    raiding_club_name: raidingClub.name,
    defending_club_name: defendingClub.name,
    defending_club_slug: defendingClub.slug,
  })

  console.info('[createRaidWindow] Created', {
    raidWindowId: raidWindow.id,
    raiding: raidingClub.name,
    defending: defendingClub.name,
    closesAt: closesAt.toISOString(),
  })

  return raidWindow
}
```

---

### Populating Raid Eligibility

```ts
// lib/raids/populate-eligibility.ts
export async function populateRaidEligibility(
  raidWindowId: string,
  raidingClubId: string,
  matchId: string
) {
  const supabase = createSupabaseServiceClient()

  // Pull from the kick-off snapshot — only raiding club members
  const { data: eligible } = await supabase
    .from('match_eligibility_snapshot')
    .select('user_id')
    .eq('match_id', matchId)
    .eq('club_id', raidingClubId)

  if (!eligible || eligible.length === 0) {
    console.warn('[populateRaidEligibility] No eligible raiders found', {
      raidWindowId,
      matchId,
      raidingClubId,
    })
    return
  }

  // Insert eligibility records
  await supabase.from('raid_eligibility').insert(
    eligible.map(e => ({
      raid_window_id: raidWindowId,
      user_id: e.user_id,
      has_raided: false,
    }))
  )

  console.info('[populateRaidEligibility] Populated', {
    raidWindowId,
    count: eligible.length,
  })
}
```

---

### Closing a Raid Window

Called by `app/api/cron/close-raid-windows/route.ts` every 5 minutes.

```ts
// lib/raids/close-raid-window.ts
export async function closeExpiredRaidWindows() {
  const supabase = createSupabaseServiceClient()

  // Find all active windows that have expired
  const { data: expiredWindows } = await supabase
    .from('raid_windows')
    .select('*')
    .eq('status', 'active')
    .lte('closes_at', new Date().toISOString())

  if (!expiredWindows || expiredWindows.length === 0) return { closed: 0 }

  let closed = 0

  for (const window of expiredWindows) {
    try {
      await closeRaidWindow(window)
      closed++
    } catch (err) {
      console.error('[closeExpiredRaidWindows] Failed to close window', {
        raidWindowId: window.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return { closed }
}

async function closeRaidWindow(raidWindow: RaidWindow) {
  const supabase = createSupabaseServiceClient()

  // 1. Update status to closed
  await supabase
    .from('raid_windows')
    .update({ status: 'closed' })
    .eq('id', raidWindow.id)

  // 2. Recalculate Fan Cred for all participants
  await recalculateRaidCred(raidWindow.id)

  // 3. Notify both clubs
  await notifyRaidClosed(raidWindow)

  console.info('[closeRaidWindow] Closed', {
    raidWindowId: raidWindow.id,
    raidingClubId: raidWindow.raiding_club_id,
    defendingClubId: raidWindow.defending_club_id,
  })
}
```

---

### Creating a Raid Post (RPC)

The atomic operation — post insert + eligibility update in one transaction.
See `access-control.md` for the full SQL function.

```ts
// app/api/raids/[raidWindowId]/post/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { raidWindowId: string } }
) {
  // 1. Auth check
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'You must be logged in.' } },
      { status: 401 }
    )
  }

  // 2. Validate body
  const body = await request.json()
  const parsed = raidPostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // 3. Check age (under-16 cannot raid)
  const { data: profile } = await supabase
    .from('users')
    .select('dob_year')
    .eq('id', user.id)
    .single()

  if (profile?.dob_year) {
    const age = new Date().getFullYear() - profile.dob_year
    if (age < 16) {
      return NextResponse.json(
        { error: { code: 'AGE_RESTRICTED', message: 'You need to be 16 or older to raid.' } },
        { status: 403 }
      )
    }
  }

  // 4. Content toxicity check
  const { isFlagged } = await checkContentToxicity(parsed.data.content)
  if (isFlagged) {
    return NextResponse.json(
      { error: { code: 'CONTENT_FLAGGED', message: 'Keep it to football banter.' } },
      { status: 422 }
    )
  }

  // 5. Sanitise content
  const sanitisedContent = sanitiseContent(parsed.data.content)

  // 6. Execute atomic raid post creation via RPC
  const { data, error } = await supabase.rpc('create_raid_post', {
    p_author_id: user.id,
    p_content: sanitisedContent,
    p_locker_room_id: parsed.data.defending_locker_room_id,
    p_raid_window_id: params.raidWindowId,
    p_match_id: parsed.data.match_id,
  })

  if (error) {
    // Map RPC errors to app error codes
    if (error.message.includes('RAID_NOT_ELIGIBLE_OR_USED')) {
      // Check which specific error it is
      const { data: eligibility } = await supabase
        .from('raid_eligibility')
        .select('has_raided')
        .eq('raid_window_id', params.raidWindowId)
        .eq('user_id', user.id)
        .single()

      if (!eligibility) {
        return NextResponse.json(
          { error: { code: 'RAID_NOT_ELIGIBLE', message: 'You weren\'t a member before kick-off.' } },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: { code: 'RAID_ALREADY_USED', message: 'You\'ve already posted in this raid.' } },
        { status: 422 }
      )
    }

    console.error('[POST /api/raids/[raidWindowId]/post]', { userId: user.id, error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to post raid take.' } },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data, meta: { timestamp: new Date().toISOString() } },
    { status: 201 }
  )
}
```

---

## Raid UI Components

### `RaidInterface`

The screen raiders see when they enter a rival locker room.

```tsx
// components/raid/RaidInterface.tsx
'use client'

export function RaidInterface({
  raidWindow,
  defendingClub,
  userHasRaided,
}: RaidInterfaceProps) {
  const { display: countdown, isExpired } = useRaidCountdown(raidWindow.closes_at)
  const [localHasRaided, setLocalHasRaided] = useState(userHasRaided)
  const [raidPosts, setRaidPosts] = useState<Post[]>([])

  // Subscribe to new raid posts in real time
  useRaidFeed(raidWindow.id, (newPost) => {
    setRaidPosts(prev => {
      if (prev.find(p => p.id === newPost.id)) return prev
      return [newPost, ...prev]
    })
  })

  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <p className="text-heading-md text-white mb-2">Raid over.</p>
        <p className="text-body-sm text-muted">
          The window closed. Check the Raid History.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-raid-bg min-h-screen">
      {/* Raid header */}
      <div className="px-4 pt-6 pb-4 border-b border-raid">
        <div className="flex items-center gap-3 mb-3">
          <Image
            src={`/crests/${defendingClub.slug}.svg`}
            alt={defendingClub.name}
            width={40}
            height={40}
            className="opacity-60"  // Slightly dimmed — enemy territory
          />
          <div>
            <p className="text-label-sm text-accent">⚔️ RAIDING</p>
            <h1 className="text-heading-lg text-white">{defendingClub.name}</h1>
          </div>
          <div className="ml-auto text-right">
            <p className="text-label-sm text-muted">WINDOW CLOSES</p>
            <p className="text-label-lg text-accent font-label">{countdown}</p>
          </div>
        </div>
      </div>

      {/* Raid composer — only shown if user hasn't raided yet */}
      {!localHasRaided ? (
        <div className="p-4 border-b border-raid">
          <p className="text-body-sm text-muted mb-3">
            You have one post. Make it count.
          </p>
          <RaidPostComposer
            raidWindowId={raidWindow.id}
            defendingLockerRoomId={raidWindow.defending_locker_room_id}
            matchId={raidWindow.match_id}
            onSuccess={() => setLocalHasRaided(true)}
          />
        </div>
      ) : (
        <div className="p-4 border-b border-raid">
          <div className="bg-midnight rounded-lg p-3 text-center">
            <p className="text-body-sm text-muted">
              You've dropped your take. Watch the chaos unfold.
            </p>
          </div>
        </div>
      )}

      {/* Raid posts feed */}
      <div className="p-4 space-y-3">
        <p className="text-label-sm text-muted">
          {raidPosts.length} RAID POST{raidPosts.length !== 1 ? 'S' : ''}
        </p>
        {raidPosts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {raidPosts.length === 0 && (
          <EmptyState
            title="First one in."
            description="No raid posts yet. Be the one to start it."
          />
        )}
      </div>
    </div>
  )
}
```

---

### `RaidPostComposer`

Stripped-down composer specifically for raid posts.
One shot — make it count.

```tsx
// components/raid/RaidPostComposer.tsx
'use client'

export function RaidPostComposer({
  raidWindowId,
  defendingLockerRoomId,
  matchId,
  onSuccess,
}: RaidPostComposerProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const MAX_CHARS = 500
  const charCount = content.length

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)

    const { error } = await apiFetch(`/api/raids/${raidWindowId}/post`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        defending_locker_room_id: defendingLockerRoomId,
        match_id: matchId,
      }),
    })

    if (error) {
      showErrorToast(getUserFacingError(error.code))
      setIsSubmitting(false)
      return
    }

    showSuccessToast('Raid take posted. 🔥')
    onSuccess()
    setIsSubmitting(false)
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
        placeholder="What do you have to say to their fans?"
        className="w-full bg-steel border border-raid rounded-md
                   px-4 py-3 text-body-lg text-white placeholder:text-muted
                   focus:outline-none focus:border-accent resize-none"
        rows={3}
        autoFocus
      />
      <div className="flex items-center justify-between mt-2">
        <span className={cn(
          'text-label-sm',
          charCount > 450 ? 'text-loss' : 'text-muted'
        )}>
          {charCount}/{MAX_CHARS}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="bg-raid text-white text-body-sm font-medium
                     px-5 py-2.5 rounded-md
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {isSubmitting ? 'Posting...' : '⚔️ Drop the raid take'}
        </button>
      </div>
    </div>
  )
}
```

---

## Fan Cred — Raid Outcomes

After the raid window closes, Fan Cred is adjusted based on post performance.

```ts
// lib/raids/recalculate-raid-cred.ts
export async function recalculateRaidCred(raidWindowId: string) {
  const supabase = createSupabaseServiceClient()

  // Get all raid posts for this window
  const { data: raidPosts } = await supabase
    .from('posts')
    .select('id, author_id, upvote_count')
    .eq('raid_window_id', raidWindowId)
    .eq('is_raid_post', true)

  if (!raidPosts || raidPosts.length === 0) return

  // Get all replies to raid posts from defending fans
  const { data: replies } = await supabase
    .from('posts')
    .select('id, author_id, upvote_count, parent_post_id')
    .in('parent_post_id', raidPosts.map(p => p.id))

  for (const raidPost of raidPosts) {
    // Get the best reply to this raid post
    const bestReply = replies
      ?.filter(r => r.parent_post_id === raidPost.id)
      .sort((a, b) => b.upvote_count - a.upvote_count)[0]

    if (bestReply && bestReply.upvote_count > raidPost.upvote_count) {
      // Defender won the exchange — +5 cred to defender
      await adjustFanCred(bestReply.author_id, 5, 'raid_defence_win')
    } else if (raidPost.upvote_count > (bestReply?.upvote_count ?? 0)) {
      // Raider won the exchange — +5 cred to raider
      await adjustFanCred(raidPost.author_id, 5, 'raid_attack_win')
    }
  }
}
```

---

## Edge Cases Specific to Raids

| Scenario | Handling |
|---|---|
| Raid window created but 0 eligible members | Window opens, no posts. No error. Logs a warning. |
| User posts in raid, then account deleted | Post stays as [deleted]. Raid history preserved. |
| API result delayed by 45+ mins | Raid window opens on result confirmation. Duration stays 2hrs from open. |
| Two matches finishing simultaneously | Two separate raid windows — fully independent. No conflict. |
| Cron job misses a window closing | Next cron run (5 mins later) catches it — `closes_at` is the truth, not `status`. |
| Raider tries to post after window closes | `closes_at` check in RPC rejects it — 422 RAID_WINDOW_CLOSED. |
| Defending fan tries to delete raid post | Only soft-delete of own posts allowed — `is_removed = true`. Raid post by another user cannot be deleted by defender. Only mods can remove. |

---

## Raid Mechanic Rules Summary

1. Raid eligibility snapshot is taken at kick-off — not at result
2. Only winning club members in the snapshot get raid rights
3. One post per raider per window — enforced atomically via RPC
4. `closes_at` is the source of truth — not `status`
5. Raid post insert and eligibility update are a single atomic transaction
6. Under-16 users cannot post raid posts — age check before RPC
7. All raid posts pass toxicity check — same threshold as standard posts
8. Raid window creation only happens inside `onMatchFinished()` — nowhere else
9. Draws never trigger a raid window — `winner_club_id` must be non-null
10. Raid posts are never hard-deleted — soft delete only, always in Raid History
