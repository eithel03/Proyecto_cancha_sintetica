-- ============================================================
-- Migración: DB hardening - indexes, CHECKs, types
-- Fecha: 2026-11-12
-- Descripción: Agrega índices críticos, CHECKs de integridad
--              y corrige tipos de datos
-- ============================================================

-- 1. Índice crítico en challenges (ruta caliente de triggers/RPC)
CREATE INDEX IF NOT EXISTS idx_challenges_court_date
  ON challenges(court_id, challenge_date);

-- 2. Precio a NUMERIC (era DOUBLE PRECISION)
ALTER TABLE court_pricing_rules
  ALTER COLUMN price TYPE NUMERIC(12,2) USING price::NUMERIC(12,2);

-- 3. challenge_time: DIFERIDO
-- En remoto es TEXT y la app lo consume como hora de día
-- (p.ej. challenge_time.substring(0, 5), formatTime12h); convertirlo a
-- TIMESTAMPTZ rompería ese formato. Además, la vista challenges_public
-- depende de la columna, por lo que ALTER TYPE requeriría recrearla.

-- 4. CHECKs de integridad
-- NOT VALID: no valida filas existentes (evita fallos por datos legacy,
-- p.ej. horarios que cruzan medianoche); sí aplica a filas nuevas.
ALTER TABLE court_pricing_rules
  DROP CONSTRAINT IF EXISTS chk_pricing_times;
ALTER TABLE court_pricing_rules
  ADD CONSTRAINT chk_pricing_times CHECK (end_time > start_time) NOT VALID;

ALTER TABLE business_hours
  DROP CONSTRAINT IF EXISTS chk_business_hours;
ALTER TABLE business_hours
  ADD CONSTRAINT chk_business_hours CHECK (close_time > open_time) NOT VALID;

-- Verificar si existe la tabla matches antes de agregar CHECKs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
    ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_scores_non_negative;
    ALTER TABLE matches ADD CONSTRAINT chk_scores_non_negative
      CHECK (home_score >= 0 AND away_score >= 0) NOT VALID;
    ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_different_teams;
    ALTER TABLE matches ADD CONSTRAINT chk_different_teams
      CHECK (home_team_id <> away_team_id) NOT VALID;
  END IF;
END $$;

-- 5. Cascada peligrosa: users -> businesses (RESTRICT en vez de CASCADE)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'businesses_owner_id_fkey'
    AND table_name = 'businesses'
  ) THEN
    ALTER TABLE businesses
      DROP CONSTRAINT businesses_owner_id_fkey,
      ADD CONSTRAINT businesses_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
END $$;
