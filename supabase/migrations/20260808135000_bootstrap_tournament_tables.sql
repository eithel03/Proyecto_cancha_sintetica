-- Tablas de torneo requeridas por la migración 20260808140000.
-- La migración de seguridad posterior también usa CREATE TABLE IF NOT EXISTS;
-- aquí se crean antes porque el historial antiguo modifica
-- tournament_match_events antes de llegar a esa fase.

CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  captain_name text,
  captain_phone text,
  is_active boolean DEFAULT true,
  gender text DEFAULT 'masculino',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  jersey_number integer,
  position text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  home_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  away_team_id uuid REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  court_id uuid REFERENCES public.courts(id) ON DELETE SET NULL,
  match_date date NOT NULL,
  match_time time NOT NULL,
  status text DEFAULT 'scheduled',
  home_score integer DEFAULT 0,
  away_score integer DEFAULT 0,
  current_minute integer DEFAULT 0,
  live_started_at timestamptz,
  elapsed_seconds integer DEFAULT 0,
  gender text DEFAULT 'masculino',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.tournament_players(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  quantity integer DEFAULT 1,
  minute integer,
  created_at timestamptz DEFAULT now()
);
