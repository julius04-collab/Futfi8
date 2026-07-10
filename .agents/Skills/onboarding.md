# onboarding.md — Onboarding Flow

## Overview

Onboarding is the first impression. A new user lands on Futfi8, signs
up, and needs to feel the product's energy within 60 seconds. The goal
is to get them into their locker room and posting their first take as
fast as possible.

The onboarding flow is short — 4 steps maximum. No tutorials, no
feature walkthroughs, no "here's how raids work" explainer screens.
The product teaches itself. Get them in, get them posting.

When vibecoding this feature, always have these files active:
- `project.md`
- `design-system.md`
- `database-mechanics.md`
- `database-schema.md`
- `auth.md`

---

## Onboarding Flow (4 Steps)

```
STEP 1: Landing / Sign Up
      │
      ▼
STEP 2: Club Selection
      │
      ▼
STEP 3: Username
      │
      ▼
STEP 4: First Look (locker room preview)
      │
      ▼
HOME — Locker Room Feed
```

---

## Step 1: Landing / Sign Up (`/`)

The landing page doubles as the sign-up entry point for unauthenticated users.

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│  Futfi8                             │
│  The football. The fight.           │
│                                     │
│  [Sign up with Google]              │
│  ─────── or ───────                 │
│  [Email input]                      │
│  [Password input]                   │
│  [Create account]                   │
│                                     │
│  Already have an account? Log in    │
│                                     │
└─────────────────────────────────────┘
```

**Rules:**
- Google OAuth is the primary CTA — visually dominant
- Email/password is secondary — below the fold on mobile
- No marketing copy on the sign-up screen — just the tagline
- After successful signup → redirect to `/onboarding/club-select`

```tsx
// app/(auth)/register/page.tsx
export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-pitch flex flex-col items-center
                    justify-center px-6">
      {/* Wordmark */}
      <div className="mb-10 text-center">
        <h1 className="text-display-hero font-display text-white">
          Fut<span className="text-accent">fi8</span>
        </h1>
        <p className="text-body-sm text-muted mt-1">
          The football. The fight.
        </p>
      </div>

      {/* Google OAuth — primary */}
      <GoogleSignUpButton />

      {/* Divider */}
      <div className="flex items-center gap-3 w-full max-w-sm my-5">
        <hr className="flex-1 border-subtle" />
        <span className="text-label-sm text-muted">or</span>
        <hr className="flex-1 border-subtle" />
      </div>

      {/* Email form — secondary */}
      <RegisterForm />

      <p className="text-body-sm text-muted mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-accent">Log in</Link>
      </p>
    </div>
  )
}
```

---

## Step 2: Club Selection (`/onboarding/club-select`)

The most important screen in onboarding. This is where the user
claims their club identity. The energy of this screen should feel
like picking a side — not filling out a form.

**Layout:**
```
┌─────────────────────────────────────┐
│  Pick your club.                    │
│  This is your locker room.          │
├─────────────────────────────────────┤
│  [Search clubs...]                  │
├─────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ ⚽   │ │ ⚽   │ │ ⚽   │        │
│  │ARS   │ │CHE   │ │LIV   │        │
│  └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ ⚽   │ │ ⚽   │ │ ⚽   │        │
│  │MCI   │ │MUN   │ │TOT   │        │
│  └──────┘ └──────┘ └──────┘        │
│  ... (all 20 clubs)                 │
├─────────────────────────────────────┤
│  [Continue →]  (disabled until      │
│                 club selected)      │
└─────────────────────────────────────┘
```

**Design rules:**
- 3-column grid of club crest cards
- Tapping a club: border turns `border-accent`, slight scale-up animation
- Only one club selectable at a time
- Search input filters the grid in real time
- Continue button disabled until a club is selected
- No "I don't have a club" option — every Futfi8 user has a club

```tsx
// app/(auth)/onboarding/club-select/page.tsx
'use client'

