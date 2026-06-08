-- Drop stub-only slug column from clubs
ALTER TABLE public.clubs DROP COLUMN IF EXISTS slug;
