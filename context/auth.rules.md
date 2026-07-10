# Auth / Route Protection — proxy.ts

Next.js 16.2.7 renamed `middleware.ts` to `proxy.ts`. This project uses `proxy.ts` (root of the project) for all route protection. Never create `middleware.ts` — it causes a file-name conflict at build time.

## File

`/proxy.ts`

## What it does

The proxy runs on every request (except static files, API routes, and root) and handles three layers:

### 1. Auth guard
All routes except `publicPaths` (`/login`, `/register`, `/auth/*`, `/pick-team`) require a valid Supabase session. Unauthenticated requests are redirected to `/login` with a `redirect` query param pointing back to the original path.

### 2. Auth route redirect
Authenticated users visiting `/login` or `/register` are redirected to `/locker-room` (prevents re-login loops).

### 3. Onboarding guard
Authenticated users without a `home_club_id` in the `users` table are redirected to `/pick-team`. This runs after auth check, so only authenticated-but-incomplete profiles are caught.

### Root path
Unauthenticated root visits get the landing page. Authenticated root visits redirect to `/dashboard`.

## Config matcher

```typescript
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images|Images|crests|favicon.ico|$).*)',
  ],
}
```

The matcher excludes:
- API routes (`/api`)
- Next.js internals (`_next/*`)
- Static image assets (`images/`, `Images/`, `crests/`)
- `favicon.ico`
- Root path (`$`)

## Important

- Always use `supabase.auth.getUser()` (JWT-validated), never `getSession()` (cookie-only, can be spoofed)
- The Supabase client is created fresh per-request using `createServerClient` from `@supabase/ssr`
- If adding a new public-facing page (e.g. `/landing`, `/about`), add its prefix to `publicPaths`
