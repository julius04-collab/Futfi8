# moderation.md — Content Moderation

## Overview

Futfi8 is a banter-first product. The moderation system must walk a
precise line — aggressive enough to remove genuinely harmful content,
but loose enough to let football banter breathe. Over-moderation kills
the product. Under-moderation destroys trust.

The system has three layers:
1. **Automated** — Perspective API toxicity check before every post
2. **Community** — User reports, locker room moderators
3. **Admin** — Global moderation, bans, appeals

When vibecoding this feature, always have these files active:
- `project.md`
- `database-mechanics.md`
- `database-schema.md`
- `security-compliance.md`
- `security-moderation.md`
- `access-control.md`

---

## Moderation Layers

### Layer 1 — Automated (Pre-publish)

Every post passes through Perspective API before insertion.
Threshold is `0.85` — intentionally high for football banter culture.

```
User submits post
      ↓
Perspective API toxicity check
      ↓
Score < 0.85 → Allow → Insert post
Score ≥ 0.85 → Block → Return CONTENT_FLAGGED error
API unavailable → Fail open → Allow post → Log failure
```

See `security.rules.md` for full Perspective API implementation.

**What gets through at 0.85:**
- Strong opinions, trash talk, banter
- "Arsenal are absolutely finished this season"
- "That referee is a disgrace"
- Mild profanity common in football commentary

**What gets blocked at 0.85:**
- Targeted personal attacks
- Hate speech — racial, ethnic, religious slurs
- Threats of violence
- Extreme harassment

Do not lower the threshold without extensive real-world testing.

---

### Layer 2 — Community Reports

Users can report any post. Reports go to the moderation queue.

```ts
// Report flow
User taps "Report" on a post
      ↓
Selects reason: hate_speech | spam | harassment | other
      ↓
POST /api/posts/[postId]/report
      ↓
Creates reports record — status = 'pending'
Raid posts flagged as high priority
      ↓
Moderation queue (reviewed by locker room mods or admins)
```

---

### Layer 3 — Moderator Actions

Locker room moderators can remove posts and mute members within their room.
Admins have global powers.

| Action | Mod | Admin |
|---|---|---|
| Remove post in their room | ✓ | ✓ |
| Remove any post | ✗ | ✓ |
| Mute member in their room | ✓ | ✓ |
| Issue strike | ✗ | ✓ |
| Temp ban (7 days) | ✗ | ✓ |
| Permanent ban | ✗ | ✓ |
| Appoint moderator | ✗ | ✓ |

---

## Database Schema

### `reports` table
Already defined in `database.rules.md`. Key fields:
```sql
reporter_id, post_id, reason, status (pending|reviewed|actioned|dismissed)
```

### `strikes` table
```sql
create table public.strikes (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.users(id) on delete cascade not null,
  reason      text not null,
  post_id     uuid references public.posts(id) on delete set null,
  issued_by   uuid references public.users(id),  -- null = automated
  created_at  timestamptz default now() not null
);
```

### `moderators` table
```sql
create table public.moderators (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.users(id) on delete cascade not null,
  locker_room_id  uuid references public.locker_rooms(id) on delete cascade not null,
  appointed_by    uuid references public.users(id),
  appointed_at    timestamptz default now() not null,
  unique(user_id, locker_room_id)
);
```

### `bans` table
```sql
create table public.bans (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.users(id) on delete cascade not null,
  type        text not null,            -- temp | permanent
  reason      text not null,
  banned_by   uuid references public.users(id) not null,
  expires_at  timestamptz,              -- null for permanent bans
  created_at  timestamptz default now() not null
);
```

---

## API Routes

### Report a Post

