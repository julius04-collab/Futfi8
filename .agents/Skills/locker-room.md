# locker-room.md — Locker Room Feature

## Overview

The locker room is the core unit of Futfi8. Every Premier League club has
one. It is the home base for fans — where they post takes, react to
content, track their reputation, and experience raids. Everything in the
app orbits around the locker room.

When vibecoding this feature, always have these files active alongside it:
- `project.md`
- `design-system.md`
- `database-mechanics.md`
- `database-schema.md`
- `realtime-channels.md`
- `realtime-lifecycle.md`
- `access-control.md`

---

## Screens

### 1. Locker Room Home (`/locker-room/[clubId]`)

The main screen. Everything a fan needs on matchday.

**Layout (top to bottom):**
```
┌─────────────────────────────────────┐
│  LOCKER ROOM HEADER                 │
│  Club crest + name + member count   │
│  [Raid banner — conditional]        │
├─────────────────────────────────────┤
│  TAB BAR                            │
│  Feed | Match | Members | History   │
├─────────────────────────────────────┤
│                                     │
│  FEED (default tab)                 │
│  Post cards — infinite scroll       │
│                                     │
├─────────────────────────────────────┤
│  POST COMPOSER                      │
│  Fixed at bottom — "Drop a take"    │
└─────────────────────────────────────┘
```

**URL structure:** `/locker-room/arsenal`, `/locker-room/chelsea` etc.
Route param is club slug — not UUID. Resolve to locker room via
`clubs.slug` → `clubs.id` → `locker_rooms.club_id`.

---

### 2. Members Tab (`/locker-room/[clubId]/members`)

Leaderboard of top fans ranked by Fan Cred Score.

**Layout:**
```
┌─────────────────────────────────────┐
│  Your rank: #47 — 312 Cred          │
│  [Badge: Regular]                   │
├─────────────────────────────────────┤
│  #1   username          2,450 Cred  │
│       🏆 OG                         │
│  #2   username          1,890 Cred  │
│       ⭐ Legend                      │
│  #3   username          1,200 Cred  │
│  ...                                │
└─────────────────────────────────────┘
```

Show the current user's rank at the top even if they're not in the
top 20. Fetch their rank separately — don't scan the full list.

---

### 3. Raid History Tab (`/locker-room/[clubId]/raid-history`)

Archive of all past raid posts received and sent.

**Layout:**
```
┌─────────────────────────────────────┐
│  FILTER: Received | Sent            │
├─────────────────────────────────────┤
│  ⚔️ Arsenal raided us               │
│  Match: Chelsea 1-2 Arsenal         │
│  3 days ago · 12 raid posts         │
│  [View raid posts]                  │
│─────────────────────────────────────│
│  ⚔️ We raided Liverpool             │
│  Match: Liverpool 0-1 Chelsea       │
│  1 week ago · 8 raid posts          │
└─────────────────────────────────────┘
```

Group by raid window — not by individual post. Each group is collapsible.

---

### 4. Fixtures Tab (`/locker-room/[clubId]/fixtures`)

Upcoming fixtures for this club with countdown timers.

**Layout:**
```
┌─────────────────────────────────────┐
│  Next match                         │
│  Chelsea vs Arsenal                 │
│  Sat 7 Jun · 16:30 WAT              │
│  ⏱ Match thread opens in 2d 4h     │
├─────────────────────────────────────┤
│  Upcoming                           │
│  Man City vs Chelsea  14 Jun        │
│  Chelsea vs Wolves    21 Jun        │
│  ...                                │
└─────────────────────────────────────┘
```

---

## Components

### `LockerRoomHeader`

```tsx
// components/locker-room/LockerRoomHeader.tsx
interface LockerRoomHeaderProps {
  club: Club
  lockerRoom: LockerRoom
  activeRaid: RaidWindow | null
  isMember: boolean
}

export function LockerRoomHeader({
  club,
  lockerRoom,
  activeRaid,
  isMember,
}: LockerRoomHeaderProps) {
  return (
    <div className={cn(
      'px-4 pt-6 pb-4 transition-colors duration-[600ms]',
      activeRaid ? 'bg-raid-bg' : 'bg-midnight'
    )}>
      {/* Club identity */}
      <div className="flex items-center gap-3 mb-4">
        <Image
          src={`/crests/${club.slug}.svg`}
          alt={club.name}
          width={48}
          height={48}
        />
        <div>
          <h1 className="text-heading-lg text-white">{club.name}</h1>
          <p className="text-label-sm text-muted">
            {lockerRoom.member_count.toLocaleString()} MEMBERS
          </p>
        </div>
        {!isMember && <JoinButton clubId={club.id} />}
      </div>

      {/* Raid banner — only shown when raid is active */}
      {activeRaid && <RaidBanner raidWindow={activeRaid} club={club} />}
    </div>
  )
}
```

