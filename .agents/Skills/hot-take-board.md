# hot-take-board.md — Hot Take Board Feature

## Overview

The Hot Take Board is the global, open floor of Futfi8. Unlike locker
rooms — which are club-restricted — the Hot Take Board accepts posts
from any authenticated user about any club, any match, any topic in
football. No membership required to post.

It is the non-matchday heartbeat of the platform. When there are no
live matches, the Hot Take Board keeps the community alive. It is also
the main discovery surface — where fans from different clubs encounter
each other outside of raids.

When vibecoding this feature, always have these files active alongside it:
- `project.md`
- `database-mechanics.md`
- `database-schema.md`
- `realtime-channels.md`
- `realtime-lifecycle.md`
- `access-control.md`

---

## How It Differs from Locker Room Posts

| Property | Locker Room Post | Hot Take |
|---|---|---|
| `type` | `standard` | `hot_take` |
| `locker_room_id` | Required — user's home club | `null` — global |
| Who can post | Home club members only | Any authenticated user |
| When | Any time | Any time |
| Sorted by | Chronological (newest first) | Upvotes (last 24h default) |
| Visibility | Locker room members + public read | Everyone |
| Contributes to Fan Cred | Yes | Yes |

---

## Screens

### Hot Take Board (`/hot-takes`)

**Layout:**
```
┌─────────────────────────────────────┐
│  HOT TAKES                          │
│  The global floor                   │
├─────────────────────────────────────┤
│  SORT: 🔥 Top Today | 🕐 New | 📅 Week │
│  FILTER: All clubs | [Club picker]  │
├─────────────────────────────────────┤
│                                     │
│  HOT TAKE CARD                      │
│  @username · Arsenal fan            │
│  "Saka is the best player in the    │
│  Premier League right now and I     │
│  will not be taking questions."     │
│                                     │
│  ▲ 142  💬 23  🔁 Share             │
│─────────────────────────────────────│
│  HOT TAKE CARD                      │
│  @username · Chelsea fan            │
│  ...                                │
│                                     │
└─────────────────────────────────────┘
│  [Drop a hot take...]               │
└─────────────────────────────────────┘
```

---

## Sorting Options

| Sort | Description | Query |
|---|---|---|
| 🔥 Top Today | Highest upvotes in last 24 hours | `upvote_count DESC` + `created_at >= now() - 24h` |
| 🕐 New | Most recent first | `created_at DESC` |
| 📅 This Week | Highest upvotes in last 7 days | `upvote_count DESC` + `created_at >= now() - 7d` |

Default sort on page load: **Top Today**.

---

## Club Filter

Users can filter the Hot Take Board to show takes about a specific club.
This is done via a tag on the post — not enforced, self-selected by the poster.

```ts
// Hot take posts can optionally tag a club
// Add optional club_id field to hot take posts
// In posts table: club_tag_id uuid references clubs(id)
// User selects which club their take is about when posting
```

Filter implementation:
```ts
// Unfiltered — all hot takes
const { data } = await supabase
  .from('posts')
  .select('...')
  .eq('type', 'hot_take')
  .eq('is_removed', false)
  .gte('created_at', twentyFourHoursAgo)
  .order('upvote_count', { ascending: false })
  .limit(20)

// Filtered by club tag
const { data } = await supabase
  .from('posts')
  .select('...')
  .eq('type', 'hot_take')
  .eq('is_removed', false)
  .eq('club_tag_id', selectedClubId)
  .gte('created_at', twentyFourHoursAgo)
  .order('upvote_count', { ascending: false })
  .limit(20)
```

---

## API Routes

### Get Hot Takes Feed

```ts
// app/api/hot-takes/route.ts
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(request.url)

  const sort = searchParams.get('sort') ?? 'top_today'
  const clubId = searchParams.get('club_id')
  const cursor = searchParams.get('cursor')
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50)

  // Build time window based on sort
  const timeWindows: Record<string, number> = {
    top_today: 24 * 60 * 60 * 1000,       // 24 hours
    top_week: 7 * 24 * 60 * 60 * 1000,    // 7 days
    new: 0,                                 // No time filter for new
  }

  let query = supabase
    .from('posts')
    .select(`
      id, content, created_at, upvote_count,
      author:users(id, username, avatar_url),
      club_tag:clubs!club_tag_id(id, name, slug, primary_color)
    `)
    .eq('type', 'hot_take')
    .eq('is_removed', false)

  // Apply club filter
  if (clubId) query = query.eq('club_tag_id', clubId)

  // Apply time window
  if (sort !== 'new' && timeWindows[sort]) {
    const since = new Date(Date.now() - timeWindows[sort]).toISOString()
    query = query.gte('created_at', since)
  }

  // Apply sort
  if (sort === 'new') {
    query = query.order('created_at', { ascending: false })
    if (cursor) query = query.lt('created_at', cursor)
  } else {
    query = query.order('upvote_count', { ascending: false })
    if (cursor) query = query.lt('upvote_count', Number(cursor))
  }

  const { data: posts, error } = await query.limit(limit)

  if (error) {
    console.error('[GET /api/hot-takes]', { error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load hot takes.' } },
      { status: 500 }
    )
  }

  const lastPost = posts?.[posts.length - 1]
  const nextCursor = posts?.length === limit
    ? sort === 'new'
      ? lastPost?.created_at
      : String(lastPost?.upvote_count)
    : null

  return NextResponse.json({
    data: posts ?? [],
    pagination: {
      nextCursor,
      hasMore: posts?.length === limit,
      limit,
    },
    meta: { timestamp: new Date().toISOString() },
  })
}
```

