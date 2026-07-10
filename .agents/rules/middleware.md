---
trigger: always_on
---

# Middleware — Route Protection & Guards

## Overview

The Next.js middleware handles pre-page-load checks:
1. Authentication status (logged in vs guest)
2. Onboarding completion (`home_club_id` set?)
3. Ban status (temporary or permanent)
4. Route redirection based on auth state

File: `middleware.ts` at project root (not inside `app/`).

## Matcher Config

```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|crests).*)'],
}
```

This excludes static assets and crest SVGs from middleware processing.
All other routes — pages, API, cron — pass through middleware.

## Full Middleware

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── AUTH CHECK ────────────────────────────────────────────────
  const publicRoutes = ['/', '/login', '/register', '/auth/callback']
  const protectedRoutes = ['/locker-room', '/hot-takes', '/profile', '/onboarding', '/notifications']
  const authRoutes = ['/login', '/register']

  const isPublic = publicRoutes.some(r => pathname === r)
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r))
  const isAuthRoute = authRoutes.some(r => pathname.startsWith(r))

  // Unauthenticated → protected route → redirect to login
  if (!user && isProtected && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated → auth route (login/register) → redirect to locker room
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/locker-room', request.url))
  }

  // ── ONBOARDING GUARD ──────────────────────────────────────────
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('home_club_id, username')
      .eq('id', user.id)
      .single()

    const isOnboardingRoute = pathname.startsWith('/onboarding')
    const isAuthCallback = pathname === '/auth/callback'
    const isApiRoute = pathname.startsWith('/api')

    if (!isOnboardingRoute && !isAuthCallback && !isApiRoute) {
      // No home club → redirect to club selection
      if (!profile?.home_club_id) {
        return NextResponse.redirect(new URL('/onboarding/club-select', request.url))
      }
    }

    // If on onboarding but already complete → redirect to locker room
    if (isOnboardingRoute && profile?.home_club_id && profile?.username) {
      const { data: club } = await supabase
        .from('clubs')
        .select('slug')
        .eq('id', profile.home_club_id)
        .single()
      return NextResponse.redirect(new URL(`/locker-room/${club?.slug ?? 'arsenal'}`, request.url))
    }
  }

  // ── BAN CHECK (API routes only) ───────────────────────────────
  // Ban check for write operations is handled in the API route itself
  // (middleware runs on every request including static assets — too broad for DB calls)
  // See lib/moderation/check-ban.ts for the per-route ban check

  return response
}
```

## Route Classification

| Route | Type | Behaviour |
|---|---|---|
| `/` | Public | Landing page, always accessible |
| `/login`, `/register` | Auth | Redirect to locker room if authenticated |
| `/auth/callback` | Public | OAuth callback, no redirect |
| `/locker-room/*` | Protected | Auth required, onboarding required |
| `/hot-takes` | Protected | Auth required |
| `/match/*` | Public | Guest can view, cannot post |
| `/profile/[id]` | Public | Guest can view public profile |
| `/profile/me` | Protected | Own profile, auth required |
| `/notifications` | Protected | Auth required |
| `/onboarding/*` | Protected | Only during onboarding, redirects away if complete |
| `/api/*` | Bypass | Handled in route handlers |

## Onboarding Guard Logic

```
User hits any protected route
  ↓
Authenticated? → No → /login
  ↓
home_club_id set? → No → /onboarding/club-select
  ↓
Username still temporary? → No → proceed
  ↓
Yes → /onboarding/username
  ↓
Proceed to route
```

Detect temporary username:
```ts
function isUsernameTemporary(username: string): boolean {
  return /^.+_[a-f0-9]{6}$/.test(username)
}
```

## Cron Route Security

Cron routes validate via header — no session needed:

```ts
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}
```

This check runs inside the route handler, not in middleware.

## API Route Ban Check

Middeware is too broad for DB calls. Ban check runs inside each API route:

```ts
// In every POST/PATCH/DELETE API route — after auth check
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

## Middleware Rules

1. Middleware runs on every route matching the matcher config — keep it fast, no heavy computation
2. Use `getUser()` not `getSession()` — validates JWT server-side
3. Never redirect API routes — let the route handler return proper error codes
4. Onboarding guard runs after auth check — only for authenticated users
5. Ban check is in API route handlers, not middleware (avoids DB call on every static asset)
6. Cron routes validate by `CRON_SECRET` header — excluded from session check
7. Match pages are publicly readable — middleware does not redirect guests
8. Middleware cannot use `cookies()` from `next/headers` — use the request.cookies API instead
9. The `matcher` config excludes static assets — prevents unnecessary middleware runs
10. `/auth/callback` bypasses all guards — OAuth flow must not be interrupted
