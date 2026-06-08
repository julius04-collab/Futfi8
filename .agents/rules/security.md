# Security

## Auth Guards
- API routes: use `getAuthUser()` from `@/lib/supabase/server` — extracts Bearer token, verifies JWT, returns user or throws
- Pages: redirect to `/login` if no session
- No sensitive data in client-side state (email, tokens)

## Input Validation
- Validate all inputs at API route level
- Content moderation: Hugging Face Inference API (`unitary/toxic-bert`) for toxicity scoring on posts
- Character limits enforced server-side (post content max 500 chars)

## Rate Limiting
- API routes should implement rate limiting before production
- Raid post submission is DB-level unique constrained (user_id + raid_window_id)

## Data Safety
- Supabase RLS enabled on all tables — policies ensure users can only access their own data
- Admin API route access via service_role client (`supabaseAdmin`) — never expose to client
- No SQL injection risk — Supabase JS client parameterizes queries

## Content Moderation
- Hugging Face `moderateContent()` scores posts before publication
- Posts exceeding toxicity threshold are flagged for review or rejected
- Moderator tools for post removal (-10 Fan Cred penalty)