---

### Post a Hot Take

```ts
// app/api/hot-takes/route.ts
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'You must be logged in to post a hot take.' } },
      { status: 401 }
    )
  }

  // 2. Validate body
  const body = await request.json()
  const parsed = hotTakeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // 3. Content toxicity check
  const { isFlagged } = await checkContentToxicity(parsed.data.content)
  if (isFlagged) {
    return NextResponse.json(
      { error: { code: 'CONTENT_FLAGGED', message: 'Keep it to football banter.' } },
      { status: 422 }
    )
  }

  // 4. Rate limit — 10 hot takes per hour per user
  const { allowed, retryAfter } = checkRateLimit(
    `hot-take:${user.id}`,
    10,
    60 * 60 * 1000
  )
  if (!allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'You\'re posting too fast.' } },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  // 5. Sanitise and insert
  const sanitisedContent = sanitiseContent(parsed.data.content)

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      content: sanitisedContent,
      type: 'hot_take',
      locker_room_id: null,  // Global — no locker room
      club_tag_id: parsed.data.club_tag_id ?? null,
    })
    .select(`
      id, content, created_at, upvote_count,
      author:users(id, username, avatar_url),
      club_tag:clubs!club_tag_id(id, name, slug)
    `)
    .single()

  if (error) {
    console.error('[POST /api/hot-takes]', { userId: user.id, error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to post hot take.' } },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: post, meta: { timestamp: new Date().toISOString() } },
    { status: 201 }
  )
}
```

---

## Validation Schema

```ts
// lib/validations/hot-take.ts
import { z } from 'zod'

export const hotTakeSchema = z.object({
  content: z.string()
    .min(1, 'Hot take cannot be empty')
    .max(500, 'Hot take cannot exceed 500 characters')
    .trim(),
  club_tag_id: z.string().uuid().optional().nullable(),
})
```

---

## UI Components

### `HotTakeFeed`

```tsx
// components/hot-takes/HotTakeFeed.tsx
'use client'

export function HotTakeFeed({
  initialPosts,
  sort,
  clubId,
}: HotTakeFeedProps) {
  const { items: posts, isLoading, hasMore, sentinelRef } = useInfiniteFeed(
    (cursor) => fetchHotTakes({ sort, clubId, cursor }),
    initialPosts
  )

  // Realtime — prepend new hot takes
  useHotTakesRealtime((newPost) => {
    // Only prepend if sort is 'new' — don't disrupt ranked views
    if (sort === 'new') {
      // Note: useInfiniteFeed doesn't expose prepend
      // Handle via separate newPosts state
    }
  })

  return (
    <div>
      {posts.map(post => (
        <HotTakeCard key={post.id} post={post} />
      ))}
      <div ref={sentinelRef} />
      {isLoading && (
        <div className="space-y-3 p-4">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="text-label-sm text-muted text-center py-6">
          You've seen it all.
        </p>
      )}
      {!hasMore && posts.length === 0 && (
        <EmptyState
          title="Nothing yet today."
          description="Be the first to drop a hot take."
        />
      )}
    </div>
  )
}
```

---

### `HotTakeCard`

Similar to `PostCard` but shows club tag badge and different layout.

```tsx
// components/hot-takes/HotTakeCard.tsx
export function HotTakeCard({ post, currentUserId }: HotTakeCardProps) {
  const hasUpvoted = post.reactions?.some(
    r => r.user_id === currentUserId && r.type === 'upvote'
  )

  return (
    <div className="bg-midnight border-b border-subtle px-4 py-4
                    hover:bg-elevated transition-colors duration-150">
      {/* Author + club tag */}
      <div className="flex items-center gap-2.5 mb-3">
        <Image
          src={post.author?.avatar_url ?? '/avatars/default.svg'}
          alt={post.author?.username ?? 'deleted'}
          width={32}
          height={32}
          className="rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body-sm font-medium text-white">
              {post.author?.username ?? '[deleted]'}
            </span>
            {post.club_tag && (
              <span
                className="text-badge px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${post.club_tag.primary_color}22`,
                  color: post.club_tag.primary_color,
                }}
              >
                {post.club_tag.name}
              </span>
            )}
          </div>
        </div>
        <time className="text-label-sm text-muted flex-shrink-0">
          {formatRelativeTime(post.created_at)}
        </time>
      </div>

      {/* Take content */}
      <p className="text-body-lg text-secondary leading-relaxed mb-3">
        {post.content}
      </p>

      {/* Actions */}
      <PostActions
        post={post}
        hasUpvoted={hasUpvoted ?? false}
        currentUserId={currentUserId}
      />
    </div>
  )
}
```

---

### `HotTakeControls`

Sort and filter bar at the top of the board.

```tsx
// components/hot-takes/HotTakeControls.tsx
'use client'

