# project.rules.md — Futfi8 Master Context

## What is Futfi8?

Futfi8 is a club-based football fan community web app. Every Premier League club has a dedicated **locker room** — a space where fans post takes, react to match events, and build reputation. The defining mechanic is the **Raid**: when your club wins a match, your locker room earns a 2-hour window to enter the losing club's locker room and post a single take.

**Tagline:** The football. The fight.
**Name breakdown:** Fut = Football. Fi8 = Fight (the banter, the raids, the rivalry).

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, RSC) | SSR for SEO, React 19 |
| Language | TypeScript (strict mode) | No `any` types — ever |
| Database | PostgreSQL via Supabase | Primary data store |
| Auth | Supabase Auth | Email + Google OAuth |
| Realtime | Supabase Realtime | Live match threads, post feeds |
| File Storage | Supabase Storage | Avatars, club crests |
| Styling | Tailwind CSS 4 | Mobile-first, 390px base |
| Hosting | Vercel | Zero-config deployment |
| Background Jobs | Vercel Cron | Raid timers, match polling |
| Email | Nodemailer (SMTP) | Notifications, weekly digest |
| Football Data | API-Football (RapidAPI) | Fixtures, live scores, results |
| Content Moderation | Perspective API (Google) | Toxicity scoring |

---

## Folder Structure

```
futfi8/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth group — login, register, onboarding
│   │   ├── login/
│   │   ├── register/
│   │   └── onboarding/
│   ├── (main)/                 # Main app group — requires auth
│   │   ├── locker-room/[clubId]/
│   │   ├── hot-takes/
│   │   ├── match/[matchId]/
│   │   └── profile/[userId]/
│   ├── api/                    # API routes
│   │   ├── auth/
│   │   ├── clubs/
│   │   ├── posts/
│   │   ├── matches/
│   │   ├── raids/
│   │   ├── notifications/
│   │   ├── cron/               # Cron job endpoints
│   │   └── webhooks/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                     # Reusable primitives (Button, Input, Badge, etc.)
│   ├── locker-room/            # Locker room specific components
│   ├── raid/                   # Raid mechanic components
│   ├── match/                  # Match thread components
│   ├── post/                   # Post card, composer, reactions
│   ├── notifications/          # Notification bell, list, item
│   └── layout/                 # Nav, header, bottom bar
├── lib/
│   ├── supabase/               # Supabase client + server + route-handler instances
│   ├── api-football/           # Football API wrapper
│   ├── raid/                   # Raid mechanic service layer
│   ├── perspective/            # Content moderation helper
│   ├── fan-cred/               # Fan Cred score calculation
│   └── utils/                  # General utilities (clubs, cn, etc.)
├── types/
│   ├── database.types.ts       # Supabase schema types
│   ├── api-football.types.ts   # API-Football response types
│   ├── api.types.ts            # API request/response types
│   └── app.types.ts            # App-level shared types
├── hooks/                      # Custom React hooks
├── context/                    # Skill & rule files (moved to .agent/)
├── supabase/
│   ├── migrations/             # Version-controlled SQL migrations
│   └── seed.sql                # Club + locker room seed data
├── public/
│   └── crests/                 # Club crest SVGs (named by club slug)
└── .agent/                     # AI agent context (rules/ + Skills/)
```

---

## Naming Conventions

### Files & Folders
- All lowercase, kebab-case for files and folders
- Components: `PascalCase.tsx` (e.g. `LockerRoomFeed.tsx`)
- Hooks: `use-kebab-case.ts` (e.g. `use-raid-window.ts`)
- Utilities: `kebab-case.ts` (e.g. `fan-cred.ts`)
- Types: `kebab-case.types.ts`

### Variables & Functions
- `camelCase` for variables and functions
- `PascalCase` for React components and TypeScript interfaces/types
- `SCREAMING_SNAKE_CASE` for constants
- `snake_case` for database field names (Supabase convention)

### Database
- Tables: plural snake_case (`locker_rooms`, `raid_windows`, `match_threads`)
- Fields: singular snake_case (`user_id`, `created_at`, `is_raid_post`)
- Foreign keys: `{referenced_table_singular}_id` (e.g. `club_id`, `match_id`)

---

## Coding Rules

