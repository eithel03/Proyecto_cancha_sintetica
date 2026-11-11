-- ============================================================================
-- Fase 1 — Seguridad, RLS, Storage y transacciones atómicas
--
-- Carácter: aditivo e idempotente. No elimina tablas, columnas ni datos.
-- Reemplaza políticas permisivas por políticas por negocio/rol y añade RPC
-- transaccionales para reservas y retos.
--
-- Aplicar únicamente en un proyecto Supabase de pruebas con autorización.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Columnas que la aplicación usa y pueden faltar en despliegues antiguos.
-- ----------------------------------------------------------------------------
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS hidden_by_customer boolean DEFAULT false;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles(id) ON DELETE NO ACTION;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS opponent_id uuid REFERENCES public.profiles(id) ON DELETE NO ACTION;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS court_id uuid REFERENCES public.courts(id) ON DELETE NO ACTION;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS hidden_by_customer boolean DEFAULT false;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS gender text DEFAULT 'masculino';
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS men_count integer;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS women_count integer;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS branding jsonb;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS max_courts integer DEFAULT 1;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;

ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS price_per_person numeric;
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 5;

-- Reconciliación de tablas que la aplicación usa y que no están en todas las
-- versiones del esquema. Todas son aditivas e idempotentes.
CREATE TABLE IF NOT EXISTS public.business_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  is_closed boolean DEFAULT true,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.court_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  price double precision NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  captain_name text,
  captain_phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  gender text DEFAULT 'masculino'
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
  created_at timestamptz DEFAULT now(),
  current_minute integer DEFAULT 0,
  live_started_at timestamptz,
  elapsed_seconds integer DEFAULT 0,
  gender text DEFAULT 'masculino'
);

CREATE TABLE IF NOT EXISTS public.tournament_match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.tournament_players(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  minute integer
);

-- Columnas usadas por la app que pueden faltar en instalaciones antiguas.
ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS gender text DEFAULT 'masculino';
ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS captain_name text;
ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS captain_phone text;
ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.tournament_players ADD COLUMN IF NOT EXISTS jersey_number integer;
ALTER TABLE public.tournament_players ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.tournament_players ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS court_id uuid REFERENCES public.courts(id) ON DELETE SET NULL;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS home_score integer DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS away_score integer DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS current_minute integer DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS live_started_at timestamptz;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS elapsed_seconds integer DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS gender text DEFAULT 'masculino';
ALTER TABLE public.tournament_match_events ADD COLUMN IF NOT EXISTS minute integer;

CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON public.reservations (customer_id);
CREATE INDEX IF NOT EXISTS idx_challenges_creator_id ON public.challenges (creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_opponent_id ON public.challenges (opponent_id);
CREATE INDEX IF NOT EXISTS idx_business_users_user_id ON public.business_users (user_id);
CREATE INDEX IF NOT EXISTS idx_business_exceptions_business_date ON public.business_exceptions (business_id, exception_date);
CREATE INDEX IF NOT EXISTS idx_court_pricing_rules_court_id ON public.court_pricing_rules (court_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_business_id ON public.tournament_teams (business_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_team_id ON public.tournament_players (team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_business_date ON public.tournament_matches (business_id, match_date);
CREATE INDEX IF NOT EXISTS idx_tournament_match_events_match_id ON public.tournament_match_events (match_id);

-- La tabla de favoritos se distribuyó como script aparte en algunas versiones.
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, business_id)
);

-- ----------------------------------------------------------------------------
-- 0.1 Registro de usuarios seguro.
--
-- El trigger original tomaba el rol de `raw_user_meta_data`, que es controlado
-- por el cliente. Cualquiera podía registrarse como super_admin. Ahora el
-- registro público siempre crea clientes; las promociones se hacen desde el
-- servidor con service_role o por un superadministrador autenticado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  f_name text;
  l_name text;
  calc_full_name text;
  u_phone text;
BEGIN
  f_name := NEW.raw_user_meta_data->>'first_name';
  l_name := NEW.raw_user_meta_data->>'last_name';
  u_phone := NEW.raw_user_meta_data->>'phone';

  IF f_name IS NULL AND NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    calc_full_name := NEW.raw_user_meta_data->>'full_name';
  ELSE
    calc_full_name := trim(concat(f_name, ' ', l_name));
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, full_name, phone, role)
  VALUES (NEW.id, f_name, l_name, calc_full_name, u_phone, 'customer')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. Funciones auxiliares de autorización.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_business_access(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_business_id IS NOT NULL
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id = target_business_id
          AND b.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.business_users bu
        WHERE bu.business_id = target_business_id
          AND bu.user_id = auth.uid()
      )
    );
$$;

