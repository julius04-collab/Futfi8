---
trigger: always_on
---

# State Management Patterns

## Philosophy

Futfi8 uses React's built-in state primitives — not Redux or Zustand. The realtime-heavy nature of the app means most state is ephemeral (feed items, raid windows, notifications) and doesn't benefit from a global store. Keep state as close to where it's used as possible.

## State Categories

| Category | Tool | Scope | Example |
|---|---|---|---|
| Server data | Props from Server Component | Page | Posts, club info, match data |
| Real-time feed | `useState` + Supabase subscription | Component | New posts, raid updates |
| Optimistic mutations | Local `useState` with rollback | Component | Upvotes, post creation |
| Global UI state | React Context | App | User session, active raid, toasts |
| URL state | `searchParams` | Page | Sort order, club filter, cursor |
| Form state | Local `useState` | Component | Composer input, report form |
| Persistent prefs | Supabase DB | User | Notification preferences |
| Cached server data | Not used (server fetches on navigation) | — | — |

## Decision Tree

```
Is this state server-owned (posts, clubs, matches)?
  └─ Yes → Fetch in Server Component, pass as props
  └─ No → Is it URL-relevant (sort, filter, pagination)?
       └─ Yes → URL searchParams
       └─ No → Is it needed by 3+ unrelated components?
            └─ Yes → React Context
            └─ No → Local useState in the nearest common parent
```

## Why No React Query / TanStack Query

- **Server Components handle initial data fetching** — no need for a cache layer on top
- **Realtime subscriptions push updates** — polling/cache invalidation is redundant
- **Navigation is full page loads** — no SPA-style client routing between pages
- **If caching is needed later**, add React Query selectively (not as a project-wide default)

## Context Boundaries

```
app/(main)/layout.tsx
├── UserProvider          — user session, club slug
│   ├── RaidProvider     — active raid state (shared across locker room pages)
│   │   ├── ToastProvider — global toast queue
│   │   │   └── children (pages)
```

### UserProvider
```tsx
// context/user-context.tsx
'use client'
interface UserContextValue {
  user: User | null
  clubSlug: string | null
  isLoading: boolean
}

export function UserProvider({ children, initialUser, initialClubSlug }: Props) {
  const [user] = useState(initialUser)
  const [clubSlug] = useState(initialClubSlug)

  return (
    <UserContext.Provider value={{ user, clubSlug, isLoading: false }}>
      {children}
    </UserContext.Provider>
  )
}
```

The provider receives initial data from the server layout — it does not fetch its own.

### RaidProvider
```tsx
// context/raid-context.tsx
'use client'
interface RaidContextValue {
  activeRaid: RaidWindow | null
  isRaidMode: boolean
  setActiveRaid: (raid: RaidWindow | null) => void
  setRaidMode: (active: boolean) => void
}
```

Only relevant on locker room pages. Wraps below UserProvider so it can access user context.

## Optimistic Update Pattern

```tsx
const handleUpvote = async (postId: string) => {
  // 1. Mutate local state immediately
  setPosts(prev => prev.map(p =>
    p.id === postId ? { ...p, upvote_count: p.upvote_count + 1, hasUpvoted: true } : p
  ))

  // 2. Fire API request
  const { error } = await apiFetch('/api/reactions', {
    method: 'POST',
    body: JSON.stringify({ post_id: postId, type: 'upvote' }),
  })

  // 3. Rollback on failure
  if (error) {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, upvote_count: p.upvote_count - 1, hasUpvoted: false } : p
    ))
    showErrorToast(getUserFacingError(error.code))
  }
}
```

**Rules:**
- Always mutate optimistically before the API call
- Always rollback on error (exact inverse of the optimistic mutation)
- Use temporary IDs for new posts (`temp-${Date.now()}`), replace with real IDs on success
- Never show optimistic state as confirmed — the UI naturally reconciles on API success

## URL State Pattern

Sort, filter, and pagination state lives in URL search params — not in React state:

```tsx
// Reading
const searchParams = useSearchParams()
const sort = searchParams.get('sort') ?? 'top_today'
const cursor = searchParams.get('cursor')

// Writing
const router = useRouter()
router.push(`/hot-takes?sort=new&cursor=${nextCursor}`, { scroll: false })
```

Benefits: shareable URLs, back/forward navigation works, no state sync issues.

## Form State

Forms use local `useState` — no form library for MVP:

```tsx
const [content, setContent] = useState('')
const [isSubmitting, setIsSubmitting] = useState(false)
```

If a feature requires complex validation (multi-step, conditional fields), add React Hook Form — but don't reach for it by default.

## State Management Rules

1. Default to `useState` in the nearest common parent — don't prematurely elevate to context
2. Context is for global cross-cutting state only: user session, active raid, toasts
3. Context providers receive initial data from Server Components — never self-fetch
4. URL params for any state that should be shareable or bookmarkable (sort, filter, page)
5. Optimistic mutations always roll back to exact previous state on error
6. Real-time updates from Supabase are merged into local state — not replacing it
7. Don't use React Query for MVP — Server Components + Realtime cover the needs
8. Form state is local to the component — lifted only when sibling components need it
9. Never store fetched data in context if it's only used by one subtree
10. Context values that change frequently should be split from stable values to prevent unnecessary re-renders
