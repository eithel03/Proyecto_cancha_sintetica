-- Índices de las rutas calientes del portal.
-- Ejecutar después de las migraciones existentes de Supabase.
-- No se crean índices duplicados de los ya presentes en
-- 20261112140000_performance_indexes.sql.

-- 1. Disponibilidad de reservas: el RPC y los triggers sólo consideran
-- reservas activas y buscan por cancha, fecha y rango horario.
CREATE INDEX IF NOT EXISTS idx_reservations_active_court_date_time
  ON public.reservations (court_id, reservation_date, start_time, end_time)
  WHERE status IN ('pending', 'confirmed');

-- 2. Historial visible del cliente en /perfil.
CREATE INDEX IF NOT EXISTS idx_reservations_customer_business_visible_date
  ON public.reservations (customer_id, business_id, reservation_date DESC)
  WHERE hidden_by_customer = false;

-- 3. Listado de canchas activas por negocio ordenadas por nombre.
CREATE INDEX IF NOT EXISTS idx_courts_active_business_name
  ON public.courts (business_id, name)
  WHERE is_active = true;

-- 4. Disponibilidad de retos por cancha, fecha y hora.
CREATE INDEX IF NOT EXISTS idx_challenges_active_court_date_time
  ON public.challenges (court_id, challenge_date, challenge_time)
  WHERE status IN ('open', 'accepted', 'confirmed');

-- 5. Muro público: retos abiertos de cualquier cliente.
CREATE INDEX IF NOT EXISTS idx_challenges_open_business_date_time
  ON public.challenges (business_id, challenge_date, challenge_time)
  WHERE status = 'open';

-- 6. Retos activos creados por el cliente autenticado.
CREATE INDEX IF NOT EXISTS idx_challenges_creator_active_business_date
  ON public.challenges (creator_id, business_id, challenge_date, challenge_time)
  WHERE status IN ('open', 'accepted');

-- 7. Historial de retos cuando el usuario participa como oponente.
CREATE INDEX IF NOT EXISTS idx_challenges_opponent_active_business_date
  ON public.challenges (opponent_id, business_id, challenge_date, challenge_time)
  WHERE status IN ('open', 'accepted', 'confirmed');

-- 8. Panel de torneo y validación de choques en una cancha.
CREATE INDEX IF NOT EXISTS idx_tournament_matches_court_date_time_status
  ON public.tournament_matches (court_id, match_date, match_time, status);

-- 9. Torneo público: sólo equipos activos por negocio y género.
CREATE INDEX IF NOT EXISTS idx_tournament_teams_active_business_gender
  ON public.tournament_teams (business_id, gender)
  WHERE is_active = true;

-- Actualiza estadísticas para que el planificador use los índices nuevos.
ANALYZE public.reservations;
ANALYZE public.challenges;
ANALYZE public.courts;
ANALYZE public.tournament_matches;
ANALYZE public.tournament_teams;
