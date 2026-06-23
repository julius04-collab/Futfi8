
-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text UNIQUE NOT NULL,
  club_id text NOT NULL,
  avatar_url text,
  bio text,
  cred int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Raids
CREATE TABLE public.raids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_club text NOT NULL,
  away_club text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.raids TO anon, authenticated;
GRANT INSERT ON public.raids TO authenticated;
GRANT ALL ON public.raids TO service_role;
ALTER TABLE public.raids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raids_read_all" ON public.raids FOR SELECT USING (true);
CREATE POLICY "raids_insert_auth" ON public.raids FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX raids_ends_at_idx ON public.raids(ends_at DESC);

-- Raid messages (posts inside an active raid against losing club's room)
CREATE TABLE public.raid_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_id uuid NOT NULL REFERENCES public.raids(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.raid_messages TO anon, authenticated;
GRANT INSERT, DELETE ON public.raid_messages TO authenticated;
GRANT ALL ON public.raid_messages TO service_role;
ALTER TABLE public.raid_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raid_msg_read_all" ON public.raid_messages FOR SELECT USING (true);
CREATE POLICY "raid_msg_insert_self_winning_side" ON public.raid_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.raids r, public.profiles p
      WHERE r.id = raid_id
        AND p.id = auth.uid()
        AND p.club_id = r.home_club
        AND r.ends_at > now()
    )
  );
CREATE POLICY "raid_msg_delete_self" ON public.raid_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Room messages (locker room chat)
CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.room_messages TO anon, authenticated;
GRANT INSERT, DELETE ON public.room_messages TO authenticated;
GRANT ALL ON public.room_messages TO service_role;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_msg_read_all" ON public.room_messages FOR SELECT USING (true);
CREATE POLICY "room_msg_insert_self_own_club" ON public.room_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.club_id = room_messages.club_id)
  );
CREATE POLICY "room_msg_delete_self" ON public.room_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX room_messages_club_created_idx ON public.room_messages(club_id, created_at DESC);

-- Takes (global hot takes)
CREATE TABLE public.takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id text NOT NULL,
  body text NOT NULL,
  score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.takes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.takes TO authenticated;
GRANT ALL ON public.takes TO service_role;
ALTER TABLE public.takes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "takes_read_all" ON public.takes FOR SELECT USING (true);
CREATE POLICY "takes_insert_self" ON public.takes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "takes_update_self" ON public.takes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "takes_delete_self" ON public.takes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX takes_score_idx ON public.takes(score DESC, created_at DESC);

-- Take votes
CREATE TABLE public.take_votes (
  take_id uuid NOT NULL REFERENCES public.takes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (take_id, user_id)
);
GRANT SELECT ON public.take_votes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.take_votes TO authenticated;
GRANT ALL ON public.take_votes TO service_role;
ALTER TABLE public.take_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tv_read_all" ON public.take_votes FOR SELECT USING (true);
CREATE POLICY "tv_insert_self" ON public.take_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tv_update_self" ON public.take_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tv_delete_self" ON public.take_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recompute take score after vote changes
CREATE OR REPLACE FUNCTION public.recalc_take_score() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  target := COALESCE(NEW.take_id, OLD.take_id);
  UPDATE public.takes SET score = COALESCE((SELECT SUM(value) FROM public.take_votes WHERE take_id = target), 0)
    WHERE id = target;
  RETURN NULL;
END $$;

CREATE TRIGGER take_votes_score_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.take_votes
FOR EACH ROW EXECUTE FUNCTION public.recalc_take_score();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raid_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raids;
