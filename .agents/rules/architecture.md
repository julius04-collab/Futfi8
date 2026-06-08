# Architecture

## System Design
- Next.js 14 App Router monorepo with API routes
- Supabase for DB, Auth, Realtime, Storage
- Vercel Cron for scheduled jobs
- Mobile-first, Nigerian 4G performance target (sub-2s page load)

## API Patterns
- All API routes return `{ data?, error? }` shape
- Auth via `getAuthUser()` helper that extracts Bearer token from `Authorization` header
- Database access via `supabaseAdmin` (service role) client
- Input validation at route level, never trust client

## Data Flow
- Posts created via API route → insert into Supabase → Realtime pushes to subscribers
- Reactions toggle via API route → update post upvote_count → increment Fan Cred
- Raid lifecycle: match result → cron creates RaidWindow → Realtime notifies clients → cron closes window

## Key Decisions
- No custom WebSocket server — Supabase Realtime handles live updates
- Raid one-per-user enforced at DB level (unique constraint)
- Fan Cred Score per-club, non-transferable
- Club switch limit (30d) enforced in API, not DB
