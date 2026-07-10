---
trigger: always_on
---

# Deployment & CI/CD

## Hosting

- **Platform:** Vercel (Pro plan recommended for production)
- **Framework preset:** Next.js (auto-detected)
- **Region:** `iad1` (US East) — closest to Supabase default region
- **Node version:** `20.x` (set in `package.json` engines)

## Environment Variables

All env vars must be set in Vercel Project Settings > Environment Variables.
Copy template from `.env.local.example`:

```bash
# Required for all environments
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FOOTBALL_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
PERSPECTIVE_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=

# Preview/development only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Environment-Specific Values

| Var | Production | Preview | Local |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production project | Preview/prod | Local supabase |
| `NEXT_PUBLIC_APP_URL` | `https://futfi8.com` | Auto-assigned by Vercel | `http://localhost:3000` |
| `CRON_SECRET` | Unique production secret | Same as prod | Random string |

`SUPABASE_SERVICE_ROLE_KEY` must never be used in client code — server-side only.

## Vercel Configuration

```json
{
  "crons": [
    { "path": "/api/cron/poll-matches",       "schedule": "*/2 * * * *" },
    { "path": "/api/cron/close-raid-windows",  "schedule": "*/5 * * * *" },
    { "path": "/api/cron/open-match-threads",  "schedule": "*/5 * * * *" },
    { "path": "/api/cron/sync-fixtures",       "schedule": "0 0 * * *" },
    { "path": "/api/cron/recalculate-cred",    "schedule": "0 0 * * *" },
    { "path": "/api/cron/weekly-digest",       "schedule": "0 10 * * 0" }
  ],
  "functions": {
    "api/cron/**": { "maxDuration": 60 },
    "api/**": { "maxDuration": 30 }
  }
}
```

Cron routes need longer `maxDuration` (60s) — they batch-process data.

## CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx vitest run --coverage
```

## Deployment Workflow

### Production Deploy
1. Merge to `main` branch
2. Vercel auto-deploys production from `main`
3. Run migrations before deploy completes:
   ```bash
   npx supabase db push --db-url="$PROD_DB_URL"
   ```
4. Regenerate TypeScript types:
   ```bash
   npx supabase gen types typescript --project-id <id> > types/database.types.ts
   ```
5. Monitor Vercel deployment logs for errors
6. Verify cron jobs fire on schedule in Vercel dashboard

### Preview Deploy
1. Push branch → Vercel creates preview deployment
2. Preview uses production Supabase (read operations OK, writes discouraged)
3. Test raid flow, match threads, and notifications manually
4. Merge when verified

## Database Migrations

- All schema changes must go through Supabase migrations
- Never edit the database directly in the Supabase dashboard
- Migration workflow:

```bash
# Create a new migration
npx supabase migration new add_reaction_type_column

# Apply to local
npx supabase db reset

# Apply to production
npx supabase db push
```

See `migrations.md` for the full workflow.

## Post-Launch Checks

After every production deploy:
1. **Cron jobs** — Check Vercel Cron tab — all 6 jobs fired successfully
2. **Auth** — Sign up, log in, Google OAuth all work
3. **Match data** — Verify API-Football polling returns fixtures
4. **Raid flow** — Simulate a complete raid lifecycle
5. **Notifications** — Trigger a notification type, check delivery
6. **Errors** — Review Vercel Error Tracking for new issues

## Rollback

If a deploy breaks:
1. Vercel dashboard → Deployments → find last working deployment → ⋮ → Promote to Production
2. If migration-related: `npx supabase db push --db-url="$PROD_DB_URL"` to revert the migration
3. If env-related: restore previous env vars from Vercel dashboard

## Deployment Rules

1. `main` branch always deployable — never merge broken code
2. Migrations run before the new code serving traffic — schema first, then app
3. Preview deploys use production DB — never run destructive migrations from preview
4. Cron job failures on production trigger an immediate notification to the developer
5. Never commit `.env` or `.env.local` — only `.env.local.example`
6. TypeScript types must be regenerated after every schema change — checked in CI
7. Node version is locked to 20.x — no minor version drift between dev and prod
8. `CRON_SECRET` must be unique per deployment environment
