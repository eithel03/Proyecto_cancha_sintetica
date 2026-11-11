-- ============================================================
-- Migración: Fix remaining security gaps after Phase 1
-- Fecha: 2026-11-12
-- Descripción: Endurece políticas RLS que siguen usando USING(true)
--              y protege PII de tournament_teams
-- ============================================================

-- 1. Endurecer políticas de business_exceptions (hay 2 duplicadas)
DROP POLICY IF EXISTS "Cualquiera puede ver excepciones" ON business_exceptions;
DROP POLICY IF EXISTS "Business exceptions are publicly readable" ON business_exceptions;

CREATE POLICY "business_exceptions_owner_read" ON business_exceptions
  FOR SELECT USING (
    auth.uid() IN (SELECT owner_id FROM businesses WHERE id = business_id)
    OR auth.uid() IN (SELECT user_id FROM staff WHERE business_id = business_exceptions.business_id)
  );

-- 2. Endurecer política de business_hours
DROP POLICY IF EXISTS "Business hours are publicly readable" ON business_hours;

CREATE POLICY "business_hours_public_active" ON business_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_hours.business_id
      AND b.is_active = true
    )
  );

-- 3. Endurecer política de court_pricing_rules
DROP POLICY IF EXISTS "Court pricing rules are publicly readable" ON court_pricing_rules;

CREATE POLICY "court_pricing_rules_business_context" ON court_pricing_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courts c
      JOIN businesses b ON c.business_id = b.id
      WHERE c.id = court_pricing_rules.court_id
      AND b.is_active = true
    )
  );

-- 4. Proteger PII de tournament_teams (captain_phone)
-- Revocar acceso directo a anon
REVOKE SELECT ON tournament_teams FROM anon;

-- Crear vista pública que enmascara el teléfono
CREATE OR REPLACE VIEW public.tournament_teams_public AS
SELECT
  id,
  tournament_id,
  name,
  logo_url,
  points,
  wins,
  losses,
  draws,
  '***' AS captain_phone_masked
FROM tournament_teams;

GRANT SELECT ON tournament_teams_public TO anon;
GRANT SELECT ON tournament_teams TO authenticated;
