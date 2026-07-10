# fan-cred-score.md — Fan Cred Score System

## Overview

Fan Cred Score is Futfi8's reputation system. It measures how much of
a presence a fan has built inside a specific locker room. It is not a
global score — it is per-club, per-locker-room. Your Arsenal Cred Score
is completely separate from your Chelsea Cred Score if you ever switch.

Fan Cred Score drives:
- The Members leaderboard ranking in each locker room
- Badge level unlocks (fan → regular → veteran → legend → og)
- Moderator eligibility (500+ Cred)
- Raid exchange outcomes (win/loss Cred bonuses)
- A sense of earned identity — your rep in your locker room

When vibecoding this feature, always have these files active:
- `project.md`
- `database-mechanics.md`
- `database-schema.md`
- `notifications-logic.md`
- `notifications-types.md`

---

## Score Formula

Fan Cred Score is calculated from multiple signals. Every signal has
a point value. Scores are recalculated daily at 00:00 UTC and after
every raid window closes.

### Point Values

| Event | Points | Notes |
|---|---|---|
| Post upvote received | +2 | Any post type in locker room or hot take |
| Raid post wins exchange | +5 | Raider's post got more upvotes than defender's reply |
| Raid defence wins exchange | +5 | Defender's reply got more upvotes than raid post |
| Consecutive matchday streak (7) | +10 | Posted in 7 consecutive match threads |
| Consecutive matchday streak (14) | +20 | Bonus tier |
| Consecutive matchday streak (21) | +35 | Highest streak bonus |
| Post removed by moderator | -10 | Penalty for violating content rules |
| Account warned (strike 1) | -5 | First strike penalty |
| Account temp banned (strike 2) | -20 | Second strike penalty |

### What Does NOT Give Cred
- Reactions given (only reactions received)
- Posting volume without engagement
- Joining a locker room
- Reading posts
- Logging in

---

## Badge Levels

| Badge | Minimum Cred | Label | Display |
|---|---|---|---|
| Fan | 0 | Fan | No badge shown — default state |
| Regular | 100 | Regular | 🟢 Regular |
| Veteran | 500 | Veteran | 🔵 Veteran |
| Legend | 1000 | Legend | ⭐ Legend |
| OG | 2000 | OG | 🏆 OG |

Badge level is stored in `memberships.badge_level`. Updated whenever
Fan Cred Score crosses a threshold — checked during every recalculation.

```ts
// lib/fan-cred/get-badge-level.ts
export function getBadgeLevel(score: number): BadgeLevel {
  if (score >= 2000) return 'og'
  if (score >= 1000) return 'legend'
  if (score >= 500) return 'veteran'
  if (score >= 100) return 'regular'
  return 'fan'
}

export const BADGE_CONFIG = {
  fan:      { label: 'Fan',     emoji: '',   minCred: 0    },
  regular:  { label: 'Regular', emoji: '🟢',  minCred: 100  },
  veteran:  { label: 'Veteran', emoji: '🔵',  minCred: 500  },
  legend:   { label: 'Legend',  emoji: '⭐',  minCred: 1000 },
  og:       { label: 'OG',      emoji: '🏆',  minCred: 2000 },
} as const
```

---

## Recalculation Logic

### Daily Recalculation (00:00 UTC)

Runs via `app/api/cron/recalculate-cred/route.ts` every midnight.

Recalculates upvote-based Cred for all memberships:

