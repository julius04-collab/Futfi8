---
trigger: always_on
---

# Component Architecture & Conventions

## Server vs Client Component Decision Tree

```
Will this component:        │ Go to:
─────────────────────────────┼────────────────
Fetch data from DB?         │ Server Component
Need auth/user session?     │ Server Component
Need SEO/metadata?          │ Server Component
Static content only?        │ Server Component
─────────────────────────────┼────────────────
Have event handlers?        │ Client Component (useState, useEffect, onClick)
Use browser APIs?           │ Client Component
Use context/state?          │ Client Component
Need realtime subscription? │ Client Component
─────────────────────────────┼────────────────
Both?                       │ Split: Server wrapper + Client inner
                            │ (see pattern below)
```

**When in doubt, default to Server Component.** Every `"use client"` increases the JS bundle.

## The Split Pattern

When a page needs both server data and client interactivity:

```tsx
// app/(main)/locker-room/[slug]/page.tsx — Server Component
export default async function LockerRoomPage({ params }: { params: { slug: string } }) {
  const club = await getClubBySlug(params.slug)
  const initialPosts = await getInitialPosts(club.locker_room_id)
  const activeRaid = await getActiveRaid(club.locker_room_id)

  return (
    <LockerRoomFeed
      club={club}
      initialPosts={initialPosts}
      activeRaid={activeRaid}
    />
  )
}

// components/locker-room/LockerRoomFeed.tsx — Client Component
'use client'
export function LockerRoomFeed({ club, initialPosts, activeRaid }: Props) {
  // Interactivity, realtime, state
}
```

**Rules:**
- Page files (`page.tsx`) are always Server Components
- "use client" goes in the leaf component files, never in pages or layouts
- Data fetching happens in the server, passed as props to client components

## Component Directory Structure

```
components/
├── ui/                  # Primitive, reusable (buttons, inputs, badges)
│   ├── Button.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBoundary.tsx
│   └── skeletons/
├── layout/              # App shell (nav, headers)
│   ├── BottomNav.tsx
│   ├── PageHeader.tsx
│   └── TopBar.tsx
├── locker-room/         # Locker room feature
│   ├── LockerRoomFeed.tsx
│   ├── LockerRoomHeader.tsx
│   ├── LockerRoomTabs.tsx
│   └── MembersLeaderboard.tsx
├── post/                # Post-related
│   ├── PostCard.tsx
│   ├── PostComposer.tsx
│   ├── PostActions.tsx
│   └── RemovedPostPlaceholder.tsx
├── match/               # Match thread feature
│   ├── MatchHeader.tsx
│   ├── MatchThreadFeed.tsx
│   └── KickoffCountdown.tsx
├── raid/                # Raid mechanic
│   ├── RaidBanner.tsx
│   ├── RaidInterface.tsx
│   └── RaidPostComposer.tsx
├── hot-takes/           # Hot take board
│   ├── HotTakeFeed.tsx
│   ├── HotTakeCard.tsx
│   ├── HotTakeComposer.tsx
│   └── HotTakeControls.tsx
├── profile/             # User profile
│   ├── ProfileHeader.tsx
│   ├── ProfilePostFeed.tsx
│   └── ClubSwitchModal.tsx
├── notifications/       # Notifications
│   └── NotificationBell.tsx
├── onboarding/          # Onboarding flow
│   └── ClubSelectCard.tsx
└── moderation/          # Moderation
    └── ReportButton.tsx
```

## Naming Conventions

| Pattern | Example | Rule |
|---|---|---|
| Component files | `PostCard.tsx` | PascalCase, matches export name |
| Index files | `index.ts` | Only for barrel exports within feature dirs |
| Hooks | `use-locker-room-feed.ts` | kebab-case, prefix with `use-` |
| Utilities | `format-relative-time.ts` | kebab-case, describe the function |
| Types | `app.types.ts` | Suffix with `.types.ts` |
| Test files | `PostCard.test.tsx` | `.test.ts` or `.test.tsx` suffix |

## Props Conventions

```tsx
// Define interface above the component
interface PostCardProps {
  post: Post & { author: User }
  currentUserId?: string  // Optional props are nullable, not required
  className?: string      // Always allow className passthrough
  onDelete?: () => void   // Callbacks use on-prefix
}

export function PostCard({ post, currentUserId, className, onDelete }: PostCardProps) {
  // ...
}
```

**Rules:**
- Interface names match the component name + `Props`
- `className` passthrough on every component that renders a DOM element
- Destructure props in the function signature — no inline `props.`
- Boolean props use plain names: `isOpen`, `hasMore`, `isLoading` (not `open`, `more`, `loading`)
- Optional callbacks default to `undefined`, never to no-op functions

## Custom Hooks

Hooks live in `hooks/` at the project root, organised by domain:

```
hooks/
├── use-locker-room-feed.ts
├── use-match-thread-feed.ts
├── use-raid-countdown.ts
├── use-hot-takes-realtime.ts
├── use-raid-feed.ts
├── use-infinite-feed.ts
└── use-debounce.ts
```

**Rules:**
- One hook per file
- Hooks return objects, not arrays (named return values)
- Every subscription hook must clean up in `useEffect` return
- Realtime channel refs use `useRef`, not state
- Hooks never call other hooks conditionally

## Context Providers

Minimal context — prefer prop drilling for simple cases.

```
context/
├── user-context.tsx       # Current user + session
├── raid-context.tsx       # Active raid state (global)
├── toast-context.tsx      # Toast notifications
└── realtime-context.tsx   # Connection status
```

**Rules:**
- Only use context for truly global state (user, active raid, toasts)
- Feature-specific state lives in the feature's client component
- Context providers wrap `app/(main)/layout.tsx` only
- Never nest context unnecessarily — each provider adds re-render overhead

## Component Rules

1. Default to Server Components — `"use client"` is opt-in, not default
2. Split pages into server data fetching + client interactive leaf components
3. Every component accepts `className` for style composition
4. Use Tailwind classes exclusively — never inline styles except for dynamic colors (club colors with opacity)
5. `Image` from `next/image` for all images — never `<img>`
6. `Link` from `next/link` for all client-side navigation — never `<a>`
7. Dynamic imports for heavy components below the fold (`dynamic(() => import(...))`)
8. Loading states use skeleton components (`animate-pulse bg-midnight`) — never spinners
9. Error boundaries wrap major UI sections (feed, composer, raid interface)
10. Empty states are explicit — never render blank surfaces