-- Permite a un usuario autenticado ver su propio perfil, los perfiles de sus
-- compañeros de negocio y los de clientes que interactuaron con sus negocios.
CREATE OR REPLACE FUNCTION public.can_view_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_user_id IS NOT NULL
    AND (
      target_user_id = auth.uid()
      OR public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.business_users bu
        WHERE bu.user_id = target_user_id
          AND public.has_business_access(bu.business_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.reservations r
        WHERE r.customer_id = target_user_id
          AND public.has_business_access(r.business_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.challenges c
        WHERE (c.creator_id = target_user_id OR c.opponent_id = target_user_id)
          AND public.has_business_access(c.business_id)
      )
    );
$$;

-- Valida que la primera carpeta de un objeto de Storage sea el id de un
-- negocio sobre el que el usuario tiene acceso. Evita escrituras cruzadas.
CREATE OR REPLACE FUNCTION public.is_business_storage_path(object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  candidate uuid;
BEGIN
  IF object_name IS NULL OR object_name !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/' THEN
    RETURN false;
  END IF;

  candidate := split_part(object_name, '/', 1)::uuid;
  RETURN public.has_business_access(candidate);
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN false;
END;
$$;

-- Interpreta la hora de un reto sin romper la consulta si la columna es text
-- con valores heredados inválidos. Devuelve NULL en ese caso.
CREATE OR REPLACE FUNCTION public.safe_time(value text)
RETURNS time
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN value::time;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM public;
REVOKE ALL ON FUNCTION public.has_business_access(uuid) FROM public;
REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_business_storage_path(text) FROM public;
REVOKE ALL ON FUNCTION public.safe_time(text) FROM public;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_business_access(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_business_storage_path(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.safe_time(text) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. RLS por tabla.
-- ----------------------------------------------------------------------------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Sin políticas para anon/authenticated: la tabla no se usa desde el cliente y
-- sus datos de suscripción no deben quedar expuestos por los permisos base.
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2.1 businesses -------------------------------------------------------------
DROP POLICY IF EXISTS "Dueños pueden gestionar su propio negocio" ON public.businesses;
DROP POLICY IF EXISTS "Cualquiera puede ver negocios activos" ON public.businesses;
DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON public.businesses;
DROP POLICY IF EXISTS "Owners can insert businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update own businesses" ON public.businesses;
DROP POLICY IF EXISTS "SuperAdmin tiene acceso total a negocios" ON public.businesses;
DROP POLICY IF EXISTS "Super admin can manage businesses" ON public.businesses;
DROP POLICY IF EXISTS "Staff can update businesses" ON public.businesses;
DROP POLICY IF EXISTS "Businesses are publicly readable" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can insert" ON public.businesses;
DROP POLICY IF EXISTS "Business owners and staff can update" ON public.businesses;
DROP POLICY IF EXISTS "Business owners can delete" ON public.businesses;

DROP POLICY IF EXISTS "Business members can read their business" ON public.businesses;
DROP POLICY IF EXISTS "Businesses are publicly readable" ON public.businesses;

-- La tabla base ya no se expone a anon ni a usuarios ajenos: contenía
-- `owner_id`, `email` y `admin_notes`. Los portales públicos y el directorio
-- leen `businesses_public`; solo propietario, staff y superadministrador leen
-- la tabla completa.
CREATE POLICY "Business members can read their business"
  ON public.businesses FOR SELECT
  USING (public.has_business_access(id));

-- Vista pública mínima del negocio: mismos campos visibles que ya se
-- mostraban en el portal, sin datos internos ni de contacto privado.
CREATE OR REPLACE VIEW public.businesses_public AS
SELECT
  id,
  name,
  slug,
  location,
  phone,
  whatsapp,
  description,
  logo_url,
  cover_image_url,
  is_active,
  latitude,
  longitude,
  branding,
  max_courts,
  created_at
FROM public.businesses;

ALTER VIEW public.businesses_public SET (security_invoker = false);
REVOKE ALL ON public.businesses_public FROM public;
GRANT SELECT ON public.businesses_public TO anon, authenticated;

CREATE POLICY "Business owners can insert"
  ON public.businesses FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "Business owners and staff can update"
  ON public.businesses FOR UPDATE
  USING (owner_id = auth.uid() OR public.has_business_access(id))
  WITH CHECK (owner_id = auth.uid() OR public.has_business_access(id));

CREATE POLICY "Business owners can delete"
  ON public.businesses FOR DELETE
  USING (owner_id = auth.uid() OR public.is_super_admin());

-- Un miembro del staff puede editar la configuración del negocio, pero no
-- apropiarse de él cambiando `owner_id`. El superadministrador sí puede
-- reasignar la propiedad.
CREATE OR REPLACE FUNCTION public.prevent_business_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
    AND auth.role() IS DISTINCT FROM 'service_role'
    AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo un superadministrador puede cambiar el propietario del negocio.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_business_owner_change ON public.businesses;
CREATE TRIGGER prevent_business_owner_change
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_business_owner_change();

-- 2.2 profiles ---------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by owner or authorized staff" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Profiles viewable by owner or authorized staff"
  ON public.profiles FOR SELECT
  USING (public.can_view_profile(id));

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (id = auth.uid() OR public.is_super_admin());

-- Impide la elevación de privilegios: un usuario no puede cambiarse el rol a
-- owner/staff/super_admin desde el cliente. Solo service_role o un
-- superadministrador autenticado pueden modificar el rol.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'customer' THEN
      RAISE EXCEPTION 'No puedes asignarte un rol privilegiado.';
    END IF;
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'No puedes cambiar tu rol.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_profile_role_change
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

-- Vista mínima para el muro público de retos. Se limita a los usuarios que
-- participaron en algún reto (creador u oponente) en lugar de exponer el
-- listado completo de perfiles registrados.
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT p.id, p.full_name
FROM public.profiles p
WHERE EXISTS (
  SELECT 1
  FROM public.challenges c
  WHERE c.creator_id = p.id
     OR c.opponent_id = p.id
);

ALTER VIEW public.profiles_public SET (security_invoker = false);
REVOKE ALL ON public.profiles_public FROM public;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2.3 business_users ---------------------------------------------------------
DROP POLICY IF EXISTS "Business staff viewable by owner" ON public.business_users;
DROP POLICY IF EXISTS "Owners can manage staff" ON public.business_users;
DROP POLICY IF EXISTS "Staff can view own membership" ON public.business_users;
DROP POLICY IF EXISTS "Owners manage staff" ON public.business_users;

CREATE POLICY "Staff can view own membership"
  ON public.business_users FOR SELECT
  USING (user_id = auth.uid() OR public.has_business_access(business_id));

CREATE POLICY "Owners manage staff"
  ON public.business_users FOR ALL
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_users.business_id AND b.owner_id = auth.uid()
  ))
  WITH CHECK (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_users.business_id AND b.owner_id = auth.uid()
  ));

-- 2.4 courts -----------------------------------------------------------------
DROP POLICY IF EXISTS "Dueños gestionan las canchas de su negocio" ON public.courts;
DROP POLICY IF EXISTS "Cualquiera puede ver canchas activas" ON public.courts;
DROP POLICY IF EXISTS "Courts viewable by everyone" ON public.courts;
DROP POLICY IF EXISTS "Owners and staff manage courts" ON public.courts;
DROP POLICY IF EXISTS "Super admin can manage courts" ON public.courts;
DROP POLICY IF EXISTS "SuperAdmin tiene acceso total a canchas" ON public.courts;
DROP POLICY IF EXISTS "Active courts are publicly readable" ON public.courts;
DROP POLICY IF EXISTS "Business staff manage courts" ON public.courts;

CREATE POLICY "Active courts are publicly readable"
  ON public.courts FOR SELECT
  USING (coalesce(is_active, true) OR public.has_business_access(business_id));

CREATE POLICY "Business staff manage courts"
  ON public.courts FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

-- 2.5 business_hours / business_exceptions / court_pricing_rules -------------
DROP POLICY IF EXISTS "Business hours viewable by everyone" ON public.business_hours;
DROP POLICY IF EXISTS "Owners manage hours" ON public.business_hours;
DROP POLICY IF EXISTS "Owners and staff manage hours" ON public.business_hours;
DROP POLICY IF EXISTS "Business hours are publicly readable" ON public.business_hours;
DROP POLICY IF EXISTS "Business staff manage hours" ON public.business_hours;

CREATE POLICY "Business hours are publicly readable"
  ON public.business_hours FOR SELECT
  USING (true);

CREATE POLICY "Business staff manage hours"
  ON public.business_hours FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

DROP POLICY IF EXISTS "Owners manage exceptions" ON public.business_exceptions;
DROP POLICY IF EXISTS "Owners and staff manage exceptions" ON public.business_exceptions;
DROP POLICY IF EXISTS "Business exceptions are publicly readable" ON public.business_exceptions;
DROP POLICY IF EXISTS "Business staff manage exceptions" ON public.business_exceptions;

CREATE POLICY "Business exceptions are publicly readable"
  ON public.business_exceptions FOR SELECT
  USING (true);

CREATE POLICY "Business staff manage exceptions"
  ON public.business_exceptions FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

DROP POLICY IF EXISTS "Court pricing rules are publicly readable" ON public.court_pricing_rules;
DROP POLICY IF EXISTS "Business staff manage court pricing" ON public.court_pricing_rules;

CREATE POLICY "Court pricing rules are publicly readable"
  ON public.court_pricing_rules FOR SELECT
  USING (true);

CREATE POLICY "Business staff manage court pricing"
  ON public.court_pricing_rules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.courts c
    WHERE c.id = court_pricing_rules.court_id
      AND public.has_business_access(c.business_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.courts c
    WHERE c.id = court_pricing_rules.court_id
      AND public.has_business_access(c.business_id)
  ));