```ts
// lib/fan-cred/recalculate-daily.ts
export async function recalculateDailyCred() {
  const supabase = createSupabaseServiceClient()

  // Get all memberships
  const { data: memberships } = await supabase
    .from('memberships')
    .select('id, user_id, locker_room_id, fan_cred_score, badge_level')

  if (!memberships || memberships.length === 0) return { updated: 0 }

  let updated = 0

  for (const membership of memberships) {
    try {
      const newScore = await calculateMembershipCred(
        membership.user_id,
        membership.locker_room_id
      )

      const newBadge = getBadgeLevel(newScore)
      const oldBadge = membership.badge_level
      const badgeCrossed = newBadge !== oldBadge && newScore > membership.fan_cred_score

      await supabase
        .from('memberships')
        .update({
          fan_cred_score: newScore,
          badge_level: newBadge,
        })
        .eq('id', membership.id)

      // Notify on badge unlock
      if (badgeCrossed && newScore > membership.fan_cred_score) {
        await createNotification({
          userId: membership.user_id,
          type: 'fan_cred_milestone',
          title: 'New badge unlocked. 🏆',
          body: `You hit ${newScore} Fan Cred. You're a ${BADGE_CONFIG[newBadge].label} now.`,
          referenceType: 'membership',
          referenceId: membership.id,
        })
      }

      updated++
    } catch (err) {
      console.error('[recalculateDailyCred] Failed for membership', {
        membershipId: membership.id,
        error: err instanceof Error ? err.message : 'Unknown',
      })
    }
  }

  return { updated }
}
```

---

### Calculate Score for a Single Membership

```ts
// lib/fan-cred/calculate-membership-cred.ts
export async function calculateMembershipCred(
  userId: string,
  lockerRoomId: string
): Promise<number> {
  const supabase = createSupabaseServiceClient()

  let score = 0

  // 1. Upvotes received on posts in this locker room
  const { data: posts } = await supabase
    .from('posts')
    .select('upvote_count')
    .eq('author_id', userId)
    .eq('locker_room_id', lockerRoomId)
    .eq('is_removed', false)

  const upvoteScore = (posts ?? []).reduce(
    (sum, post) => sum + post.upvote_count * 2,
    0
  )
  score += upvoteScore

  // 2. Raid exchange outcomes — wins
  const raidBonus = await getRaidExchangeBonus(userId, lockerRoomId)
  score += raidBonus

  // 3. Matchday streak bonus
  const streakBonus = await getMatchdayStreakBonus(userId, lockerRoomId)
  score += streakBonus

  // 4. Moderation penalties
  const { data: strikes } = await supabase
    .from('strikes')
    .select('id')
    .eq('user_id', userId)

  const penaltyScore = (strikes?.length ?? 0) * -10
  score += penaltyScore

  // Floor at 0 — score cannot go negative
  return Math.max(0, score)
}
```

---

### Raid Exchange Bonus

```ts
// lib/fan-cred/raid-bonus.ts
export async function getRaidExchangeBonus(
  userId: string,
  lockerRoomId: string
): Promise<number> {
  const supabase = createSupabaseServiceClient()
  let bonus = 0

  // Get all raid windows involving this locker room (as raider or defender)
  const { data: raidWindows } = await supabase
    .from('raid_windows')
    .select('id, raiding_locker_room_id, defending_locker_room_id')
    .or(`raiding_locker_room_id.eq.${lockerRoomId},defending_locker_room_id.eq.${lockerRoomId}`)
    .eq('status', 'closed')

  if (!raidWindows || raidWindows.length === 0) return 0

  for (const raidWindow of raidWindows) {
    const isRaider = raidWindow.raiding_locker_room_id === lockerRoomId

    if (isRaider) {
      // Check if user raided and won the exchange
      const { data: raidPost } = await supabase
        .from('posts')
        .select('id, upvote_count')
        .eq('raid_window_id', raidWindow.id)
        .eq('author_id', userId)
        .eq('is_raid_post', true)
        .single()

      if (raidPost) {
        // Get best reply to this raid post
        const { data: bestReply } = await supabase
          .from('posts')
          .select('upvote_count')
          .eq('parent_post_id', raidPost.id)
          .order('upvote_count', { ascending: false })
          .limit(1)
          .single()

        if (raidPost.upvote_count > (bestReply?.upvote_count ?? 0)) {
          bonus += 5 // Raider won the exchange
        }
      }
    } else {
      // User is defender — check if their best reply beat the raid post
      const { data: raidPosts } = await supabase
        .from('posts')
        .select('id, upvote_count')
        .eq('raid_window_id', raidWindow.id)
        .eq('is_raid_post', true)

      for (const raidPost of raidPosts ?? []) {
        const { data: userReply } = await supabase
          .from('posts')
          .select('upvote_count')
          .eq('parent_post_id', raidPost.id)
          .eq('author_id', userId)
          .order('upvote_count', { ascending: false })
          .limit(1)
          .single()

        if (userReply && userReply.upvote_count > raidPost.upvote_count) {
          bonus += 5 // Defender won the exchange
        }
      }
    }
  }

  return bonus
}
```

---

### Matchday Streak Bonus

```ts
// lib/fan-cred/streak-bonus.ts
const STREAK_BONUSES: Record<number, number> = {
  7: 10,
  14: 20,
  21: 35,
}

