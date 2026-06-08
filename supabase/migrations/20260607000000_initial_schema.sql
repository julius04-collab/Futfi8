-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clubs Table
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  short_name TEXT NOT NULL,
  crest_url TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  league_id INT NOT NULL DEFAULT 39,
  api_football_team_id INT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure clubs columns exist (for pre-existing stub tables)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS league_id INT NOT NULL DEFAULT 39;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS api_football_team_id INT UNIQUE;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Users Table (Synced with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  home_club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  is_under_16 BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure users columns exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS home_club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_under_16 BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3. Club Membership History
CREATE TABLE IF NOT EXISTS public.club_membership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ
);

ALTER TABLE public.club_membership_history ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

-- 4. Locker Rooms Table
CREATE TABLE IF NOT EXISTS public.locker_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID UNIQUE NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  member_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.locker_rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 5. Memberships Table
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  locker_room_id UUID NOT NULL REFERENCES public.locker_rooms(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fan_cred_score INT NOT NULL DEFAULT 0,
  badge_level TEXT NOT NULL DEFAULT 'Rookie',
  CONSTRAINT unique_user_locker_room UNIQUE (user_id, locker_room_id)
);

ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS fan_cred_score INT NOT NULL DEFAULT 0;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS badge_level TEXT NOT NULL DEFAULT 'Rookie';
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 6. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  away_club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  kickoff_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'finished')),
  home_score INT,
  away_score INT,
  api_match_id INT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_score INT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_score INT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS api_match_id INT UNIQUE;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 7. Raid Windows Table
CREATE TABLE IF NOT EXISTS public.raid_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  raiding_club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  defending_club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.raid_windows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 8. Match Threads Table
CREATE TABLE IF NOT EXISTS public.match_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  locker_room_id UUID NOT NULL REFERENCES public.locker_rooms(id) ON DELETE CASCADE,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.match_threads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 9. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  locker_room_id UUID NOT NULL REFERENCES public.locker_rooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('standard', 'raid', 'match_thread', 'hot_take')),
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  upvote_count INT NOT NULL DEFAULT 0,
  is_raid_post BOOLEAN NOT NULL DEFAULT false,
  raid_window_id UUID REFERENCES public.raid_windows(id) ON DELETE SET NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  toxicity_score FLOAT DEFAULT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_raid_post_per_window UNIQUE (author_id, raid_window_id)
);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS upvote_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_raid_post BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS raid_window_id UUID REFERENCES public.raid_windows(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS toxicity_score FLOAT DEFAULT NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 10. Reactions Table
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('upvote', 'fire', 'laugh', 'rage')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_post_reaction UNIQUE (user_id, post_id, type)
);

ALTER TABLE public.reactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 12. User Strikes Table
CREATE TABLE IF NOT EXISTS public.user_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_strikes ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;
ALTER TABLE public.user_strikes ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.user_strikes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 13. Locker Room Mods Table
CREATE TABLE IF NOT EXISTS public.locker_room_mods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  locker_room_id UUID NOT NULL REFERENCES public.locker_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_mod UNIQUE (user_id, locker_room_id)
);

