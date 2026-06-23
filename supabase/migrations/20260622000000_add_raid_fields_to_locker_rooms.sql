ALTER TABLE public.locker_rooms
  ADD COLUMN IF NOT EXISTS is_under_raid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS raided_by UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raid_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_locker_rooms_raid_status ON public.locker_rooms(is_under_raid) WHERE is_under_raid = true;
