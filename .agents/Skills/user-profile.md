# user-profile.md — User Profile Feature

## Overview

The user profile is a fan's identity card inside Futfi8. It shows who
they are, which club they ride for, how much Cred they've built, and
their post history. It is both personal (your own profile) and public
(other fans can view it).

The profile is not a social graph — there is no following, no DMs, no
feed. It is purely a reputation display and post archive. Club identity
is the social layer, not the individual.

When vibecoding this feature, always have these files active:
- `project.md`
- `design-system.md`
- `database-mechanics.md`
- `database-schema.md`
- `fan-cred-score.md`

---

## Screens

### Public Profile (`/profile/[userId]`)

Viewable by anyone — authenticated or not.

```
┌─────────────────────────────────────┐
│  ← Back                             │
├─────────────────────────────────────┤
│  [Avatar — 64px circle]             │
│  @username                          │
│  [Club crest 24px] Arsenal fan      │
│  Joined March 2026                  │
├─────────────────────────────────────┤
│  FAN CRED          BADGE            │
│  1,240             ⭐ Legend        │
│  #12 in locker room                 │
│  ████████░░ → 2000 (OG)             │
├─────────────────────────────────────┤
│  TAB: Takes | Hot Takes             │
├─────────────────────────────────────┤
│  [Post cards — user's posts]        │
└─────────────────────────────────────┘
```

---

### Own Profile (`/profile/me` or `/profile/[userId]` when userId = currentUser)

Same as public profile with additional edit controls.

```
┌─────────────────────────────────────┐
│  ← Back          [Edit profile ✎]   │
├─────────────────────────────────────┤
│  [Avatar — 64px + change overlay]   │
│  @username                          │
│  [Club crest 24px] Arsenal fan      │
│  Joined March 2026                  │
├─────────────────────────────────────┤
│  FAN CRED          BADGE            │
│  1,240             ⭐ Legend        │
│  #12 in locker room                 │
│  ████████░░ → 2000 (OG)             │
├─────────────────────────────────────┤
│  [Switch club]                      │
│  Next switch available: 12 Mar 2027 │
│  (or active if cooldown expired)    │
├─────────────────────────────────────┤
│  TAB: Takes | Hot Takes             │
├─────────────────────────────────────┤
│  [Post cards — user's posts]        │
└─────────────────────────────────────┘
```

---

### Edit Profile Sheet

Bottom sheet overlay — not a separate screen.

```
┌─────────────────────────────────────┐
│  Edit profile                  [✕]  │
│                                     │
│  [Avatar preview — tap to change]   │
│  Change photo                       │
│                                     │
│  Username                           │
│  [input — pre-filled]               │
│  ✓ Available                        │
│                                     │
│  [Save changes]                     │
└─────────────────────────────────────┘
```

---

## API Routes

### Get User Profile