---

### `RaidBanner`

Appears in the locker room header when a raid is active.
Two variants: defending (your room is being raided) and raiding
(you can enter their room).

```tsx
// components/raid/RaidBanner.tsx
interface RaidBannerProps {
  raidWindow: RaidWindow
  club: Club
  variant: 'defending' | 'raiding'
}

export function RaidBanner({ raidWindow, club, variant }: RaidBannerProps) {
  const { display: countdown, isExpired } = useRaidCountdown(raidWindow.closes_at)

  if (isExpired) return null

  return (
    <div className="bg-raid-bg border border-raid rounded-lg p-4
                    animate-raid-enter mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-badge text-white bg-raid px-2 py-0.5 rounded-full">
          ⚔️ {variant === 'defending' ? 'RAID INCOMING' : 'RAID ACTIVE'}
        </span>
        <span className="text-label-lg text-accent font-label">
          {countdown}
        </span>
      </div>

      {variant === 'defending' ? (
        <p className="text-body-sm text-secondary">
          {raidWindow.raiding_club_name} fans are in your locker room.
        </p>
      ) : (
        <>
          <p className="text-body-sm text-secondary mb-3">
            {raidWindow.defending_club_name}'s locker room is open.
          </p>
          <EnterRaidButton raidWindowId={raidWindow.id}
                           defendingClubSlug={raidWindow.defending_club_slug} />
        </>
      )}
    </div>
  )
}
```

---

### `PostCard`

The primary content unit — renders standard posts and raid posts with
distinct visual treatment.

```tsx
// components/post/PostCard.tsx
interface PostCardProps {
  post: Post & { author: User; reactions: Reaction[] }
  currentUserId?: string
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const isRaidPost = post.is_raid_post
  const hasUpvoted = post.reactions.some(
    r => r.user_id === currentUserId && r.type === 'upvote'
  )

  return (
    <div className={cn(
      'rounded-lg p-4 border',
      isRaidPost
        ? 'bg-raid-highlight border-raid relative'
        : 'bg-midnight border-default'
    )}>
      {/* Raid badge */}
      {isRaidPost && (
        <span className="absolute top-3 right-3 text-badge text-accent
                         bg-raid-bg px-2 py-0.5 rounded-full">
          ⚔️ RAID
        </span>
      )}

      {/* Author row */}
      <div className="flex items-center gap-2.5 mb-3">
        <Image
          src={post.author?.avatar_url ?? '/avatars/default.svg'}
          alt={post.author?.username ?? 'deleted user'}
          width={32}
          height={32}
          className="rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-medium text-white truncate">
            {post.author?.username ?? '[deleted]'}
          </p>
        </div>
        <time className="text-label-sm text-muted flex-shrink-0">
          {formatRelativeTime(post.created_at)}
        </time>
      </div>

      {/* Content */}
      <p className="text-body-lg text-secondary leading-relaxed mb-3">
        {post.content}
      </p>

      {/* Actions */}
      <PostActions
        post={post}
        hasUpvoted={hasUpvoted}
        currentUserId={currentUserId}
      />
    </div>
  )
}
```

---

### `PostComposer`

Fixed at the bottom of the screen. Expands on tap to reveal the
text input. Collapses after submission.

```tsx
// components/post/PostComposer.tsx
'use client'

export function PostComposer({
  lockerRoomId,
  type = 'standard',
  matchThreadId,
}: PostComposerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const charCount = content.length
  const MAX_CHARS = 500

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)

    // Optimistic update handled by parent via callback
    const { error } = await apiFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content, locker_room_id: lockerRoomId, type, match_thread_id: matchThreadId }),
    })

    if (error) {
      showErrorToast(getUserFacingError(error.code))
    } else {
      setContent('')
      setIsOpen(false)
      showSuccessToast('Take posted.')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-midnight
                    border-t border-default safe-area-pb">
      {isOpen ? (
        <div className="p-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Drop your take..."
            className="w-full bg-steel border border-default rounded-md
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
            <div className="flex gap-2">
              <button
                onClick={() => { setIsOpen(false); setContent('') }}
                className="text-body-sm text-muted px-3 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="bg-purple-electric text-inverse text-body-sm
                           font-medium px-4 py-2 rounded-md
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-4 text-left text-muted text-body-sm"
        >
          Drop a take...
        </button>
      )}
    </div>
  )
}
```

