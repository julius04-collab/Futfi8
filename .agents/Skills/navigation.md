# navigation.skill.md — App Navigation & Routing

## Overview

Futfi8 is a mobile-first web app. Navigation must feel native —
fast, predictable, and thumb-friendly. The global nav is a bottom
bar on mobile. Deep links into locker rooms, match threads, and
raid windows must work correctly from notifications and shared URLs.

When vibecoding this feature, always have these files active:
- `project.md`
- `design-system.md`
- `auth.md`

---

## Route Map

### Public Routes (no auth required)
```
/                           Landing page
/login                      Sign in
/register                   Create account
/auth/callback              OAuth callback
/locker-room/[clubSlug]     Locker room (read-only for guests)
/locker-room/[clubSlug]/members
/locker-room/[clubSlug]/raid-history
/locker-room/[clubSlug]/fixtures
/match/[matchId]            Match thread (read-only for guests)
/hot-takes                  Hot take board (read-only for guests)
/profile/[userId]           Public profile
```

### Protected Routes (auth required)
```
/onboarding/username        Set username
/onboarding/club-select     Pick home club
/onboarding/welcome         Welcome screen
/profile/me                 Own profile
/notifications              Notifications list
```

### API Routes
```
/api/auth/*                 Auth endpoints
/api/users/*                User endpoints
/api/clubs/*                Club endpoints
/api/locker-rooms/*         Locker room endpoints
/api/posts                  Post creation
/api/hot-takes              Hot takes
/api/raids/*                Raid endpoints
/api/matches/*              Match endpoints
/api/match-threads/*        Match thread endpoints
/api/reactions              Reactions
/api/notifications/*        Notifications
/api/cron/*                 Background jobs
```

---

## URL Conventions

### Club Slug in URLs
Club URLs always use slug — never UUID:
```
✓ /locker-room/arsenal
✓ /locker-room/man-city
✗ /locker-room/550e8400-e29b-41d4-a716-446655440000
```

### Match Thread URL
```
/locker-room/[clubSlug]/match/[matchId]
```
Match thread lives under the club's locker room URL — not at a top-level
`/match/` route. This keeps the club context visible in the URL.

### Raid Deep Link
```
/locker-room/[clubSlug]?raid=[raidWindowId]
```
Raid window is a query param — it opens the raid banner/interface
overlay on the locker room page. Not a separate route.

### Profile Route
```
/profile/[userId]   — any user by ID
/profile/me         — redirects to /profile/[currentUserId]
```

---

## Bottom Navigation

The primary navigation for mobile. Fixed at the bottom of the screen.
Four tabs — always visible when authenticated.

```
┌─────────────────────────────────────┐
│                                     │
│  App content                        │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  🏠        🔥        🔔        👤   │
│ Home    Hot Takes  Notifs   Profile │
└─────────────────────────────────────┘
```

### Tab Definitions

| Tab | Icon | Route | Badge |
|---|---|---|---|
| Home | 🏠 | `/locker-room/[userClubSlug]` | None |
| Hot Takes | 🔥 | `/hot-takes` | None |
| Notifications | 🔔 | `/notifications` | Unread count |
| Profile | 👤 | `/profile/me` | None |

"Home" always navigates to the user's own locker room — not a generic home screen.

### `BottomNav` Component

```tsx
// components/layout/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface BottomNavProps {
  clubSlug: string
  unreadCount: number
}

const getNavItems = (clubSlug: string) => [
  {
    id: 'home',
    label: 'Home',
    href: `/locker-room/${clubSlug}`,
    icon: HomeIcon,
    matchPaths: ['/locker-room'],
  },
  {
    id: 'hot-takes',
    label: 'Hot Takes',
    href: '/hot-takes',
    icon: FireIcon,
    matchPaths: ['/hot-takes'],
  },
  {
    id: 'notifications',
    label: 'Alerts',
    href: '/notifications',
    icon: BellIcon,
    matchPaths: ['/notifications'],
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile/me',
    icon: UserIcon,
    matchPaths: ['/profile'],
  },
]

export function BottomNav({ clubSlug, unreadCount }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-midnight border-t
                    border-default safe-area-pb z-20">
      <div className="flex">
        {getNavItems(clubSlug).map(item => {
          const isActive = item.matchPaths.some(p => pathname.startsWith(p))
          const Icon = item.icon

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center',
                'py-3 gap-1 transition-colors duration-150',
                isActive ? 'text-accent' : 'text-muted hover:text-secondary'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5',
                    isActive ? 'text-accent' : 'text-muted'
                  )}
                />
                {/* Unread badge on notifications */}
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4
                                   bg-raid text-inverse text-[10px] font-bold
                                   rounded-full flex items-center justify-center
                                   px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

---

## App Shell Layout

The root layout wraps all authenticated pages with the bottom nav
and provides global context.

```tsx
// app/(main)/layout.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/BottomNav'
import { redirect } from 'next/navigation'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's club slug for Home tab
  const { data: profile } = await supabase
    .from('users')
    .select('home_club:clubs!home_club_id(slug)')
    .eq('id', user.id)
    .single()

  // Get unread notification count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  const clubSlug = profile?.home_club?.slug ?? 'arsenal'

  return (
    <div className="min-h-screen bg-pitch">
      {/* Main content — padding bottom for nav bar */}
      <main className="pb-16">
        {children}
      </main>

      {/* Bottom nav */}
      <BottomNav
        clubSlug={clubSlug}
        unreadCount={unreadCount ?? 0}
      />
    </div>
  )
}
```

---

## Page Headers

Each page has a consistent header with back navigation where applicable.

```tsx
// components/layout/PageHeader.tsx
interface PageHeaderProps {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
}