```ts
// app/api/users/[userId]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const supabase = createSupabaseServerClient()

  // Get public profile data
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      username,
      avatar_url,
      created_at,
      home_club:clubs!home_club_id(
        id, name, slug, primary_color
      )
    `)
    .eq('id', params.userId)
    .single()

  if (error || !user) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'User not found.' } },
      { status: 404 }
    )
  }

  // Get membership + Fan Cred for home club
  const { data: membership } = await supabase
    .from('memberships')
    .select('fan_cred_score, badge_level, joined_at')
    .eq('user_id', params.userId)
    .eq('locker_room_id', /* home locker room id */ user.home_club_id ?? '')
    .single()

  // Get rank in locker room
  const { count: rank } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('locker_room_id', /* home locker room id */ user.home_club_id ?? '')
    .gt('fan_cred_score', membership?.fan_cred_score ?? 0)

  return NextResponse.json({
    data: {
      ...user,
      fan_cred_score: membership?.fan_cred_score ?? 0,
      badge_level: membership?.badge_level ?? 'fan',
      locker_room_rank: (rank ?? 0) + 1,
      member_since: membership?.joined_at ?? user.created_at,
    },
    meta: { timestamp: new Date().toISOString() },
  })
}
```

---

### Get User Posts

```ts
// app/api/users/[userId]/posts/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'standard' // standard | hot_take
  const cursor = searchParams.get('cursor')
  const limit = 20

  let query = supabase
    .from('posts')
    .select(`
      id, content, created_at, upvote_count, type, is_raid_post,
      locker_room:locker_rooms(
        club:clubs(id, name, slug)
      )
    `)
    .eq('author_id', params.userId)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type === 'hot_take') {
    query = query.eq('type', 'hot_take')
  } else {
    query = query.in('type', ['standard', 'match_thread', 'raid'])
  }

  if (cursor) query = query.lt('created_at', cursor)

  const { data: posts, error } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load posts.' } },
      { status: 500 }
    )
  }

  const lastPost = posts?.[posts.length - 1]
  const nextCursor = posts?.length === limit ? lastPost?.created_at : null

  return NextResponse.json({
    data: posts ?? [],
    pagination: { nextCursor, hasMore: posts?.length === limit, limit },
    meta: { timestamp: new Date().toISOString() },
  })
}
```

---

### Update Profile

```ts
// app/api/users/me/route.ts
export async function PATCH(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } },
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid data.', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  // Check username availability if changing
  if (parsed.data.username) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', parsed.data.username)
      .neq('id', user.id) // Exclude current user
      .single()

    if (existing) {
      return NextResponse.json(
        { error: { code: 'DUPLICATE', message: 'Username is already taken.' } },
        { status: 409 }
      )
    }

    // Check username change cooldown (once per 30 days)
    const { data: profile } = await supabase
      .from('users')
      .select('username_changed_at, username')
      .eq('id', user.id)
      .single()

    if (profile?.username_changed_at) {
      const cooldownEnd = new Date(profile.username_changed_at)
      cooldownEnd.setDate(cooldownEnd.getDate() + 30)
      if (new Date() < cooldownEnd) {
        return NextResponse.json(
          { error: { code: 'CLUB_SWITCH_COOLDOWN', message: `You can change your username again after ${cooldownEnd.toDateString()}.` } },
          { status: 422 }
        )
      }
    }
  }

  // Build update payload
  const updateData: Record<string, unknown> = {}
  if (parsed.data.username) {
    updateData.username = parsed.data.username
    updateData.username_changed_at = new Date().toISOString()
  }
  if (parsed.data.avatar_url) updateData.avatar_url = parsed.data.avatar_url

  const { data: updated, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id)
    .select('id, username, avatar_url')
    .single()

  if (error) {
    console.error('[PATCH /api/users/me]', { userId: user.id, error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile.' } },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: updated,
    meta: { timestamp: new Date().toISOString() },
  })
}
```

---

### Club Switch

```ts
// app/api/users/me/club/route.ts — PATCH for switching (POST is initial set)
export async function PATCH(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } },
      { status: 401 }
    )
  }

  const body = await request.json()
  const parsed = z.object({ club_id: z.string().uuid() }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid club.' } },
      { status: 400 }
    )
  }

  // Check 30-day cooldown
  const { allowed, retryAt } = await canSwitchClub(user.id)
  if (!allowed) {
    return NextResponse.json(
      { error: { code: 'CLUB_SWITCH_COOLDOWN', message: `You can switch clubs again on ${retryAt?.toDateString()}.` } },
      { status: 422 }
    )
  }

  // Get new locker room
  const { data: newRoom } = await supabase
    .from('locker_rooms')
    .select('id')
    .eq('club_id', parsed.data.club_id)
    .single()

  if (!newRoom) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Club not found.' } },
      { status: 404 }
    )
  }

  // Archive old membership — add left_at timestamp
  await supabase
    .from('memberships')
    .update({ left_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('left_at', null) // Only update active membership

  // Create new membership
  await supabase.from('memberships').insert({
    user_id: user.id,
    locker_room_id: newRoom.id,
    fan_cred_score: 0,
    badge_level: 'fan',
  })

  // Update user's home club and cooldown timestamp
  await supabase
    .from('users')
    .update({
      home_club_id: parsed.data.club_id,
      club_switched_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  // Get new club details for response
  const { data: club } = await supabase
    .from('clubs')
    .select('slug, name')
    .eq('id', parsed.data.club_id)
    .single()

  // Send confirmation notification
  await createNotification({
    userId: user.id,
    type: 'club_switch_confirmed',
    title: `Welcome to ${club?.name}.`,
    body: 'Your new locker room is ready. Fan Cred starts at 0.',
    referenceType: 'membership',
    referenceId: newRoom.id,
  })

  return NextResponse.json({
    data: { club_slug: club?.slug, club_name: club?.name },
    meta: { timestamp: new Date().toISOString() },
  })
}
```

---

## Avatar Upload

Avatars are stored in Supabase Storage under `avatars/{userId}`.

```ts
// app/api/users/me/avatar/route.ts
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } },
      { status: 401 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('avatar') as File

  if (!file) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No file provided.' } },
      { status: 400 }
    )
  }

  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'File must be JPEG, PNG, or WebP.' } },
      { status: 400 }
    )
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'File must be under 2MB.' } },
      { status: 400 }
    )
  }

  const path = `avatars/${user.id}`
  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Upload failed.' } },
      { status: 500 }
    )
  }

  const { data: { publicUrl } } = supabase.storage
    .from('public')
    .getPublicUrl(path)

  // Update user avatar_url
  await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  return NextResponse.json({
    data: { avatar_url: publicUrl },
    meta: { timestamp: new Date().toISOString() },
  })
}
```

---

## UI Components

### `ProfileHeader`

```tsx
// components/profile/ProfileHeader.tsx
export function ProfileHeader({
  user,
  membership,
  rank,
  isOwnProfile,
  clubSwitchAvailable,
  nextSwitchDate,
}: ProfileHeaderProps) {
  return (
    <div className="px-4 pt-6 pb-4 bg-midnight">
      {/* Avatar + edit button */}
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          <Image
            src={user.avatar_url ?? '/avatars/default.svg'}
            alt={user.username}
            width={64}
            height={64}
            className="rounded-full object-cover"
          />
          {isOwnProfile && (
            <button className="absolute -bottom-1 -right-1 w-6 h-6
                               bg-purple-electric rounded-full
                               flex items-center justify-center text-xs">
              ✎
            </button>
          )}
        </div>
        {isOwnProfile && (
          <EditProfileButton />
        )}
      </div>

      {/* Identity */}
      <p className="text-heading-lg text-white mb-1">@{user.username}</p>
      <div className="flex items-center gap-2 mb-1">
        <Image
          src={`/crests/${user.home_club.slug}.svg`}
          alt={user.home_club.name}
          width={16}
          height={16}
        />
        <span className="text-body-sm text-muted">{user.home_club.name} fan</span>
      </div>
      <p className="text-label-sm text-muted">
        Joined {format(new Date(user.created_at), 'MMMM yyyy')}
      </p>

      {/* Fan Cred display */}
      <div className="mt-4">
        <FanCredDisplay
          score={membership.fan_cred_score}
          badgeLevel={membership.badge_level}
          rank={rank}
        />
      </div>

      {/* Club switch — own profile only */}
      {isOwnProfile && (
        <div className="mt-3">
          {clubSwitchAvailable ? (
            <ClubSwitchButton />
          ) : (
            <p className="text-label-sm text-muted">
              Club switch available {format(nextSwitchDate!, 'dd MMM yyyy')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

---

### `ProfilePostFeed`

Two-tab feed — locker room takes and hot takes.

```tsx
// components/profile/ProfilePostFeed.tsx
'use client'

const TABS = [
  { id: 'standard', label: 'Takes' },
  { id: 'hot_take', label: 'Hot Takes' },
] as const

export function ProfilePostFeed({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<'standard' | 'hot_take'>('standard')

  const { items: posts, isLoading, hasMore, sentinelRef } = useInfiniteFeed(
    (cursor) => fetchUserPosts(userId, activeTab, cursor),
    []
  )

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-subtle sticky top-0 bg-midnight z-10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-3 text-label-lg transition-colors',
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-muted hover:text-secondary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {posts.length === 0 && !isLoading ? (
        <EmptyState
          title="No takes yet."
          description="Posts will appear here."
        />
      ) : (
        <div className="divide-y divide-subtle">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} />
      {isLoading && <PostSkeleton />}
      {!hasMore && posts.length > 0 && (
        <p className="text-label-sm text-muted text-center py-6">
          All takes loaded.
        </p>
      )}
    </div>
  )
}
```

---

### `ClubSwitchModal`

Confirms the club switch with a warning about Cred reset.

```tsx
// components/profile/ClubSwitchModal.tsx
'use client'

export function ClubSwitchModal({
  isOpen,
  onClose,
  currentClub,
}: ClubSwitchModalProps) {
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSwitch = async () => {
    if (!selectedClubId || isSubmitting) return
    setIsSubmitting(true)

    const { error } = await apiFetch('/api/users/me/club', {
      method: 'PATCH',
      body: JSON.stringify({ club_id: selectedClubId }),
    })

    if (error) {
      showErrorToast(getUserFacingError(error.code))
      setIsSubmitting(false)
      return
    }

    showSuccessToast('Club switched. Welcome to your new locker room.')
    onClose()
    // Redirect to new locker room
    window.location.href = `/locker-room/${selectedClubId}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-overlay z-50 flex items-end">
      <div className="bg-midnight rounded-t-2xl w-full p-6 max-h-[85vh] overflow-y-auto">
        <h2 className="text-heading-lg text-white mb-1">Switch club</h2>
        <p className="text-body-sm text-muted mb-4">
          Your Fan Cred on {currentClub.name} will be frozen.
          Your new locker room starts at 0.
          You can switch again in 30 days.
        </p>

        <ClubGrid
          selectedClubId={selectedClubId}
          onSelect={setSelectedClubId}
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-default text-muted py-3 rounded-md text-body-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSwitch}
            disabled={!selectedClubId || isSubmitting}
            className="flex-1 bg-purple-electric text-inverse py-3 rounded-md
                       text-body-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Switching...' : 'Confirm switch'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## User Profile Rules

1. Profile is publicly readable — no auth required to view
2. Own profile detection: compare route `userId` with `currentUser.id`
3. Edit controls only render on own profile — never on other users
4. Username changes have a 30-day cooldown — enforced server-side
5. Club switch archives old membership (`left_at`) — never deletes it
6. Club switch resets Fan Cred to 0 on new club — old Cred is frozen
7. Club switch modal warns user about Cred reset before confirming
8. Avatar is stored in Supabase Storage — max 2MB, JPEG/PNG/WebP only
9. Rank is calculated as: count of members with higher Cred + 1
10. Profile post feed has two tabs — locker room takes and hot takes