---

### `PostActions`

Upvote, reply count, and report actions on each post card.

```tsx
// components/post/PostActions.tsx
export function PostActions({ post, hasUpvoted, currentUserId }: PostActionsProps) {
  const [localCount, setLocalCount] = useState(post.upvote_count)
  const [localHasUpvoted, setLocalHasUpvoted] = useState(hasUpvoted)

  const handleUpvote = async () => {
    // Optimistic update
    const newState = !localHasUpvoted
    setLocalHasUpvoted(newState)
    setLocalCount(prev => newState ? prev + 1 : prev - 1)

    const { error } = newState
      ? await apiFetch('/api/reactions', {
          method: 'POST',
          body: JSON.stringify({ post_id: post.id, type: 'upvote' }),
        })
      : await apiFetch(`/api/reactions/${post.id}/upvote`, { method: 'DELETE' })

    // Rollback on error
    if (error) {
      setLocalHasUpvoted(!newState)
      setLocalCount(prev => newState ? prev - 1 : prev + 1)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleUpvote}
        disabled={!currentUserId}
        className={cn(
          'flex items-center gap-1.5 text-label-sm transition-colors',
          localHasUpvoted ? 'text-accent' : 'text-muted hover:text-secondary'
        )}
      >
        <span>{localHasUpvoted ? '▲' : '△'}</span>
        <span>{localCount}</span>
      </button>
      <ReportButton postId={post.id} authorId={post.author_id} />
    </div>
  )
}
```

---

## Tab Navigation

```tsx
// components/locker-room/LockerRoomTabs.tsx
const TABS = [
  { id: 'feed',     label: 'Feed',    href: '' },
  { id: 'match',    label: 'Match',   href: '/match' },
  { id: 'members',  label: 'Members', href: '/members' },
  { id: 'history',  label: 'History', href: '/raid-history' },
] as const

export function LockerRoomTabs({ clubSlug, activeTab }: LockerRoomTabsProps) {
  return (
    <div className="flex border-b border-subtle bg-midnight sticky top-0 z-10">
      {TABS.map(tab => (
        <Link
          key={tab.id}
          href={`/locker-room/${clubSlug}${tab.href}`}
          className={cn(
            'flex-1 py-3 text-center text-label-lg transition-colors',
            activeTab === tab.id
              ? 'text-accent border-b-2 border-accent'
              : 'text-muted hover:text-secondary'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
```

---

## Data Fetching Strategy

```
Initial page load (Server Component):
  → getClub(slug)           — club data
  → getLockerRoom(clubId)   — member count, locker room ID
  → getInitialPosts(lockerRoomId, limit=20)  — first page of feed
  → getActiveRaid(lockerRoomId)              — raid window if any
  → getUserMembership(userId, lockerRoomId)  — is user a member?

After mount (Client Component):
  → Subscribe to locker-room:{lockerRoomId} channel (new posts)
  → Subscribe to raid-incoming:{lockerRoomId} channel (new raids)
  → New posts prepended to feed optimistically
```

Never re-fetch the initial data on the client — the server provides
it as props. The client only subscribes for incremental updates.

---

## Locker Room Rules

1. Route param is club slug (`/locker-room/arsenal`) — never UUID in the URL
2. Initial data is fetched server-side — never client-side on mount
3. Raid banner only renders when `activeRaid !== null`
4. Header background transitions to `bg-raid-bg` during active raid
5. Raid posts render with `bg-raid-highlight` + `border-raid` + ⚔️ RAID badge
6. PostComposer is fixed at the bottom — account for safe area on iOS
7. Character count turns `text-loss` at 450 characters — warning before the 500 limit
8. Upvotes are optimistic — rollback on API error
9. Members leaderboard shows current user's rank even if not in top 20
10. Raid history groups by raid window — not individual posts