-- 2.6 reservations -----------------------------------------------------------
DROP POLICY IF EXISTS "Dueños ven reservas de su negocio" ON public.reservations;
DROP POLICY IF EXISTS "Cualquiera puede ver disponibilidad de reservas" ON public.reservations;
DROP POLICY IF EXISTS "Clientes pueden crear sus propias reservas" ON public.reservations;
DROP POLICY IF EXISTS "Clientes pueden cancelar (actualizar) sus propias reservas" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can insert reservation" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can insert own reservation" ON public.reservations;
DROP POLICY IF EXISTS "Staff can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can view reservations (for availability)" ON public.reservations;
DROP POLICY IF EXISTS "Customers can hide own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Super admin can manage reservations" ON public.reservations;
DROP POLICY IF EXISTS "SuperAdmin tiene acceso total a reservas" ON public.reservations;
DROP POLICY IF EXISTS "Reservations readable by customer or business staff" ON public.reservations;
DROP POLICY IF EXISTS "Customers and staff can insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Customers and staff can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Business staff can delete reservations" ON public.reservations;

CREATE POLICY "Reservations readable by customer or business staff"
  ON public.reservations FOR SELECT
  USING (customer_id = auth.uid() OR public.has_business_access(business_id));

CREATE POLICY "Customers and staff can insert reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (
    public.has_business_access(business_id)
    OR (
      customer_id = auth.uid()
      AND coalesce(status, 'pending') = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.courts c
        WHERE c.id = reservations.court_id
          AND c.business_id = reservations.business_id
          AND coalesce(c.is_active, false)
      )
    )
  );

