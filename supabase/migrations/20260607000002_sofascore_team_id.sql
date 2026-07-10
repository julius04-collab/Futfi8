ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS sofascore_team_id INT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_clubs_sofascore_team_id ON public.clubs(sofascore_team_id);
