-- Fix missing columns and constraints on stub-created tables

-- Users: add missing email column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;

-- Users: add constraints if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND conname = 'users_email_key'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND conname = 'users_username_key'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- Clubs: ensure UNIQUE on name (needed for seed upsert)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.clubs'::regclass AND conname = 'clubs_name_key'
  ) THEN
    ALTER TABLE public.clubs ADD CONSTRAINT clubs_name_key UNIQUE (name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.clubs'::regclass AND conname = 'clubs_api_football_team_id_key'
  ) THEN
    ALTER TABLE public.clubs ADD CONSTRAINT clubs_api_football_team_id_key UNIQUE (api_football_team_id);
  END IF;
END $$;

-- Memberships: ensure unique_user_locker_room constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.memberships'::regclass AND conname = 'unique_user_locker_room'
  ) THEN
    ALTER TABLE public.memberships ADD CONSTRAINT unique_user_locker_room UNIQUE (user_id, locker_room_id);
  END IF;
END $$;

-- Matches: ensure api_match_id UNIQUE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.matches'::regclass AND conname = 'matches_api_match_id_key'
  ) THEN
    ALTER TABLE public.matches ADD CONSTRAINT matches_api_match_id_key UNIQUE (api_match_id);
  END IF;
END $$;

-- Posts: ensure one_raid_post_per_window constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.posts'::regclass AND conname = 'one_raid_post_per_window'
  ) THEN
    ALTER TABLE public.posts ADD CONSTRAINT one_raid_post_per_window UNIQUE (author_id, raid_window_id);
  END IF;
END $$;

-- Reactions: ensure unique_user_post_reaction constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.reactions'::regclass AND conname = 'unique_user_post_reaction'
  ) THEN
    ALTER TABLE public.reactions ADD CONSTRAINT unique_user_post_reaction UNIQUE (user_id, post_id, type);
  END IF;
END $$;

-- Locker room mods: ensure unique_mod constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'public.locker_room_mods'::regclass AND conname = 'unique_mod'
  ) THEN
    ALTER TABLE public.locker_room_mods ADD CONSTRAINT unique_mod UNIQUE (user_id, locker_room_id);
  END IF;
END $$;