CREATE POLICY "Customers and staff can update reservations"
  ON public.reservations FOR UPDATE
  USING (customer_id = auth.uid() OR public.has_business_access(business_id))
  WITH CHECK (customer_id = auth.uid() OR public.has_business_access(business_id));

CREATE POLICY "Business staff can delete reservations"
  ON public.reservations FOR DELETE
  USING (public.has_business_access(business_id));

-- Un cliente solo puede cancelar su reserva u ocultarla. No puede moverla de
-- cancha/fecha, cambiar el negocio ni auto-confirmarla. El staff conserva el
-- control completo dentro de los negocios a los que tiene acceso.
CREATE OR REPLACE FUNCTION public.enforce_reservation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_business_access(OLD.business_id) THEN
    RETURN NEW;
  END IF;

  IF OLD.customer_id = auth.uid() THEN
    IF NEW.business_id IS DISTINCT FROM OLD.business_id
      OR NEW.court_id IS DISTINCT FROM OLD.court_id
      OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
      OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
      OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
      OR NEW.customer_email IS DISTINCT FROM OLD.customer_email
      OR NEW.reservation_date IS DISTINCT FROM OLD.reservation_date
      OR NEW.start_time IS DISTINCT FROM OLD.start_time
      OR NEW.end_time IS DISTINCT FROM OLD.end_time
      OR NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'No puedes modificar los datos logísticos de tu reserva.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
      AND NOT (OLD.status IN ('pending', 'confirmed') AND NEW.status = 'cancelled') THEN
      RAISE EXCEPTION 'No puedes cambiar el estado de la reserva a ese valor.';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No tienes permisos para actualizar esta reserva.';
END;
$$;

DROP TRIGGER IF EXISTS enforce_reservation_update ON public.reservations;
CREATE TRIGGER enforce_reservation_update
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reservation_update();

-- 2.7 challenges -------------------------------------------------------------
DROP POLICY IF EXISTS "Challenges viewable by everyone" ON public.challenges;
DROP POLICY IF EXISTS "Authenticated users can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users and admins can update challenges" ON public.challenges;
DROP POLICY IF EXISTS "Acceptor can accept open challenges" ON public.challenges;
DROP POLICY IF EXISTS "Super Admin can delete challenges" ON public.challenges;
DROP POLICY IF EXISTS "Challenges are publicly readable" ON public.challenges;
DROP POLICY IF EXISTS "Challenges readable by participants and staff" ON public.challenges;
DROP POLICY IF EXISTS "Customers create own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Creators and opponents update challenges" ON public.challenges;
DROP POLICY IF EXISTS "Authenticated users accept open challenges" ON public.challenges;
DROP POLICY IF EXISTS "Business staff update challenges" ON public.challenges;
DROP POLICY IF EXISTS "Business staff delete challenges" ON public.challenges;

-- Los datos privados (teléfonos) ya no se leen directamente desde el muro
-- público. Solo participantes, staff y superadministradores ven la tabla base.
CREATE POLICY "Challenges readable by participants and staff"
  ON public.challenges FOR SELECT
  USING (
    creator_id = auth.uid()
    OR opponent_id = auth.uid()
    OR public.has_business_access(business_id)
  );

CREATE POLICY "Customers create own challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (
    creator_id = auth.uid()
    AND status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.courts c
      WHERE c.id = challenges.court_id
        AND c.business_id = challenges.business_id
        AND coalesce(c.is_active, false)
    )
  );

CREATE POLICY "Creators and opponents update challenges"
  ON public.challenges FOR UPDATE
  USING (creator_id = auth.uid() OR opponent_id = auth.uid())
  WITH CHECK (creator_id = auth.uid() OR opponent_id = auth.uid());

-- La aceptación de retos ya no se hace con un UPDATE directo: la RPC
-- `accept_challenge` valida y crea la reserva en una sola transacción. Una
-- política de UPDATE para no participantes sería inaplicable de todos modos,
-- porque RLS exige visibilidad previa de la fila vía SELECT.

CREATE POLICY "Business staff update challenges"
  ON public.challenges FOR UPDATE
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

CREATE POLICY "Business staff delete challenges"
  ON public.challenges FOR DELETE
  USING (public.has_business_access(business_id));

-- Vista pública mínima del muro de retos. Excluye teléfonos y cualquier dato
-- privado; incluye el nombre de la cancha para evitar joins públicos.
CREATE OR REPLACE VIEW public.challenges_public AS
SELECT
  c.id,
  c.business_id,
  c.court_id,
  c.creator_id,
  c.opponent_id,
  c.customer_name,
  c.challenge_date,
  c.challenge_time,
  c.notes,
  c.status,
  c.gender,
  c.men_count,
  c.women_count,
  c.accepted_at,
  c.confirmed_at,
  c.created_at,
  ct.name AS court_name