### TypeScript
- Strict mode always on — `"strict": true` in tsconfig
- No `any` — use `unknown` and narrow types properly
- No non-null assertions (`!`) unless absolutely unavoidable — prefer optional chaining
- Always type API responses before using them
- Generate Supabase types: `npx supabase gen types typescript --project-id YOUR_ID > types/database.types.ts`
- Regenerate types after every schema change

### React / Next.js
- Server Components by default — only use `"use client"` when necessary (event handlers, browser APIs, hooks)
- `use client` components must be as small as possible — push them to the leaves of the component tree
- Never fetch data in Client Components directly — use Server Components or API routes
- Use `next/image` for all images — never raw `<img>` tags
- Use `next/link` for all internal navigation — never `<a href>`
- Loading states: every async operation needs a loading skeleton or spinner
- Error states: every async operation needs an error boundary or fallback UI

### Supabase
- Always use the server-side Supabase client in Server Components and API routes
- Always use the client-side Supabase client in Client Components
- Never expose the service role key to the client — server only
- All database mutations go through API routes, not direct client-side Supabase calls
- RLS (Row Level Security) is enabled on all tables — never disable it
- Always handle Supabase errors — never assume a query succeeded

### Styling
- Tailwind CSS only — no inline styles, no CSS modules, no styled-components
- Mobile-first: write base styles for 390px, then `sm:`, `md:`, `lg:` breakpoints
- Use design system tokens from `design-system.rules.md` — no hardcoded hex values
- Dark mode supported via Tailwind's `dark:` prefix
- No `!important` — fix specificity properly

### API Routes
- All routes return consistent response shapes — see `api.rules.md`
- Always validate request bodies with Zod before processing
- Always authenticate requests that touch user data
- Rate limiting applied to all write endpoints

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server only — never expose to client

# Football API
FOOTBALL_API_KEY=                  # API-Football via RapidAPI

# Email (Nodemailer SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=futfi8@yourdomain.com
# RESEND_API_KEY=                  # Uncomment for future Resend upgrade

# Perspective API
PERSPECTIVE_API_KEY=               # Content moderation

# Cron Security
CRON_SECRET=                       # Validates cron job requests

# App
NEXT_PUBLIC_APP_URL=               # e.g. http://localhost:3000
```

Never commit `.env.local` to git. Never expose `SUPABASE_SERVICE_ROLE_KEY` in any client-side code.

---

## Core Domain Concepts

Always use these exact terms — never invent synonyms mid-codebase:

| Term | Definition |
|---|---|
| **Locker Room** | A club's dedicated community space. Each club has one. |
| **Member** | A user who has joined a locker room as their home club |
| **Post** | A piece of content submitted by a user |
| **Raid** | The mechanic where winning fans enter the losing locker room |
| **Raid Window** | The 2-hour period during which a raid is active |
| **Raider** | A member of the winning club posting in the raid window |
| **Hot Take** | A cross-club post on the global Hot Take Board |
| **Match Thread** | An auto-created discussion space around a specific fixture |
| **Fan Cred Score** | A user's reputation score within a specific locker room |
| **Fixture** | A scheduled Premier League match |

---

## Premier League Clubs (Launch Scope)

All 20 EPL clubs are supported at launch. Club slugs used throughout the codebase:

```
arsenal, aston-villa, bournemouth, brentford, brighton,
chelsea, crystal-palace, everton, fulham, ipswich,
leicester, liverpool, man-city, man-united, newcastle,
nottm-forest, southampton, tottenham, west-ham, wolves
```

Club data lives in `lib/utils/clubs.ts` as a static constant — not fetched from DB. Crests in `public/crests/{slug}.svg`.

---

## Global Dos and Don'ts

### DO
- Write self-documenting code — variable names should explain intent
- Handle every loading, error, and empty state
- Use optimistic UI updates for post reactions (upvotes feel instant)
- Log errors server-side with enough context to debug
- Write small, focused components — one responsibility per component
- Use Supabase RLS as the primary security layer, API validation as the second
- Test raid window logic with unit tests — it is the most critical mechanic

### DON'T
- Never store sensitive data in localStorage or sessionStorage
- Never trust client-sent data — validate everything server-side
- Never make the user wait for a UI update that can be optimistic
- Never use `console.log` in production code — use a proper logger
- Never hardcode club names or IDs — always reference from `clubs.ts`
- Never bypass RLS policies — if you need elevated access, use service role on the server only
- Never let a cron job fail silently — always log and alert on failure
- Never auto-open raid windows without verifying the match result is confirmed and final