export async function getMatchdayStreakBonus(
  userId: string,
  lockerRoomId: string
): Promise<number> {
  const supabase = createSupabaseServiceClient()

  // Get all match threads for this locker room — ordered by date
  const { data: threads } = await supabase
    .from('match_threads')
    .select('id, opens_at')
    .eq('locker_room_id', lockerRoomId)
    .eq('status', 'closed')
    .order('opens_at', { ascending: true })

  if (!threads || threads.length < 7) return 0

  // Get all match thread posts by this user in this locker room
  const threadIds = threads.map(t => t.id)
  const { data: userPosts } = await supabase
    .from('posts')
    .select('match_thread_id')
    .eq('author_id', userId)
    .eq('type', 'match_thread')
    .in('match_thread_id', threadIds)

  const participatedThreadIds = new Set(
    userPosts?.map(p => p.match_thread_id)
  )

  // Count consecutive matchdays participated
  let currentStreak = 0
  let maxStreak = 0

  for (const thread of threads) {
    if (participatedThreadIds.has(thread.id)) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  // Apply bonus for highest streak tier reached
  let bonus = 0
  for (const [threshold, points] of Object.entries(STREAK_BONUSES).reverse()) {
    if (maxStreak >= Number(threshold)) {
      bonus = points
      break
    }
  }

  return bonus
}
```

---

## Adjust Fan Cred (Point Mutations)

For immediate score adjustments outside of daily recalculation —
used for moderation penalties and raid exchange bonuses.

```ts
// lib/fan-cred/adjust-fan-cred.ts
export async function adjustFanCred(
  userId: string,
  points: number,
  reason: string,
  lockerRoomId?: string
) {
  const supabase = createSupabaseServiceClient()

  // Find the user's active membership
  let query = supabase
    .from('memberships')
    .select('id, fan_cred_score, badge_level')
    .eq('user_id', userId)

  if (lockerRoomId) {
    query = query.eq('locker_room_id', lockerRoomId)
  }

  const { data: membership } = await query.single()
  if (!membership) return

  const newScore = Math.max(0, membership.fan_cred_score + points)
  const newBadge = getBadgeLevel(newScore)

  await supabase
    .from('memberships')
    .update({ fan_cred_score: newScore, badge_level: newBadge })
    .eq('id', membership.id)

  console.info('[adjustFanCred]', {
    userId,
    reason,
    points,
    oldScore: membership.fan_cred_score,
    newScore,
  })
}
```

---

## UI Components

### `FanCredBadge`

Reusable badge component used on post cards, member list, and profiles.

```tsx
// components/ui/FanCredBadge.tsx
interface FanCredBadgeProps {
  level: BadgeLevel
  size?: 'sm' | 'md'
}

export function FanCredBadge({ level, size = 'sm' }: FanCredBadgeProps) {
  const config = BADGE_CONFIG[level]
  if (level === 'fan') return null  // Don't show badge for default level

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-body font-medium',
      size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
      level === 'og'      && 'bg-amber-900/30 text-amber-400',
      level === 'legend'  && 'bg-purple-900/30 text-accent',
      level === 'veteran' && 'bg-blue-900/30 text-blue-400',
      level === 'regular' && 'bg-green-900/30 text-win',
    )}>
      {config.emoji} {config.label}
    </span>
  )
}
```

---

### `FanCredScore` Display on Profile

```tsx
// components/profile/FanCredDisplay.tsx
export function FanCredDisplay({
  score,
  badgeLevel,
  rank,
}: FanCredDisplayProps) {
  const nextThreshold = getNextThreshold(score)

  return (
    <div className="bg-midnight rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-label-sm text-muted">FAN CRED</p>
          <p className="text-display-md text-white font-display">
            {score.toLocaleString()}
          </p>
        </div>
        <FanCredBadge level={badgeLevel} size="md" />
      </div>

      {/* Progress to next badge */}
      {nextThreshold && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-label-sm text-muted">
              {nextThreshold.label}
            </span>
            <span className="text-label-sm text-muted">
              {score} / {nextThreshold.minCred}
            </span>
          </div>
          <div className="h-1.5 bg-steel rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-electric rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (score / nextThreshold.minCred) * 100)}%`
              }}
            />
          </div>
        </div>
      )}

      {rank && (
        <p className="text-label-sm text-muted mt-3">
          #{rank} IN YOUR LOCKER ROOM
        </p>
      )}
    </div>
  )
}