FROM public.challenges c
LEFT JOIN public.courts ct ON ct.id = c.court_id;

ALTER VIEW public.challenges_public SET (security_invoker = false);
REVOKE ALL ON public.challenges_public FROM public;
GRANT SELECT ON public.challenges_public TO anon, authenticated;

-- Un cliente no puede auto-confirmar ni mover un reto a otro negocio/cancha.
CREATE OR REPLACE FUNCTION public.enforce_challenge_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Las RPC transaccionales marcan este GUC para actualizar el reto como parte
  -- de una operación ya validada y atómica.
  IF current_setting('app.challenge_rpc', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' OR public.has_business_access(OLD.business_id) THEN
    RETURN NEW;
  END IF;

  IF OLD.creator_id = auth.uid() THEN
    IF NEW.business_id IS DISTINCT FROM OLD.business_id
      OR NEW.court_id IS DISTINCT FROM OLD.court_id
      OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
      OR NEW.opponent_id IS DISTINCT FROM OLD.opponent_id
      OR NEW.challenge_date IS DISTINCT FROM OLD.challenge_date
      OR NEW.challenge_time IS DISTINCT FROM OLD.challenge_time THEN
      RAISE EXCEPTION 'No puedes modificar los datos logísticos de este reto.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
      AND NOT (OLD.status IN ('open', 'accepted') AND NEW.status = 'cancelled') THEN
      RAISE EXCEPTION 'No puedes cambiar el estado del reto a ese valor.';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'open'
    AND NEW.status = 'accepted'
    AND NEW.opponent_id = auth.uid()
    AND NEW.creator_id IS NOT DISTINCT FROM OLD.creator_id
    AND NEW.business_id IS NOT DISTINCT FROM OLD.business_id
    AND NEW.court_id IS NOT DISTINCT FROM OLD.court_id
    AND NEW.challenge_date IS NOT DISTINCT FROM OLD.challenge_date
    AND NEW.challenge_time IS NOT DISTINCT FROM OLD.challenge_time THEN
    RETURN NEW;
  END IF;

  IF OLD.opponent_id = auth.uid()
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.creator_id IS NOT DISTINCT FROM OLD.creator_id
    AND NEW.opponent_id IS NOT DISTINCT FROM OLD.opponent_id
    AND NEW.business_id IS NOT DISTINCT FROM OLD.business_id
    AND NEW.court_id IS NOT DISTINCT FROM OLD.court_id
    AND NEW.challenge_date IS NOT DISTINCT FROM OLD.challenge_date
    AND NEW.challenge_time IS NOT DISTINCT FROM OLD.challenge_time THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No tienes permisos para actualizar este reto.';
END;
$$;

DROP TRIGGER IF EXISTS enforce_challenge_update ON public.challenges;
CREATE TRIGGER enforce_challenge_update
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.enforce_challenge_update();

-- ----------------------------------------------------------------------------
-- 2.7.1 Última barrera de disponibilidad para retos y reservas.
--
-- Las RPC validan el horario, pero RLS permite a un cliente insertar reservas
-- pendientes directamente. Estos triggers cierran esa vía y evitan que dos
-- solicitudes concurrentes reserven el mismo bloque:
--   * un reto no puede publicarse sobre una reserva ni sobre otro reto;
--   * una reserva no puede crearse sobre un reto publicado.
-- Ambos toman el mismo advisory lock que las RPC (cancha + fecha), y el
-- trigger de reservas se nombra con prefijo `a_` para ejecutarse antes que el
-- trigger heredado `prevent_double_booking` (orden alfabético en PostgreSQL).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_challenge_slot_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start time;
  v_end time;
BEGIN
  IF NEW.court_id IS NULL OR NEW.challenge_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF coalesce(NEW.status, 'open') NOT IN ('open', 'accepted', 'confirmed') THEN
    RETURN NEW;
  END IF;

  v_start := public.safe_time(NEW.challenge_time::text);
  IF v_start IS NULL THEN
    RAISE EXCEPTION 'La hora del reto no es válida.';
  END IF;

  -- 23:00 es el último inicio admitido para que el bloque termine el mismo día.
  IF EXTRACT(epoch FROM v_start) >= 82800 THEN
    RAISE EXCEPTION 'El reto debe terminar antes de la medianoche.';
  END IF;

  v_end := (v_start + interval '1 hour')::time;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.court_id::text || ':' || NEW.challenge_date::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.reservations r
    WHERE r.court_id = NEW.court_id
      AND r.reservation_date = NEW.challenge_date
      AND r.status IN ('pending', 'confirmed')
      AND r.start_time < v_end
      AND r.end_time > v_start
  ) THEN
    RAISE EXCEPTION 'Este horario ya tiene una reserva oficial. Elige otro.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.challenges c
    WHERE c.court_id = NEW.court_id
      AND c.challenge_date = NEW.challenge_date
      AND c.id IS DISTINCT FROM NEW.id
      AND c.status IN ('open', 'accepted', 'confirmed')
      AND public.safe_time(c.challenge_time::text) < v_end
      AND (public.safe_time(c.challenge_time::text) + interval '1 hour')::time > v_start
  ) THEN
    RAISE EXCEPTION 'Este horario se cruza con otro reto publicado. Elige otro.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_challenge_slot_available ON public.challenges;
