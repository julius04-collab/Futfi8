---
trigger: always_on
---

# auth.md — Futfi8 Authentication & Authorization

## Overview

Futfi8 uses Supabase Auth as the authentication layer. Two sign-in methods
are supported: email + password and Google OAuth. JWT access tokens are
managed automatically by Supabase — the app does not implement custom token
logic.

Authorization (who can do what) is enforced at two layers:
1. **RLS policies** on the database — first line of defence
2. **API route validation** — second line of defence, business logic checks

Never rely on client-side checks alone for authorization. Always validate
on the server.

---

## Authentication Methods

### Email + Password
- Min password length: 8 characters
- Must contain at least one letter and one number
- Validated with Zod on the API route before Supabase call
- Supabase handles hashing — never hash passwords manually

### Google OAuth
- Configured in Supabase dashboard under Auth > Providers > Google
- Redirect URL: `{NEXT_PUBLIC_APP_URL}/auth/callback`
- On first sign-in: trigger onboarding flow (club selection)
- On subsequent sign-ins: redirect to home locker room

---

## Token Strategy

Supabase manages JWTs automatically. Key behaviours:

| Token | Expiry | Storage |
|---|---|---|
| Access token | 1 hour | Supabase client memory |
| Refresh token | 7 days | httpOnly cookie (via Supabase SSR) |

- Use `@supabase/ssr` package for Next.js — handles cookie-based sessions correctly
- Never store tokens in localStorage — use the Supabase SSR client
- Access tokens are refreshed automatically by the Supabase client

---

## Supabase Client Setup

### Server Client (API routes, Server Components)
```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name, options) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}

export function createSupabaseServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Server only — bypasses RLS
    { cookies: { get: () => '', set: () => {}, remove: () => {} } }
  )
}
```

### Browser Client (Client Components)
```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Rules:**
- `createSupabaseServerClient()` — use in Server Components and API routes (respects RLS)
- `createSupabaseServiceClient()` — use only in API routes and cron jobs that need elevated access
- `createSupabaseBrowserClient()` — use only in Client Components
- Never use the service client in any component — server API routes only

---

## Auth Flow

### Registration
```
1. User submits email + password
2. API route validates with Zod (email format, password strength)
3. Check username availability — query public.users for username uniqueness
4. Call supabase.auth.signUp({ email, password })
5. Supabase creates auth.users record and sends confirmation email
6. Create public.users record via trigger (see trigger below)
7. Return success — redirect to /onboarding/club-select
```

### Email Confirmation
```
1. User clicks link in confirmation email
2. Supabase redirects to /auth/callback?code={code}
3. Route handler exchanges code for session
4. Redirect to /onboarding/club-select if home_club_id is null
5. Redirect to /locker-room/{slug} if onboarding is complete
```

### Login
```
1. User submits email + password
2. API route validates with Zod
3. Call supabase.auth.signInWithPassword({ email, password })
4. On success: redirect to home locker room
5. On failure: return 401 with generic "Invalid credentials" message
   — never reveal whether email exists or password is wrong
```

### Google OAuth
```
1. User clicks "Continue with Google"
2. Call supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
3. User completes Google consent
4. Supabase redirects to /auth/callback?code={code}
5. Route handler exchanges code for session
6. Check if public.users record exists (returning user) or needs creation (new user)
7. New user → /onboarding/club-select
8. Returning user → /locker-room/{slug}
```

### Auth Callback Route
```ts
// app/auth/callback/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('users')
        .select('home_club_id')
        .eq('id', user!.id)
        .single()

      if (!profile?.home_club_id) {
        return NextResponse.redirect(`${origin}/onboarding/club-select`)
      }
      // get their club slug and redirect
      return NextResponse.redirect(`${origin}/locker-room/${profile.home_club_id}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

### Sign Out
```ts
// Always sign out server-side to clear cookies
await supabase.auth.signOut()
// Redirect to /login
```

---

## Auth Trigger — Create Public Profile

When a user signs up via Supabase Auth, automatically create their public profile:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username)
  values (
    new.id,
    -- Generate temp username from email prefix + random suffix
    split_part(new.email, '@', 1) || '_' || substr(md5(random()::text), 1, 6)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Username is a temporary generated value — user sets their real username during onboarding.

---

## Route Protection

### Middleware
```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

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

  // Protected routes — redirect to login if not authenticated
  const protectedRoutes = ['/locker-room', '/hot-takes', '/profile', '/onboarding']
  const isProtected = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Auth routes — redirect to home if already authenticated
  const authRoutes = ['/login', '/register']
  const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/locker-room', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|crests).*)'],
}
```

---

## API Route Authentication

Every API route that touches user data must verify the session:

```ts
// Standard auth check pattern for API routes
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Proceed with authenticated user
}
```

**Never use `getSession()` for auth checks in API routes** — always use `getUser()`.
`getSession()` does not validate the JWT with Supabase Auth server — it reads from
the cookie only and can be spoofed. `getUser()` always validates server-side.

---

## Onboarding Guard

After authentication, users without a `home_club_id` must complete onboarding
before accessing any main app routes:

```ts
// In middleware — after auth check
if (user && !isAuthRoute) {
  const { data: profile } = await supabase
    .from('users')
    .select('home_club_id')
    .eq('id', user.id)
    .single()

  const isOnboarding = request.nextUrl.pathname.startsWith('/onboarding')

  if (!profile?.home_club_id && !isOnboarding) {
    return NextResponse.redirect(new URL('/onboarding/club-select', request.url))
  }
}
```

---

## Age Gate

Users under 16 are restricted from the Raid mechanic. Implemented at registration:

```ts
// During onboarding — collect date of birth
// Store birth year in users table (add dob_year column)
// On raid post attempt: check age server-side

const birthYear = user.dob_year
const currentYear = new Date().getFullYear()
const age = currentYear - birthYear

if (age < 16) {
  return NextResponse.json(
    { error: 'Raid mechanic is not available for users under 16' },
    { status: 403 }
  )
}
```

Age gate is enforced in the API route — never rely on client-side checks.

---

## Rate Limiting

Apply to all auth endpoints using Upstash Redis or a simple in-memory store:

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/auth/register` | 5 requests | 15 minutes per IP |
| `POST /api/auth/login` | 10 requests | 15 minutes per IP |
| `POST /api/auth/callback` | 20 requests | 15 minutes per IP |

On 5 failed login attempts from the same IP: lock out for 15 minutes.
Return `429 Too Many Requests` with a `Retry-After` header.

---

## Security Rules

- Never log full JWT tokens — log user IDs only
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client bundle
- Always use `getUser()` not `getSession()` for server-side auth validation
- Validate every user action against their actual DB membership — not just their JWT claims
- Username changes allowed once per 30 days — enforce in API, not just UI
- Deleted accounts: invalidate all sessions immediately via Supabase admin API
- Password reset: use Supabase's built-in reset flow — never implement custom reset tokens
