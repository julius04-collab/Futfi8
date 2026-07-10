-- Fix posts table: ensure all columns from the initial schema exist.
-- The posts table was previously a stub with only id, created_at, content, and user_id.
-- This migration adds the missing columns and renames user_id to author_id.

-- Rename user_id to author_id (if user_id still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.posts RENAME COLUMN user_id TO author_id;
  END IF;
END $$;

-- Add missing columns
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS locker_room_id UUID REFERENCES public.locker_rooms(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS upvote_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_raid_post BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS raid_window_id UUID REFERENCES public.raid_windows(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS toxicity_score FLOAT DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false;

-- Drop default from type (constraint will enforce)
ALTER TABLE public.posts ALTER COLUMN type DROP DEFAULT;

-- Add check constraint for type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.posts'::regclass AND conname = 'posts_type_check'
  ) THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_type_check CHECK (type IN ('standard', 'raid', 'match_thread', 'hot_take'));
  END IF;
END $$;

-- Ensure author_id is NOT NULL (needed after rename/column add)
ALTER TABLE public.posts ALTER COLUMN author_id SET NOT NULL;

-- Recreate RLS policies (they may have been dropped during the rename)
DROP POLICY IF EXISTS "Posts are publicly readable" ON public.posts;
CREATE POLICY "Posts are publicly readable" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role write posts" ON public.posts;
CREATE POLICY "Service role write posts" ON public.posts FOR ALL USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_locker_room_id ON public.posts(locker_room_id);
CREATE INDEX IF NOT EXISTS idx_posts_raid_window_id ON public.posts(raid_window_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON public.posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_is_flagged ON public.posts(is_flagged) WHERE is_flagged = true;