CREATE TRIGGER enforce_challenge_slot_available
  BEFORE INSERT ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.enforce_challenge_slot_available();

CREATE OR REPLACE FUNCTION public.enforce_reservation_slot_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Las RPC de retos ya validaron el bloque y crean la reserva del propio reto.
  IF current_setting('app.challenge_rpc', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF coalesce(NEW.status, 'pending') NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (NEW.court_id, NEW.reservation_date, NEW.start_time, NEW.end_time)
      IS NOT DISTINCT FROM (OLD.court_id, OLD.reservation_date, OLD.start_time, OLD.end_time) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.court_id::text || ':' || NEW.reservation_date::text, 0)
  );

  -- Solapamiento entre reservas. Se valida aquí para que las bases creadas a
  -- partir de database/schema.sql (sin el trigger heredado
  -- `prevent_double_booking`) tengan la misma garantía que producción. Se
  -- conserva el mismo mensaje que ya reconoce la aplicación.
  IF EXISTS (
    SELECT 1
    FROM public.reservations r
    WHERE r.court_id = NEW.court_id
      AND r.reservation_date = NEW.reservation_date
      AND r.status IN ('pending', 'confirmed')
      AND r.id IS DISTINCT FROM NEW.id
      AND r.start_time < NEW.end_time
      AND r.end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'La cancha ya está reservada en este horario.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.challenges c
    WHERE c.court_id = NEW.court_id
      AND c.challenge_date = NEW.reservation_date
      AND c.status IN ('open', 'accepted', 'confirmed')
      AND public.safe_time(c.challenge_time::text) < NEW.end_time
      AND (public.safe_time(c.challenge_time::text) + interval '1 hour')::time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Este horario se cruza con un reto publicado.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_enforce_reservation_slot_available ON public.reservations;
CREATE TRIGGER a_enforce_reservation_slot_available
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reservation_slot_available();

-- 2.8 tournament -------------------------------------------------------------
DROP POLICY IF EXISTS "Tournament teams are publicly readable" ON public.tournament_teams;
DROP POLICY IF EXISTS "Business staff manage tournament teams" ON public.tournament_teams;
DROP POLICY IF EXISTS "Tournament players are publicly readable" ON public.tournament_players;
DROP POLICY IF EXISTS "Business staff manage tournament players" ON public.tournament_players;
DROP POLICY IF EXISTS "Tournament matches are publicly readable" ON public.tournament_matches;
DROP POLICY IF EXISTS "Business staff manage tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Tournament events are publicly readable" ON public.tournament_match_events;
DROP POLICY IF EXISTS "Business staff manage tournament events" ON public.tournament_match_events;

CREATE POLICY "Tournament teams are publicly readable"
  ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "Business staff manage tournament teams"
  ON public.tournament_teams FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

CREATE POLICY "Tournament players are publicly readable"
  ON public.tournament_players FOR SELECT USING (true);
CREATE POLICY "Business staff manage tournament players"
  ON public.tournament_players FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

CREATE POLICY "Tournament matches are publicly readable"
  ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "Business staff manage tournament matches"
  ON public.tournament_matches FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

CREATE POLICY "Tournament events are publicly readable"
  ON public.tournament_match_events FOR SELECT USING (true);
CREATE POLICY "Business staff manage tournament events"
  ON public.tournament_match_events FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

-- 2.9 user_favorites ---------------------------------------------------------
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios favoritos" ON public.user_favorites;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propios favoritos" ON public.user_favorites;
DROP POLICY IF EXISTS "Users read own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users manage own favorites" ON public.user_favorites;

CREATE POLICY "Users read own favorites"
  ON public.user_favorites FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own favorites"
  ON public.user_favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. Storage: buckets y escritura limitada al negocio dueño de la ruta.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('courts', 'courts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read courts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload courts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update courts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete courts" ON storage.objects;
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Business staff upload courts" ON storage.objects;
DROP POLICY IF EXISTS "Business staff update courts" ON storage.objects;
DROP POLICY IF EXISTS "Business staff delete courts" ON storage.objects;
DROP POLICY IF EXISTS "Business staff upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Business staff update logos" ON storage.objects;
DROP POLICY IF EXISTS "Business staff delete logos" ON storage.objects;

CREATE POLICY "Public read courts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'courts');

CREATE POLICY "Business staff upload courts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'courts' AND public.is_business_storage_path(name));

CREATE POLICY "Business staff update courts"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'courts' AND public.is_business_storage_path(name))
  WITH CHECK (bucket_id = 'courts' AND public.is_business_storage_path(name));

CREATE POLICY "Business staff delete courts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'courts' AND public.is_business_storage_path(name));

CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Business staff upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND public.is_business_storage_path(name));

CREATE POLICY "Business staff update logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos' AND public.is_business_storage_path(name))
  WITH CHECK (bucket_id = 'logos' AND public.is_business_storage_path(name));

CREATE POLICY "Business staff delete logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'logos' AND public.is_business_storage_path(name));