-- Indexes for performance & query optimizations
CREATE INDEX IF NOT EXISTS idx_users_home_club_id ON public.users(home_club_id);
CREATE INDEX IF NOT EXISTS idx_club_membership_history_user_id ON public.club_membership_history(user_id);
CREATE INDEX IF NOT EXISTS idx_club_membership_history_club_id ON public.club_membership_history(club_id);
CREATE INDEX IF NOT EXISTS idx_locker_rooms_club_id ON public.locker_rooms(club_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_locker_room_id ON public.memberships(locker_room_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_locker_room_id ON public.posts(locker_room_id);
CREATE INDEX IF NOT EXISTS idx_posts_raid_window_id ON public.posts(raid_window_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON public.posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_is_flagged ON public.posts(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_matches_home_club_id ON public.matches(home_club_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_club_id ON public.matches(away_club_id);
CREATE INDEX IF NOT EXISTS idx_matches_api_match_id ON public.matches(api_match_id);
CREATE INDEX IF NOT EXISTS idx_raid_windows_match_id ON public.raid_windows(match_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_user_strikes_user_id ON public.user_strikes(user_id);
CREATE INDEX IF NOT EXISTS idx_locker_room_mods_user_room ON public.locker_room_mods(user_id, locker_room_id);

-- Enable RLS on all tables (idempotent — safe to re-run)
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_membership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locker_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raid_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locker_room_mods ENABLE ROW LEVEL SECURITY;

-- Define RLS Policies (drop first to be idempotent)
DROP POLICY IF EXISTS "Clubs are publicly readable" ON public.clubs;
CREATE POLICY "Clubs are publicly readable" ON public.clubs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users profiles are publicly readable" ON public.users;
CREATE POLICY "Users profiles are publicly readable" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Locker rooms are publicly readable" ON public.locker_rooms;
CREATE POLICY "Locker rooms are publicly readable" ON public.locker_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Memberships are publicly readable" ON public.memberships;
CREATE POLICY "Memberships are publicly readable" ON public.memberships FOR SELECT USING (true);

DROP POLICY IF EXISTS "Matches are publicly readable" ON public.matches;
CREATE POLICY "Matches are publicly readable" ON public.matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Raid windows are publicly readable" ON public.raid_windows;
CREATE POLICY "Raid windows are publicly readable" ON public.raid_windows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Match threads are publicly readable" ON public.match_threads;
CREATE POLICY "Match threads are publicly readable" ON public.match_threads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Posts are publicly readable" ON public.posts;
CREATE POLICY "Posts are publicly readable" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Reactions are publicly readable" ON public.reactions;
CREATE POLICY "Reactions are publicly readable" ON public.reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Locker room mods are publicly readable" ON public.locker_room_mods;
CREATE POLICY "Locker room mods are publicly readable" ON public.locker_room_mods FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can read own membership history" ON public.club_membership_history;
CREATE POLICY "Users can read own membership history" ON public.club_membership_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own strikes" ON public.user_strikes;
CREATE POLICY "Users can read own strikes" ON public.user_strikes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WRITE policies restricted to service_role
DROP POLICY IF EXISTS "Service role write clubs" ON public.clubs;
CREATE POLICY "Service role write clubs" ON public.clubs FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write users" ON public.users;
CREATE POLICY "Service role write users" ON public.users FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write club membership history" ON public.club_membership_history;
CREATE POLICY "Service role write club membership history" ON public.club_membership_history FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write locker rooms" ON public.locker_rooms;
CREATE POLICY "Service role write locker rooms" ON public.locker_rooms FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write memberships" ON public.memberships;
CREATE POLICY "Service role write memberships" ON public.memberships FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write matches" ON public.matches;
CREATE POLICY "Service role write matches" ON public.matches FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write raid windows" ON public.raid_windows;
CREATE POLICY "Service role write raid windows" ON public.raid_windows FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write match threads" ON public.match_threads;
CREATE POLICY "Service role write match threads" ON public.match_threads FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write posts" ON public.posts;
CREATE POLICY "Service role write posts" ON public.posts FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write reactions" ON public.reactions;
CREATE POLICY "Service role write reactions" ON public.reactions FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write notifications" ON public.notifications;
CREATE POLICY "Service role write notifications" ON public.notifications FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write strikes" ON public.user_strikes;
CREATE POLICY "Service role write strikes" ON public.user_strikes FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role write mods" ON public.locker_room_mods;
CREATE POLICY "Service role write mods" ON public.locker_room_mods FOR ALL USING (auth.role() = 'service_role');

-- Trigger to sync auth.users with public.users (idempotent — uses CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, avatar_url, is_under_16)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE((new.raw_user_meta_data->>'is_under_16')::boolean, false)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
