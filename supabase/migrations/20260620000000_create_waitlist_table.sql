-- Create waitlist table for landing page signups
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  selected_club TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert into waitlist" ON public.waitlist;
CREATE POLICY "Anyone can insert into waitlist" ON public.waitlist
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role read waitlist" ON public.waitlist;
CREATE POLICY "Service role read waitlist" ON public.waitlist
  FOR SELECT USING (auth.role() = 'service_role');