export default function ClubSelectPage() {
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const filteredClubs = CLUBS.filter(club =>
    club.name.toLowerCase().includes(search.toLowerCase()) ||
    club.short_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleContinue = async () => {
    if (!selectedClubId || isSubmitting) return
    setIsSubmitting(true)

    const { error } = await apiFetch('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ home_club_id: selectedClubId }),
    })

    if (error) {
      showErrorToast(getUserFacingError(error.code))
      setIsSubmitting(false)
      return
    }

    router.push('/onboarding/username')
  }

  return (
    <div className="min-h-screen bg-pitch flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-display-lg font-display text-white mb-1">
          Pick your club.
        </h1>
        <p className="text-body-sm text-muted">
          This is your locker room.
        </p>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clubs..."
          className="w-full bg-steel border border-default rounded-md
                     px-4 py-3 text-body-lg text-white placeholder:text-muted
                     focus:outline-none focus:border-accent"
        />
      </div>

      {/* Club grid */}
      <div className="flex-1 overflow-auto px-4">
        <div className="grid grid-cols-3 gap-3 pb-32">
          {filteredClubs.map(club => (
            <ClubSelectCard
              key={club.id}
              club={club}
              isSelected={selectedClubId === club.id}
              onSelect={() => setSelectedClubId(club.id)}
            />
          ))}
        </div>
      </div>

      {/* Continue CTA — fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-pitch
                      border-t border-subtle safe-area-pb">
        <button
          onClick={handleContinue}
          disabled={!selectedClubId || isSubmitting}
          className="w-full bg-purple-electric text-inverse font-medium
                     py-4 rounded-lg text-body-lg
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-opacity"
        >
          {isSubmitting ? 'Joining...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
```

### `ClubSelectCard`

```tsx
// components/onboarding/ClubSelectCard.tsx
export function ClubSelectCard({
  club,
  isSelected,
  onSelect,
}: ClubSelectCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-xl border-2',
        'transition-all duration-150 active:scale-95',
        isSelected
          ? 'border-accent bg-raid-bg scale-105'
          : 'border-subtle bg-midnight hover:border-default'
      )}
    >
      <Image
        src={`/crests/${club.slug}.svg`}
        alt={club.name}
        width={48}
        height={48}
      />
      <span className={cn(
        'text-label-sm truncate w-full text-center',
        isSelected ? 'text-accent' : 'text-muted'
      )}>
        {club.short_name}
      </span>
    </button>
  )
}
```

---

## Step 3: Username (`/onboarding/username`)

Quick screen — set a username. The system generates a placeholder
on signup but the user sets their real one here.

**Layout:**
```
┌─────────────────────────────────────┐
│  What do they call you?             │
│  Pick a username.                   │
├─────────────────────────────────────┤
│  @[username input]                  │
│  3–20 chars, letters/numbers/_      │
│  [Available ✓] / [Taken ✗]          │
├─────────────────────────────────────┤
│  [Set username →]                   │
└─────────────────────────────────────┘
```

**Username rules:**
- 3–20 characters
- Letters, numbers, underscores only
- Must be unique across all users
- Check availability in real time (debounced 500ms)
- Cannot be changed for 30 days after setting

```tsx
// app/(auth)/onboarding/username/page.tsx
'use client'

export default function UsernamePage() {
  const [username, setUsername] = useState('')
  const [availability, setAvailability] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Debounced availability check
  useEffect(() => {
    if (username.length < 3) {
      setAvailability(username.length > 0 ? 'invalid' : 'idle')
      return
    }

    const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username)
    if (!isValid) {
      setAvailability('invalid')
      return
    }

    setAvailability('checking')
    const timeout = setTimeout(async () => {
      const { data } = await apiFetch<{ available: boolean }>(
        `/api/users/check-username?username=${username}`
      )
      setAvailability(data?.available ? 'available' : 'taken')
    }, 500)

    return () => clearTimeout(timeout)
  }, [username])

  const handleSubmit = async () => {
    if (availability !== 'available' || isSubmitting) return
    setIsSubmitting(true)

    const { error } = await apiFetch('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    })

    if (error) {
      showErrorToast(getUserFacingError(error.code))
      setIsSubmitting(false)
      return
    }

    router.push('/onboarding/welcome')
  }

  return (
    <div className="min-h-screen bg-pitch flex flex-col px-6">
      <div className="pt-12 pb-8">
        <h1 className="text-display-lg font-display text-white mb-1">
          What do they call you?
        </h1>
        <p className="text-body-sm text-muted">Pick a username.</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2
                           text-body-lg text-muted">
            @
          </span>
          <input
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().slice(0, 20))}
            placeholder="yourname"
            className="w-full bg-steel border border-default rounded-md
                       pl-8 pr-4 py-3 text-body-lg text-white
                       placeholder:text-muted focus:outline-none
                       focus:border-accent"
          />
        </div>

        {/* Availability indicator */}
        <div className="flex items-center gap-2 h-5">
          {availability === 'checking' && (
            <p className="text-label-sm text-muted">Checking...</p>
          )}
          {availability === 'available' && (
            <p className="text-label-sm text-win">✓ Available</p>
          )}
          {availability === 'taken' && (
            <p className="text-label-sm text-loss">✗ Already taken</p>
          )}
          {availability === 'invalid' && username.length > 0 && (
            <p className="text-label-sm text-loss">
              Letters, numbers, and underscores only
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto pb-8 safe-area-pb">
        <button
          onClick={handleSubmit}
          disabled={availability !== 'available' || isSubmitting}
          className="w-full bg-purple-electric text-inverse font-medium
                     py-4 rounded-lg text-body-lg
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Setting username...' : 'Set username →'}
        </button>
      </div>
    </div>
  )
}
```

---

## Step 4: Welcome / First Look (`/onboarding/welcome`)

A brief glimpse of the locker room before full entry.
Show 3 recent posts from their locker room to create anticipation.

**Layout:**
```
┌─────────────────────────────────────┐
│  Welcome to the                     │
│  [Club Name] locker room.           │
│  [Club crest — large]               │
├─────────────────────────────────────┤
│  What's happening in your room:     │
│  ─────────────────────────────      │
│  [Post preview 1]                   │
│  [Post preview 2]                   │
│  [Post preview 3]                   │
├─────────────────────────────────────┤
│  [Enter locker room →]              │
└─────────────────────────────────────┘
```

```tsx
// app/(auth)/onboarding/welcome/page.tsx
export default async function WelcomePage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's club
  const { data: profile } = await supabase
    .from('users')
    .select('home_club_id, username')
    .eq('id', user!.id)
    .single()

  const { data: club } = await supabase
    .from('clubs')
    .select('*, locker_rooms(id)')
    .eq('id', profile!.home_club_id!)
    .single()

  // Get 3 recent posts for preview
  const { data: previewPosts } = await supabase
    .from('posts')
    .select('id, content, created_at, author:users(username)')
    .eq('locker_room_id', club?.locker_rooms[0]?.id)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen bg-pitch flex flex-col px-6">
      <div className="pt-12 pb-6 text-center">
        <Image
          src={`/crests/${club!.slug}.svg`}
          alt={club!.name}
          width={80}
          height={80}
          className="mx-auto mb-4"
        />
        <h1 className="text-display-lg font-display text-white mb-1">
          Welcome to the
        </h1>
        <h2 className="text-display-lg font-display text-accent">
          {club!.name} locker room.
        </h2>
      </div>

      {/* Post previews */}
      {previewPosts && previewPosts.length > 0 && (
        <div className="mb-8">
          <p className="text-label-sm text-muted mb-3">
            WHAT'S HAPPENING IN YOUR ROOM
          </p>
          <div className="space-y-2">
            {previewPosts.map(post => (
              <div key={post.id}
                   className="bg-midnight rounded-lg p-3 border border-subtle">
                <p className="text-body-sm text-secondary line-clamp-2">
                  {post.content}
                </p>
                <p className="text-label-sm text-muted mt-1">
                  @{post.author?.username}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pb-8 safe-area-pb">
        <Link
          href={`/locker-room/${club!.slug}`}
          className="block w-full bg-purple-electric text-inverse font-medium
                     py-4 rounded-lg text-body-lg text-center"
        >
          Enter locker room →
        </Link>
      </div>
    </div>
  )
}
```

---

## API Routes for Onboarding

### Check Username Availability

```ts
// app/api/users/check-username/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Username is required.' } },
      { status: 400 }
    )
  }

  const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username)
  if (!isValid) {
    return NextResponse.json({ data: { available: false } })
  }

  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single()

  return NextResponse.json({
    data: { available: !data },
    meta: { timestamp: new Date().toISOString() },
  })
}
```

---

## Onboarding Guard (Middleware)

Users who haven't completed onboarding (no `home_club_id`) are
redirected to `/onboarding/club-select` when trying to access any
main app route. See `auth.rules.md` for full middleware implementation.

```ts
// Completion check order:
// 1. home_club_id set? → if not, go to /onboarding/club-select
// 2. username set to non-generated value? → if not, go to /onboarding/username
// 3. Both set → onboarding complete, proceed to main app
```

Detect generated username (temp) vs real username:

```ts
// Temp usernames have format: word_xxxxxx (6 char hex suffix)
// Real usernames are set by the user and don't follow this pattern
// Simple check: if username matches /^.+_[a-f0-9]{6}$/ → still temp

function isUsernameTemporary(username: string): boolean {
  return /^.+_[a-f0-9]{6}$/.test(username)
}
```

---

## Onboarding Rules

1. Maximum 4 steps — never add screens without removing one
2. Club selection is mandatory — no skip option
3. Username is mandatory — no skip option
4. Welcome screen is the only optional-feeling step — but still required
5. Google OAuth is the primary sign-up CTA — email is secondary
6. Club crest grid uses 3 columns — not a list, not a search-only view
7. Username availability is checked client-side with 500ms debounce — never on submit only
8. After onboarding completes — redirect directly to `/locker-room/{slug}`, not dashboard
9. Onboarding routes are accessible without auth — redirect to app if already complete
10. Post previews on welcome screen use `line-clamp-2` — never full content