```ts
// app/api/posts/[postId]/report/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } },
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = reportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid report.' } },
      { status: 400 }
    )
  }

  // Check if post exists
  const { data: post } = await supabase
    .from('posts')
    .select('id, is_raid_post')
    .eq('id', params.postId)
    .single()

  if (!post) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Post not found.' } },
      { status: 404 }
    )
  }

  // Silent dedup — if user already reported this post, return success anyway
  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('post_id', params.postId)
    .single()

  if (!existing) {
    await supabase.from('reports').insert({
      reporter_id: user.id,
      post_id: params.postId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
      // Raid posts get high priority in the queue
      priority: post.is_raid_post ? 'high' : 'normal',
    })
  }

  return NextResponse.json({
    data: { reported: true },
    meta: { timestamp: new Date().toISOString() },
  })
}

const reportSchema = z.object({
  reason: z.enum(['hate_speech', 'spam', 'harassment', 'other']),
  details: z.string().max(500).optional(),
})
```

---

### Remove a Post (Mod/Admin)

```ts
// app/api/posts/[postId]/remove/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } },
      { status: 401 }
    )
  }

  // Get post with locker room
  const { data: post } = await supabase
    .from('posts')
    .select('id, locker_room_id, author_id, is_removed')
    .eq('id', params.postId)
    .single()

  if (!post) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Post not found.' } },
      { status: 404 }
    )
  }

  if (post.is_removed) {
    return NextResponse.json({
      data: { removed: true },
      meta: { timestamp: new Date().toISOString() },
    })
  }

  // Check permissions — own post, locker room mod, or admin
  const isOwnPost = post.author_id === user.id
  const isMod = await isModerator(user.id, post.locker_room_id)
  const isAdmin = await isGlobalAdmin(user.id)

  if (!isOwnPost && !isMod && !isAdmin) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Not permitted.' } },
      { status: 403 }
    )
  }

  // Soft delete
  await supabase
    .from('posts')
    .update({
      is_removed: true,
      removed_at: new Date().toISOString(),
      removed_by: user.id,
    })
    .eq('id', params.postId)

  // If removed by mod/admin (not own post) — issue strike to author
  if (!isOwnPost && post.author_id) {
    await issueModerationStrike(post.author_id, params.postId, user.id)
  }

  return NextResponse.json({
    data: { removed: true },
    meta: { timestamp: new Date().toISOString() },
  })
}
```

---

### Issue Strike

```ts
// lib/moderation/issue-strike.ts
export async function issueModerationStrike(
  userId: string,
  postId: string,
  issuedBy: string
) {
  const supabase = createSupabaseServiceClient()

  // Insert strike
  await supabase.from('strikes').insert({
    user_id: userId,
    post_id: postId,
    issued_by: issuedBy,
    reason: 'Post removed by moderator',
  })

  // Count total strikes
  const { count } = await supabase
    .from('strikes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const strikeCount = count ?? 0

  // Apply action based on strike count
  if (strikeCount === 1) {
    // First strike — warning only, deduct Fan Cred
    await adjustFanCred(userId, -10, 'moderation_strike')
    console.info('[issueModerationStrike] Warning issued', { userId, strikeCount })
  } else if (strikeCount === 2) {
    // Second strike — 7-day temp ban
    await supabase.from('bans').insert({
      user_id: userId,
      type: 'temp',
      reason: 'Second content violation',
      banned_by: issuedBy,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    await adjustFanCred(userId, -20, 'temp_ban')
    console.info('[issueModerationStrike] Temp ban issued', { userId, strikeCount })
  } else if (strikeCount >= 3) {
    // Third strike — permanent ban
    await supabase.from('bans').insert({
      user_id: userId,
      type: 'permanent',
      reason: 'Third content violation',
      banned_by: issuedBy,
      expires_at: null,
    })
    // Invalidate all sessions
    await supabase.auth.admin.deleteUser(userId)
    console.info('[issueModerationStrike] Permanent ban issued', { userId, strikeCount })
  }
}
```

---

### Check Ban Status

Run on every authenticated API request for write operations.

```ts
// lib/moderation/check-ban.ts
export async function isUserBanned(userId: string): Promise<{
  banned: boolean
  type?: 'temp' | 'permanent'
  expiresAt?: Date
}> {
  const supabase = createSupabaseServiceClient()

  const { data: ban } = await supabase
    .from('bans')
    .select('type, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!ban) return { banned: false }

  if (ban.type === 'permanent') return { banned: true, type: 'permanent' }

  if (ban.type === 'temp') {
    const expiresAt = new Date(ban.expires_at!)
    if (expiresAt > new Date()) {
      return { banned: true, type: 'temp', expiresAt }
    }
  }

  return { banned: false }
}
```

