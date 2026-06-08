# API Route Scaffolder Skill

## When to Use
Creating new Next.js API routes.

## Workflow
1. Create route file at `app/api/<resource>/route.ts`
2. Export named functions: `GET`, `POST`, `PUT`, `DELETE`
3. Use `getAuthUser()` from `@/lib/supabase/server` for auth
4. Use `supabaseAdmin` for DB access
5. Return `NextResponse.json({ data?, error? })` shape

## Conventions
- Validate inputs early, return 400 with descriptive error
- Use 401 for auth failures, 403 for permission denied, 404 for not found
- Log errors server-side, never expose stack traces to client