-- ----------------------------------------------------------------------------
-- 4. Disponibilidad pública sin exponer filas privadas de reservas.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_court_availability(p_court_id uuid, p_date date)
RETURNS TABLE (
  start_time time,
  end_time time,
  status text,
  kind text,
  gender text,
  reference_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.start_time,
    r.end_time,
    r.status,
    CASE WHEN r.notes LIKE '%Reto%' THEN 'confirmed_challenge' ELSE 'reservation' END AS kind,
    NULL::text AS gender,
    r.id AS reference_id
  FROM public.reservations r
  WHERE r.court_id = p_court_id
    AND r.reservation_date = p_date
    AND r.status IN ('pending', 'confirmed')
    AND EXISTS (
      SELECT 1 FROM public.courts c
      WHERE c.id = p_court_id AND coalesce(c.is_active, true)
    )
  UNION ALL
  SELECT
    public.safe_time(c.challenge_time::text) AS start_time,
    (public.safe_time(c.challenge_time::text) + interval '1 hour')::time AS end_time,
    c.status,
    CASE
      WHEN c.status = 'confirmed' THEN 'confirmed_challenge'
      WHEN c.status = 'open' THEN 'open_challenge'
      ELSE 'accepted_challenge'
    END AS kind,
    c.gender,
    c.id AS reference_id
  FROM public.challenges c
  WHERE c.court_id = p_court_id
    AND c.challenge_date = p_date
    AND c.status IN ('open', 'accepted', 'confirmed')
    AND public.safe_time(c.challenge_time::text) IS NOT NULL
    AND EXTRACT(epoch FROM public.safe_time(c.challenge_time::text)) < 82800
    AND EXISTS (
      SELECT 1 FROM public.courts c2
      WHERE c2.id = p_court_id AND coalesce(c2.is_active, true)
    )
  ORDER BY start_time;
$$;

REVOKE ALL ON FUNCTION public.get_court_availability(uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_court_availability(uuid, date) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. RPC transaccionales.
-- ----------------------------------------------------------------------------

-- Crea una reserva de cliente validando negocio, cancha, torneo y retos.
CREATE OR REPLACE FUNCTION public.create_customer_reservation(
  p_business_id uuid,
  p_court_id uuid,
  p_reservation_date date,
  p_start_time time,
  p_end_time time,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_reservation_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para reservar.';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND OR coalesce(v_profile.role, '') <> 'customer' THEN
    RAISE EXCEPTION 'Debes iniciar sesión con una cuenta de cliente para reservar.';
  END IF;

  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'El horario seleccionado no es válido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.courts c
    WHERE c.id = p_court_id
      AND c.business_id = p_business_id
      AND coalesce(c.is_active, false)
  ) THEN
    RAISE EXCEPTION 'La cancha seleccionada no pertenece a este negocio o no está disponible.';
  END IF;

  -- Serializa las reservas de la misma cancha y fecha para que el trigger de
  -- solapamiento vea las filas confirmadas por transacciones concurrentes.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_court_id::text || ':' || p_reservation_date::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.tournament_matches m
    WHERE m.business_id = p_business_id
      AND m.match_date = p_reservation_date
      AND (m.court_id = p_court_id OR m.court_id IS NULL)
      AND m.status IN ('scheduled', 'live', 'halftime')
      AND m.match_time < p_end_time
      AND (m.match_time + interval '1 hour') > p_start_time
  ) THEN
    RAISE EXCEPTION 'Este horario ya está reservado para un partido de torneo.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.challenges c
    WHERE c.court_id = p_court_id
      AND c.challenge_date = p_reservation_date
      AND c.status IN ('open', 'accepted', 'confirmed')
      AND public.safe_time(c.challenge_time::text) < p_end_time
      AND (public.safe_time(c.challenge_time::text) + interval '1 hour') > p_start_time
  ) THEN
    RAISE EXCEPTION 'Este horario se cruza con un reto publicado.';
  END IF;

  INSERT INTO public.reservations (
    business_id,
    court_id,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    reservation_date,
    start_time,
    end_time,
    status
  )
  VALUES (
    p_business_id,
    p_court_id,
    v_uid,
    coalesce(nullif(trim(p_customer_name), ''), 'Sin nombre'),
    coalesce(p_customer_phone, 'Sin teléfono'),
    p_customer_email,
    p_reservation_date,
    p_start_time,
    p_end_time,
    'pending'
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_reservation(uuid, uuid, date, time, time, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_customer_reservation(uuid, uuid, date, time, time, text, text, text) TO authenticated, service_role;

-- Acepta un reto y crea su reserva en una sola transacción.
CREATE OR REPLACE FUNCTION public.accept_challenge(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_challenge public.challenges%rowtype;
  v_start time;
  v_end time;
  v_reservation_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para aceptar un reto.';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND OR coalesce(v_profile.role, '') <> 'customer' THEN
    RAISE EXCEPTION 'Solo las cuentas de cliente pueden aceptar retos.';
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reto no encontrado.';
  END IF;
  IF v_challenge.creator_id = v_uid THEN
    RAISE EXCEPTION 'No puedes aceptar tu propio reto.';
  END IF;
  IF v_challenge.status <> 'open' THEN
    RAISE EXCEPTION 'Este reto ya no está disponible.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.courts c
    WHERE c.id = v_challenge.court_id
      AND c.business_id = v_challenge.business_id
      AND coalesce(c.is_active, false)
  ) THEN
    RAISE EXCEPTION 'La cancha del reto no está disponible.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_challenge.court_id::text || ':' || v_challenge.challenge_date::text, 0)
  );

  v_start := public.safe_time(v_challenge.challenge_time::text);
  IF v_start IS NULL THEN
    RAISE EXCEPTION 'El reto tiene una hora inválida.';
  END IF;
  IF EXTRACT(epoch FROM v_start) >= 82800 THEN
    RAISE EXCEPTION 'El reto debe terminar antes de la medianoche.';
  END IF;

  v_end := (v_start + interval '1 hour')::time;

  IF EXISTS (
    SELECT 1
    FROM public.reservations r
    WHERE r.court_id = v_challenge.court_id
      AND r.reservation_date = v_challenge.challenge_date
      AND r.status IN ('pending', 'confirmed')
      AND r.start_time < v_end
      AND r.end_time > v_start
  ) THEN
    RAISE EXCEPTION 'La cancha ya tiene una reserva oficial en ese horario.';
  END IF;

  -- Permite que el trigger de reservas omita el chequeo contra este mismo
  -- reto: la operación ya validó cancha, horario y solapamientos.
  PERFORM set_config('app.challenge_rpc', 'on', true);

  INSERT INTO public.reservations (
    business_id,
    court_id,
    customer_id,
    customer_name,
    customer_phone,
    reservation_date,
    start_time,
    end_time,
    status,
    notes
  )
  VALUES (
    v_challenge.business_id,
    v_challenge.court_id,
    v_challenge.creator_id,
    coalesce(nullif(v_challenge.customer_name, ''), 'Reto confirmado'),
    coalesce(v_challenge.customer_phone, ''),
    v_challenge.challenge_date,
    v_start,
    v_end,
    'confirmed',
    'Reto confirmado. Mensaje original: ' || coalesce(v_challenge.notes, '')
  )
  RETURNING id INTO v_reservation_id;

  UPDATE public.challenges
  SET opponent_id = v_uid,
      status = 'confirmed',
      accepted_at = now(),
      confirmed_at = now()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'challenge_id', p_challenge_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_challenge(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_challenge(uuid) TO authenticated, service_role;

-- Confirma un reto desde el panel del negocio y crea la reserva atómicamente.
CREATE OR REPLACE FUNCTION public.confirm_challenge(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_challenge public.challenges%rowtype;
  v_start time;
  v_end time;
  v_reservation_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reto no encontrado.';
  END IF;

  IF NOT public.has_business_access(v_challenge.business_id) THEN
    RAISE EXCEPTION 'Solo el personal autorizado puede confirmar retos.';
  END IF;

  IF v_challenge.status NOT IN ('open', 'accepted') THEN
    RAISE EXCEPTION 'Este reto no está disponible para confirmación.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.courts c
    WHERE c.id = v_challenge.court_id
      AND c.business_id = v_challenge.business_id
      AND coalesce(c.is_active, false)
  ) THEN
    RAISE EXCEPTION 'La cancha del reto no está disponible.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_challenge.court_id::text || ':' || v_challenge.challenge_date::text, 0)
  );

  v_start := public.safe_time(v_challenge.challenge_time::text);
  IF v_start IS NULL THEN
    RAISE EXCEPTION 'El reto tiene una hora inválida.';
  END IF;
  IF EXTRACT(epoch FROM v_start) >= 82800 THEN
    RAISE EXCEPTION 'El reto debe terminar antes de la medianoche.';
  END IF;

  v_end := (v_start + interval '1 hour')::time;

  IF EXISTS (
    SELECT 1
    FROM public.reservations r
    WHERE r.court_id = v_challenge.court_id
      AND r.reservation_date = v_challenge.challenge_date
      AND r.status IN ('pending', 'confirmed')
      AND r.start_time < v_end
      AND r.end_time > v_start
  ) THEN
    RAISE EXCEPTION 'La cancha ya tiene una reserva oficial en ese horario.';
  END IF;

  -- Permite que el trigger de reservas omita el chequeo contra este mismo
  -- reto: la operación ya validó cancha, horario y solapamientos.
  PERFORM set_config('app.challenge_rpc', 'on', true);

  INSERT INTO public.reservations (
    business_id,
    court_id,
    customer_id,
    customer_name,
    customer_phone,
    reservation_date,
    start_time,
    end_time,
    status,
    notes
  )
  VALUES (
    v_challenge.business_id,
    v_challenge.court_id,
    v_challenge.creator_id,
    coalesce(nullif(v_challenge.customer_name, ''), 'Reto confirmado'),
    coalesce(v_challenge.customer_phone, ''),
    v_challenge.challenge_date,
    v_start,
    v_end,
    'confirmed',
    'Reto confirmado. Mensaje original: ' || coalesce(v_challenge.notes, '')
  )
  RETURNING id INTO v_reservation_id;

  UPDATE public.challenges
  SET status = 'confirmed',
      confirmed_at = now()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'challenge_id', p_challenge_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_challenge(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.confirm_challenge(uuid) TO authenticated, service_role;
