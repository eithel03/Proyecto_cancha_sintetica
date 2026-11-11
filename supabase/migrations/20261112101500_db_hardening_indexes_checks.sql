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

-- 3. challenge_time a TIMESTAMPTZ si es TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenges'
    AND column_name = 'challenge_time'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE challenges
      ALTER COLUMN challenge_time TYPE TIMESTAMPTZ USING challenge_time::TIMESTAMPTZ;
  END IF;
END $$;

-- 4. CHECKs de integridad
ALTER TABLE court_pricing_rules
  ADD CONSTRAINT IF NOT EXISTS chk_pricing_times CHECK (end_time > start_time);

ALTER TABLE businesses
  ADD CONSTRAINT IF NOT EXISTS chk_business_hours CHECK (close_time > open_time);

-- Verificar si existe la tabla matches antes de agregar CHECKs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
    ALTER TABLE matches
      ADD CONSTRAINT IF NOT EXISTS chk_scores_non_negative CHECK (home_score >= 0 AND away_score >= 0),
      ADD CONSTRAINT IF NOT EXISTS chk_different_teams CHECK (home_team_id <> away_team_id);
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