const SORT_OPTIONS = [
  { value: 'top_today', label: '🔥 Top Today' },
  { value: 'new',       label: '🕐 New' },
  { value: 'top_week',  label: '📅 This Week' },
] as const

export function HotTakeControls({
  sort,
  onSortChange,
  selectedClubId,
  onClubChange,
}: HotTakeControlsProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3
                    bg-midnight border-b border-subtle overflow-x-auto">
      {/* Sort pills */}
      <div className="flex gap-2 flex-shrink-0">
        {SORT_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={cn(
              'text-badge px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
              sort === option.value
                ? 'bg-purple-electric text-inverse'
                : 'bg-steel text-muted hover:text-secondary'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Club filter */}
      <ClubFilterPicker
        selectedClubId={selectedClubId}
        onChange={onClubChange}
      />
    </div>
  )
}
```

---

### `HotTakeComposer`

Full-width composer for the hot take board.

```tsx
// components/hot-takes/HotTakeComposer.tsx
'use client'

export function HotTakeComposer({ onSuccess }: { onSuccess?: (post: Post) => void }) {
  const [content, setContent] = useState('')
  const [clubTagId, setClubTagId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const MAX_CHARS = 500

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    setIsSubmitting(true)

    const { data, error } = await apiFetch<Post>('/api/hot-takes', {
      method: 'POST',
      body: JSON.stringify({ content, club_tag_id: clubTagId }),
    })

    if (error) {
      showErrorToast(getUserFacingError(error.code))
    } else {
      setContent('')
      setClubTagId(null)
      showSuccessToast('Hot take posted. 🔥')
      onSuccess?.(data!)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="bg-midnight border-b border-subtle p-4">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
        placeholder="What's your hot take?"
        className="w-full bg-steel border border-default rounded-md px-4 py-3
                   text-body-lg text-white placeholder:text-muted
                   focus:outline-none focus:border-accent resize-none"
        rows={3}
      />

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          {/* Club tag selector */}
          <ClubTagSelector
            selectedId={clubTagId}
            onChange={setClubTagId}
          />
          <span className={cn(
            'text-label-sm',
            content.length > 450 ? 'text-loss' : 'text-muted'
          )}>
            {content.length}/{MAX_CHARS}
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="bg-purple-electric text-inverse text-body-sm font-medium
                     px-4 py-2 rounded-md
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Posting...' : 'Post Take'}
        </button>
      </div>
    </div>
  )
}
```

---

## Weekly Digest Integration

The top 3 hot takes from the past week are included in the weekly
email digest sent every Sunday. This surfaces the best content to
members who might have missed it.

```ts
// lib/resend/weekly-digest.ts
export async function getTopHotTakesForDigest(limit = 3) {
  const supabase = createSupabaseServiceClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('posts')
    .select(`
      id, content, upvote_count,
      author:users(username),
      club_tag:clubs!club_tag_id(name)
    `)
    .eq('type', 'hot_take')
    .eq('is_removed', false)
    .gte('created_at', since)
    .order('upvote_count', { ascending: false })
    .limit(limit)

  return data ?? []
}
```

---

## Realtime Subscription

```ts
// hooks/use-hot-takes-realtime.ts
export function useHotTakesRealtime(onNewPost: (post: Post) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    channelRef.current = supabase
      .channel('hot-takes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `type=eq.hot_take`,
      }, (payload) => {
        onNewPost(payload.new as Post)
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])
}
```

Only prepend realtime posts when sort is `new` — avoid disrupting
the ranked `top_today` view with new low-upvote posts.

---

## Hot Take Board Rules

1. `locker_room_id` is always `null` for hot take posts — global, not club-specific
2. Club tag is optional — self-selected by poster, not enforced
3. Default sort is Top Today — not chronological like locker room feeds
4. Rate limit: 10 hot takes per hour per user — enforced server-side
5. Realtime new posts only prepend when sort is `new` — don't disrupt ranked views
6. Club tag badge uses the club's `primary_color` with opacity — not a fixed colour
7. Hot takes contribute to Fan Cred Score — same upvote weight as standard posts
8. Weekly digest pulls top 3 hot takes from the past 7 days
9. Club filter is optional and additive — never required to view the board
10. The board is publicly readable — authentication only required to post
