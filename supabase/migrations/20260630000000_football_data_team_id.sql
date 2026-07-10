ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS football_data_team_id INT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_clubs_football_data_team_id ON public.clubs(football_data_team_id);
