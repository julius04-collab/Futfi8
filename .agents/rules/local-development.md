---
trigger: always_on
---

# Local Development Setup

## Prerequisites

- Node.js 20.x
- Docker Desktop (for local Supabase)
- Git
- A Supabase account (cloud project for production, or local Supabase)

## Quick Start

```bash
# 1. Clone and install
cd futfi8
npm install

# 2. Set up local Supabase (recommended)
npx supabase start
# This starts Postgres, GoTrue, Realtime, Storage on localhost

# 3. Apply migrations and seed data
npx supabase db reset

# 4. Regenerate TypeScript types
npx supabase gen types typescript --local > types/database.types.ts

# 5. Copy env file and fill in values
cp .env.local.example .env.local

# 6. Start dev server
npm run dev
```

## Supabase: Local vs Cloud

### Option A: Local Supabase (Recommended for Development)

| Service | Local URL | Purpose |
|---|---|---|
| Studio | `http://localhost:54323` | Database management UI |
| API | `http://localhost:54321` | REST/GraphQL endpoint |
| Auth | `http://localhost:54321/auth/v1` | Authentication |
| Realtime | `http://localhost:54321/realtime/v1` | WebSocket |
| Storage | `http://localhost:54321/storage/v1` | File storage |

```bash
# Start local Supabase
npx supabase start

# Stop when done
npx supabase stop
```

Env vars for local:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Option B: Cloud Supabase (When Local Docker Fails)

Connect to your Supabase cloud project directly:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Use `npx supabase db push` to apply migrations to cloud.
Do NOT develop against production — use a dev project.

## Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>

# Football Data API (sign up at https://rapidapi.com/api-sports)
FOOTBALL_API_KEY=<your-api-football-key>

# Email (Nodemailer SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<app-password-or-smtp-password>
SMTP_FROM_EMAIL=noreply@futfi8.com

# Content Moderation (sign up at Google Cloud Console)
PERSPECTIVE_API_KEY=<your-perspective-api-key>

# Cron Security
CRON_SECRET=dev-secret-key-change-in-production

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get your local Supabase keys by running `npx supabase status`.

## Seed Data

The seed script at `supabase/seed.sql` creates:

- 20 Premier League clubs
- 20 locker rooms
- No users (sign up creates them)

Run seed after migration reset:
```bash
npx supabase db reset
```

Or manually:
```bash
psql -h localhost -U postgres -d postgres -f supabase/seed.sql
```

## Testing Email Locally

For local email testing without sending real emails:

- Set `SMTP_HOST=localhost` and `SMTP_PORT=1025` for Mailpit or Mailhog
- Or use [Ethereal Email](https://ethereal.email) — fake SMTP that captures emails in a web UI:

```bash
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=<ethereal-user>
SMTP_PASSWORD=<ethereal-password>
```

Visit the Ethereal web UI to see captured emails — no real emails sent.

## Common Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Lint check
npx tsc --noEmit         # Type check
npx vitest run           # Run tests
npx vitest               # Watch mode
npx supabase start       # Start local Supabase
npx supabase stop        # Stop local Supabase
npx supabase db reset    # Reset + migrate + seed
npx supabase db push     # Push migrations to cloud
```

## Troubleshooting

| Problem | Solution |
|---|---|
| `supabase start` fails | Ensure Docker Desktop is running. Try `npx supabase start --ignore-health-check` |
| Port 5432 in use | Run `npx supabase start --postgres-port 5433` |
| Auth signup fails locally | Local Supabase uses `confirmSignup = false` by default — no email needed |
| `@supabase/ssr` cookies error | Ensure `cookies()` is only called in Server Components / API routes |
| Module not found | Run `npm install` again. Check for `package-lock.json` conflicts |
| Git line ending issues | `git config core.autocrlf input` (Unix) or `true` (Windows) |

## Local Development Rules

1. Always use `npx supabase db reset` after pulling migration changes from git
2. Always regenerate `types/database.types.ts` after schema changes
3. Never commit `.env.local` — only `.env.local.example`
4. If Docker won't run, use cloud Supabase dev project as fallback
5. Local email testing with Ethereal — never point production SMTP from local
6. Run `npx tsc --noEmit` before pushing — type errors block CI
7. Run `npm run lint` before pushing — lint errors block CI