function getNextThreshold(score: number) {
  const thresholds = Object.values(BADGE_CONFIG).filter(b => b.minCred > score)
  return thresholds.sort((a, b) => a.minCred - b.minCred)[0] ?? null
}
```

---

### `MembersLeaderboard`

```tsx
// components/locker-room/MembersLeaderboard.tsx
export function MembersLeaderboard({
  members,
  currentUserRank,
  currentUserId,
}: MembersLeaderboardProps) {
  return (
    <div>
      {/* Current user rank — always shown at top */}
      {currentUserRank && (
        <div className="px-4 py-3 bg-midnight border-b border-accent mb-1">
          <p className="text-label-sm text-accent mb-1">YOUR RANK</p>
          <MemberRow
            member={currentUserRank}
            rank={currentUserRank.rank}
            isCurrentUser
          />
        </div>
      )}

      {/* Top members */}
      <div className="divide-y divide-subtle">
        {members.map((member, index) => (
          <MemberRow
            key={member.user_id}
            member={member}
            rank={index + 1}
            isCurrentUser={member.user_id === currentUserId}
          />
        ))}
      </div>
    </div>
  )
}

function MemberRow({ member, rank, isCurrentUser }: MemberRowProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3',
      isCurrentUser && 'bg-raid-bg'
    )}>
      <span className={cn(
        'text-label-lg w-6 text-center flex-shrink-0',
        rank === 1 ? 'text-amber-400' :
        rank === 2 ? 'text-steel' :
        rank === 3 ? 'text-amber-700' : 'text-muted'
      )}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
      </span>

      <Image
        src={member.avatar_url ?? '/avatars/default.svg'}
        alt={member.username}
        width={32}
        height={32}
        className="rounded-full object-cover flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-white truncate">
          {member.username}
        </p>
        <FanCredBadge level={member.badge_level} />
      </div>

      <span className="text-label-lg text-accent font-label flex-shrink-0">
        {member.fan_cred_score.toLocaleString()}
      </span>
    </div>
  )
}
```

---

## Fan Cred Rules Summary

1. Fan Cred Score is per-club, per-locker-room — never global
2. Score floors at 0 — never goes negative
3. Scores are recalculated daily at 00:00 UTC via cron
4. Raid exchange bonuses are recalculated immediately when window closes
5. Badge upgrade triggers `fan_cred_milestone` notification — badge downgrade does not notify
6. `fan` badge level shows no badge UI — only regular and above are displayed
7. Moderator eligibility requires 500+ Cred in the specific locker room
8. Club switch resets the new locker room score to 0 — old score is frozen
9. Streak bonus is based on match thread participation — not just posting anywhere
10. Upvotes received is the primary driver — engagement quality matters more than volume
