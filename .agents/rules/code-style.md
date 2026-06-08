# Code Style

## TypeScript Conventions
- Strict mode enabled, prefer `type` over `interface` for object shapes
- Use `Pick<T, K>` for derived types (e.g. PostWithDetails)
- Server components by default; 'use client' only when hooks/browser APIs needed

## Naming
- Files: kebab-case for pages/routes, PascalCase for components
- Exports: named exports for components, default exports for pages
- Variables: camelCase, booleans prefixed with `is`/`has`
- API routes: `route.ts` with named `GET`/`POST`/etc exports

## File Structure
- Co-locate related components in feature directories under `components/`
- Pages under `app/` route groups, one folder per route
- Shared logic in `lib/` (supabase clients, API wrappers, utils)

## Linting
- Follow standard Next.js ESLint config
- No `any` — prefer `unknown` with type guards
- No unused imports or variables
