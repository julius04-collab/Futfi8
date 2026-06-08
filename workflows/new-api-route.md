# New API Route Workflow

1. Create `app/api/<resource>/route.ts`
2. Import `getAuthUser` and `supabaseAdmin` from lib
3. Export named HTTP method handlers
4. Validate inputs, return standard `{ data?, error? }` shape
5. Test with `npm run build`
