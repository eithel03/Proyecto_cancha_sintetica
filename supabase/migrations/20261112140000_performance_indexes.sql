-- Índices para las consultas más frecuentes del portal público y del panel.
-- Las columnas corresponden al esquema real de este proyecto.

CREATE INDEX IF NOT EXISTS idx_reservations_business_date
  ON public.reservations (business_id, reservation_date);

CREATE INDEX IF NOT EXISTS idx_reservations_court_date
  ON public.reservations (court_id, reservation_date);

CREATE INDEX IF NOT EXISTS idx_business_hours_business_day
  ON public.business_hours (business_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_business_date_status
  ON public.tournament_matches (business_id, match_date, status);

CREATE INDEX IF NOT EXISTS idx_challenges_business_date_status
  ON public.challenges (business_id, challenge_date, status);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
  ON public.user_favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_tournament_match_events_business_id
  ON public.tournament_match_events (business_id);
