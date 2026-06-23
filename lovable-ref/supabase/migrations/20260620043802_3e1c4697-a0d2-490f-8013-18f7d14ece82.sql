
ALTER TABLE public.room_messages
  ADD CONSTRAINT room_messages_user_id_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.raid_messages
  ADD CONSTRAINT raid_messages_user_id_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.takes
  ADD CONSTRAINT takes_user_id_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
