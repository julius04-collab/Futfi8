# Database Migration Runner Skill

## When to Use
Adding or modifying database schema.

## Workflow
1. Create migration file at `supabase/migrations/<timestamp>_<description>.sql`
2. Use IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS for idempotency
3. Test migration via Supabase dashboard SQL editor
4. Apply via `supabase db push` or manual SQL execution

## Conventions
- One migration per schema change
- Include indexes for new foreign keys or frequently filtered columns
- Include RLS policies for new tables
- Always add updated_at trigger for tables with mutable data