export function PageHeader({ title, showBack, rightAction }: PageHeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-4
                       bg-midnight border-b border-subtle
                       sticky top-0 z-10">
      {showBack && <BackButton />}
      <h1 className="text-heading-lg text-white flex-1 truncate">
        {title}
      </h1>
      {rightAction && (
        <div className="flex-shrink-0">{rightAction}</div>
      )}
    </header>
  )
}

// components/layout/BackButton.tsx
'use client'
import { useRouter } from 'next/navigation'

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="text-muted hover:text-white transition-colors p-1 -ml-1"
      aria-label="Go back"
    >
      ← 
    </button>
  )
}
```

---

## Deep Link Handling

### Notification Deep Links

Notifications include deep link URLs. When tapped, they navigate
directly to the relevant content.

```ts
// lib/utils/deep-links.ts
export function getDeepLink(notification: Notification): string {
  switch (notification.type) {
    case 'raid_window_open':
    case 'raid_incoming':
      return `/locker-room/${notification.defending_club_slug}?raid=${notification.reference_id}`

    case 'raid_window_closed':
      return `/locker-room/${notification.club_slug}/raid-history`

    case 'match_thread_open':
      return `/locker-room/${notification.club_slug}/match/${notification.reference_id}`

    case 'post_upvoted':
    case 'post_replied':
      return `/locker-room/${notification.club_slug}?post=${notification.reference_id}`

    case 'fan_cred_milestone':
      return `/profile/me`

    case 'club_switch_confirmed':
      return `/locker-room/${notification.new_club_slug}`

    default:
      return '/notifications'
  }
}
```

### Scroll to Post

When navigating to a locker room with a `?post=` query param, scroll
to and highlight the specific post.

```tsx
// In LockerRoomFeed — handle post deep link
const searchParams = useSearchParams()
const highlightPostId = searchParams.get('post')

useEffect(() => {
  if (!highlightPostId) return
  const el = document.getElementById(`post-${highlightPostId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-1', 'ring-accent') // Highlight briefly
    setTimeout(() => el.classList.remove('ring-1', 'ring-accent'), 3000)
  }
}, [highlightPostId, posts])

// In PostCard — add id
<div id={`post-${post.id}`} className="...">
```

---

## Loading States for Navigation

Use Next.js `loading.tsx` files for route-level loading states.

```tsx
// app/(main)/locker-room/[clubId]/loading.tsx
import { PostFeedSkeleton } from '@/components/ui/skeletons/PostFeedSkeleton'
import { LockerRoomHeaderSkeleton } from '@/components/ui/skeletons/LockerRoomHeaderSkeleton'

export default function LockerRoomLoading() {
  return (
    <div>
      <LockerRoomHeaderSkeleton />
      <div className="p-4">
        <PostFeedSkeleton count={5} />
      </div>
    </div>
  )
}
```

```tsx
// app/(main)/hot-takes/loading.tsx
import { PostFeedSkeleton } from '@/components/ui/skeletons/PostFeedSkeleton'

export default function HotTakesLoading() {
  return (
    <div>
      {/* Controls skeleton */}
      <div className="flex gap-2 px-4 py-3 border-b border-subtle animate-pulse">
        <div className="h-7 w-24 bg-steel rounded-full" />
        <div className="h-7 w-16 bg-steel rounded-full" />
        <div className="h-7 w-20 bg-steel rounded-full" />
      </div>
      <div className="p-4">
        <PostFeedSkeleton count={6} />
      </div>
    </div>
  )
}
```

---

## Redirect Logic Summary

```
Unauthenticated user → protected route    : redirect to /login
Authenticated user → /login or /register  : redirect to /locker-room/[slug]
Authenticated + no home_club_id → any main route : redirect to /onboarding/club-select
/profile/me → resolves to /profile/[currentUserId]
```

---

## Navigation Rules

1. Bottom nav is always visible on authenticated pages — never hidden
2. Home tab always navigates to the user's own locker room — not `/`
3. Club slugs in URLs — never UUIDs
4. Match threads are nested under `/locker-room/[slug]/match/[id]`
5. Raid windows are query params `?raid=[id]` — not separate routes
6. `?post=[id]` deep links scroll to and briefly highlight the post
7. Every page with back navigation uses `router.back()` — not hardcoded hrefs
8. `loading.tsx` files provide skeleton UI for every major route
9. Bottom nav unread badge caps at 99+ — never shows raw count beyond that
10. `/profile/me` is a convenience alias — always resolves to the real user ID
