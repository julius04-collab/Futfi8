---
trigger: always_on
---

# Testing Strategy

## Framework

- **Vitest** — test runner (fast, native ESM, Jest-compatible)
- **@testing-library/react** — component tests
- **@testing-library/jest-dom** — DOM matchers
- **msw** — API mocking (mock service worker, intercepts at network level)
- **supabase-js** is mocked at the module level via `vi.mock`

## Test Types & Locations

| Type | Tool | Location | What to test |
|---|---|---|---|
| Unit | Vitest | `lib/` tests alongside source | Utility functions, validation schemas, helpers |
| Component | Vitest + RTL | `components/__tests__/` | UI rendering, user interactions, state changes |
| API Route | Vitest + msw | `app/api/__tests__/` | Request validation, auth checks, error codes, response shapes |
| Integration | Vitest | `tests/integration/` | Multi-step flows (auth → post → reaction) |
| E2E | Playwright (future) | `tests/e2e/` | Full user journeys in browser (post-MVP) |

## What to Test (Minimum Viable Coverage)

### Unit Tests — Required for:
- Zod schemas (valid inputs pass, invalid inputs fail with right message)
- Utility functions (`formatRelativeTime`, `getBadgeLevel`, `mapFixtureStatus`, `getMatchPhase`)
- Edge case helpers (`isUsernameTemporary`, `isValidClubSlug`)
- API error code mapping (`getUserFacingError`)

### API Route Tests — Required for every route:
- **401** — unauthenticated request returns `UNAUTHORIZED`
- **400** — invalid body returns `VALIDATION_ERROR` with details
- **200/201** — valid request returns success envelope
- **Business logic** — specific error codes (403 FORBIDDEN, 422 RAID_ALREADY_USED, etc.)
- **Edge cases** — empty input, wrong types, missing optional fields

### Component Tests — Required for:
- `PostCard` — renders content, shows raid badge for `is_raid_post`, shows removed placeholder for `is_removed`
- `EmptyState` — renders title, description, optional action
- `ErrorBoundary` — catches errors, renders fallback, retry button works
- `PostComposer` — typing updates char count, submit disabled when empty
- `BottomNav` — active tab highlighted, unread badge shown

## What NOT to Test

- Supabase queries (mock them — test your logic, not Supabase)
- Realtime subscriptions (mock the channel, test the handler)
- Next.js internals (routing, SSR, caching)
- Third-party APIs (mock the HTTP calls)
- Visual regression (defer to post-MVP)

## Mock Patterns

### Supabase Client
```ts
// lib/__mocks__/supabase.ts
import { vi } from 'vitest'

export const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
}))
```

### API Fetch (component tests)
```ts
// Override global fetch or use msw
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.post('/api/posts', () => {
    return HttpResponse.json({ data: { id: '1' }, meta: { timestamp: '...' } }, { status: 201 })
  })
)
```

## Coverage Targets

| Phase | Coverage | Target |
|---|---|---|
| MVP | Statement | `>= 60%` |
| MVP+1 | Branch | `>= 70%` |
| Post-launch | Line + Branch | `>= 80%` |

Run with: `npx vitest run --coverage`

## Running Tests

```bash
# Single run
npx vitest run

# Watch mode (development)
npx vitest

# Coverage report
npx vitest run --coverage

# Specific file
npx vitest run lib/utils/__tests__/clubs.test.ts
```

## File Naming

Tests live next to their source with `.test.ts` or `.test.tsx` suffix:

```
lib/utils/clubs.ts
lib/utils/__tests__/clubs.test.ts
```

## Testing Rules

1. Every API route has at least 3 tests: 401, 400, 200/201
2. Every Zod schema has at least 2 tests: valid input, invalid input
3. Mock Supabase at the module level — never spin up a real DB
4. Component tests use `msw` to mock network — never hit real endpoints
5. Never test `console.error` calls — test the behaviour, not the log
6. Tests must be deterministic — no `Math.random()` or `Date.now()` without mocking
7. `describe` / `it` blocks, no `test` — keeps consistent with community patterns
8. Coverage reports are generated on every CI run — enforce minimums in CI
9. E2E tests are post-MVP — don't block shipping on them
10. A test that fails intermittently is worse than no test — use `vi.useFakeTimers()` for time-dependent code