Add this check to all post creation routes:

```ts
// In post creation API routes — after auth check
const banStatus = await isUserBanned(user.id)
if (banStatus.banned) {
  const message = banStatus.type === 'permanent'
    ? 'Your account has been permanently banned.'
    : `You are banned until ${banStatus.expiresAt?.toDateString()}.`
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message } },
    { status: 403 }
  )
}
```

---

## UI Components

### `ReportButton`

Appears on every post card — visible on long press or via a "..." menu.

```tsx
// components/moderation/ReportButton.tsx
'use client'

export function ReportButton({
  postId,
  authorId,
  currentUserId,
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Don't show report on own posts
  if (authorId === currentUserId) return null

  const handleReport = async (reason: string) => {
    setIsSubmitting(true)
    await apiFetch(`/api/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
    showSuccessToast('Report submitted.')
    setIsOpen(false)
    setIsSubmitting(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-muted hover:text-secondary text-label-sm p-1"
        aria-label="Report post"
      >
        ···
      </button>

      {isOpen && (
        <ReportSheet
          onSelect={handleReport}
          onClose={() => setIsOpen(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  )
}

function ReportSheet({ onSelect, onClose, isSubmitting }: ReportSheetProps) {
  const REASONS = [
    { value: 'hate_speech', label: 'Hate speech' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'spam', label: 'Spam' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="fixed inset-0 bg-overlay z-50 flex items-end"
         onClick={onClose}>
      <div className="bg-midnight rounded-t-2xl w-full p-6"
           onClick={e => e.stopPropagation()}>
        <h3 className="text-heading-md text-white mb-4">Report post</h3>
        <div className="space-y-2">
          {REASONS.map(reason => (
            <button
              key={reason.value}
              onClick={() => onSelect(reason.value)}
              disabled={isSubmitting}
              className="w-full text-left px-4 py-3 bg-elevated rounded-lg
                         text-body-sm text-secondary hover:text-white
                         hover:bg-steel transition-colors"
            >
              {reason.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 py-3 text-muted text-body-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

---

### Removed Post Placeholder

When `is_removed = true`, render a placeholder — not a blank space.

```tsx
// components/post/RemovedPostPlaceholder.tsx
export function RemovedPostPlaceholder() {
  return (
    <div className="bg-midnight border border-default rounded-lg p-4 opacity-50">
      <p className="text-label-sm text-muted italic">
        This post was removed.
      </p>
    </div>
  )
}

// In PostCard — check is_removed before rendering
if (post.is_removed) return <RemovedPostPlaceholder />
```

---

## Moderator Eligibility Check

```ts
// lib/moderation/is-moderator.ts
export async function isModerator(
  userId: string,
  lockerRoomId: string
): Promise<boolean> {
  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('moderators')
    .select('id')
    .eq('user_id', userId)
    .eq('locker_room_id', lockerRoomId)
    .single()
  return !!data
}

export async function isGlobalAdmin(userId: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient()
  // Admins are stored in a separate admins table or a role on users
  const { data } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single()
  return data?.is_admin === true
}
```

---

## Moderation Rules

1. Perspective API threshold is 0.85 — do not lower without testing
2. Perspective API failure is fail-open — never block posts for API outage
3. Raid posts are high priority in the report queue — 2hr window means time matters
4. Reports are silently deduped — same user reporting same post twice is ignored
5. Post removal is always soft delete — `is_removed = true`, never hard delete
6. Moderators can only remove posts in their own locker room — not globally
7. Strikes are issued automatically on moderator removal — not manually
8. Three-strike system: warning → 7-day ban → permanent ban
9. Banned users get a clear error message explaining their status
10. Removed posts show a placeholder — never a blank gap in the feed
