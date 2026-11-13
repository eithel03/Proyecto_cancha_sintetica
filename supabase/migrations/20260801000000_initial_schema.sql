-- Bootstrap inicial para proyectos Supabase nuevos.
--
-- `supabase/schema.sql` es documentación/backup y Supabase CLI no lo ejecuta
-- automáticamente con `supabase db push`. Esta migración crea las tablas base
-- que necesitan las migraciones incrementales posteriores.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  location text,
  phone text,
  whatsapp text,
  description text,
  logo_url text,
  cover_image_url text,
  is_active boolean DEFAULT true,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  full_name text,
  phone text,
  role text DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_per_hour numeric,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time time NOT NULL,
  close_time time NOT NULL,
  is_closed boolean DEFAULT false,
  UNIQUE (business_id, day_of_week)
);

-- Esta tabla es necesaria para la migración 20260808130000, que crea sus
-- políticas antes de que la fase de hardening agregue más columnas y reglas.
CREATE TABLE IF NOT EXISTS public.business_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  is_closed boolean DEFAULT true,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  reservation_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  hidden_by_customer boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  challenge_date date NOT NULL,
  challenge_time time NOT NULL,
  notes text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'confirmed', 'cancelled', 'completed')),
  gender text DEFAULT 'masculino',
  men_count integer,
  women_count integer,
  hidden_by_customer boolean DEFAULT false,
  accepted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tablas de torneo que son referenciadas por la migración de eventos
-- (`20260808140000`) antes de la migración de seguridad completa.
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

CREATE INDEX IF NOT EXISTS idx_businesses_slug
  ON public.businesses (slug);
CREATE INDEX IF NOT EXISTS idx_reservations_court_date
  ON public.reservations (court_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_challenges_business
  ON public.challenges (business_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status
  ON public.challenges (status);
CREATE INDEX IF NOT EXISTS idx_challenges_date
  ON public.challenges (challenge_date);

-- Trigger heredado de la primera versión del proyecto. La fase de seguridad
-- agrega validaciones transaccionales adicionales, pero conserva este trigger
-- para mantener compatibilidad con instalaciones antiguas.
CREATE OR REPLACE FUNCTION public.check_reservation_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.reservations
    WHERE court_id = NEW.court_id
      AND reservation_date = NEW.reservation_date
      AND status IN ('pending', 'confirmed')
      AND id <> NEW.id
      AND NEW.start_time < end_time
      AND NEW.end_time > start_time
  ) THEN
    RAISE EXCEPTION 'La cancha ya está reservada en este horario.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_double_booking ON public.reservations;
CREATE TRIGGER prevent_double_booking
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.check_reservation_overlap();

-- Perfil automático para usuarios nuevos. La fase de seguridad reemplaza la
-- función con una versión endurecida antes de terminar el despliegue.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(TRIM(CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name')), '')
    ),
    NEW.raw_user_meta_data->>'phone',
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
