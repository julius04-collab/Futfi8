
DROP POLICY "raids_insert_auth" ON public.raids;
CREATE POLICY "raids_insert_own_club" ON public.raids FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.club_id = raids.home_club)
  );
