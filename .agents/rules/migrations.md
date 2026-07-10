---
trigger: always_on
---

# Database Migrations — Workflow & Conventions

## Overview

All schema changes go through Supabase migrations — never edit the database directly in the Supabase dashboard. Migrations are version-controlled in `supabase/migrations/` and applied in order.

## Migration Workflow

```bash
# ── STEP 1: Create a new migration ──────────────────────────
npx supabase migration new add_reaction_type_column

# Creates: supabase/migrations/20260605000001_add_reaction_type_column.sql
# Edit the generated file with your SQL changes

# ── STEP 2: Apply locally ───────────────────────────────────
npx supabase db reset
# This drops all tables, re-runs all migrations from scratch,
# then runs seed.sql. Safe to run anytime in development.

# ── STEP 3: Regenerate TypeScript types ─────────────────────
npx supabase gen types typescript --local > types/database.types.ts

# ── STEP 4: Commit ──────────────────────────────────────────
git add supabase/migrations/ types/database.types.ts
git commit -m "add reaction_type column to reactions table"
```

## Migration File Naming

```
supabase/migrations/
├── 20260601000001_initial_schema.sql
├── 20260603000002_add_raid_eligibility_table.sql
└── 20260605000003_add_reaction_type_column.sql
```

Format: `YYYYMMDDHHMMSS_descriptive_name.sql`
The timestamp prefix ensures ordered execution.

## Writing Migrations

```sql
-- supabase/migrations/20260605000003_add_reaction_type_column.sql

-- Up migration
alter table public.reactions
  add column reaction_type text not null default 'upvote';

-- Down migration (commented out — used for manual rollback)
-- alter table public.reactions
--   drop column reaction_type;
```

**Rules:**
- Always wrap in a transaction if multi-step (Supabase does this automatically per migration file)
- Include `create or replace function` for triggers and RPCs
- Comment out the down migration in the file — keeps it available for manual rollback
- Never modify an existing migration file after it's committed — create a new one
- Postgres DDL is transactional — use `begin` / `commit` only for multi-statement operations

## Pushing to Production

```bash
# Preview changes (dry run)
npx supabase db push --db-url="$PROD_DB_URL" --dry-run

# Apply to production
npx supabase db push --db-url="$PROD_DB_URL"

# Regenerate types for production
npx supabase gen types typescript --project-id <project-id> > types/database.types.ts
```

**Pre-deploy checklist:**
1. Run `npx supabase db push --dry-run` — verify the SQL looks correct
2. Backup production database — Supabase Dashboard > Database > Backups
3. Schedule during low-traffic hours (premier league matches are in the afternoon — deploy in the morning)
4. Never push migrations during active match windows (Saturday 15:00-17:00, Sunday 14:00-17:00 WAT)

## TypeScript Type Regeneration

After every schema change, regenerate types:

```bash
# After local migration
npx supabase gen types typescript --local > types/database.types.ts

# After production migration  
npx supabase gen types typescript --project-id <id> > types/database.types.ts
```

The generated `Database` type is used throughout the app:
```ts
import type { Database } from '@/types/database.types'
export function createSupabaseServerClient() {
  return createServerClient<Database>(...)
}
```

**Rules:**
- Regenerate types immediately after writing the migration
- Commit both the migration SQL and the updated types file together
- If CI fails on type errors after a migration, you forgot to regenerate types

## Rollback Strategy

```bash
# 1. Identify the migration to roll back
ls supabase/migrations/  # Last file is the most recent

# 2. Write a reversal SQL file
# supabase/migrations/rollbacks/20260605000003_revert_add_reaction_type_column.sql
# alter table public.reactions drop column reaction_type;

# 3. Apply reversal
psql "$PROD_DB_URL" -f supabase/migrations/rollbacks/20260605000003_revert.sql

# 4. Remove or archive the rolled-back migration file
# Do NOT delete — move to supabase/migrations/archived/
```

**Never edit or delete a committed migration file.**
If a migration needs to be undone, write a new migration that reverses it.

## Seed Data

The seed file at `supabase/seed.sql` is re-run on every `db reset`:

```bash
npx supabase db reset   # Drops DB, runs all migrations, runs seed.sql
```

Seed data includes:
- 20 Premier League clubs
- 20 locker rooms (one per club)
- No user data (users sign up via auth)

## Common Patterns

### Adding a Column
```sql
alter table public.posts
  add column club_tag_id uuid references public.clubs(id);
```

### Creating a Table
```sql
create table public.moderation_queue (
  id          uuid default gen_random_uuid() primary key,
  content     text not null,
  author_id   uuid references public.users(id) on delete set null,
  post_id     uuid references public.posts(id) on delete set null,
  scores      jsonb,
  reason      text not null,
  status      text default 'pending',
  reviewed_by uuid references public.users(id),
  created_at  timestamptz default now()
);
```

### Adding an Index
```sql
create index idx_posts_club_tag on public.posts(club_tag_id)
  where club_tag_id is not null;
```

### Creating an RPC Function
```sql
create or replace function create_raid_post(...)
returns json
language plpgsql security definer
as $$ ... $$;
```

## Migration Rules

1. Every schema change gets a new migration file — never edit existing ones
2. Run `npx supabase db reset` after pulling migration changes from git
3. Regenerate TypeScript types after every migration — commit both together
4. Never push migrations during active match windows
5. Always dry-run before pushing to production
6. Backup production DB before running migrations
7. If a migration fails in production — roll back immediately, don't try to fix in-place
8. One logical change per migration file — not everything in one file
9. Index creation is part of the migration that introduces the table/column
10. RLS policies are created in the same migration as the table
