-- ============================================================
-- Migración: Fix remaining security gaps after Phase 1
-- Fecha: 2026-11-12
-- Descripción: Endurece políticas RLS que siguen usando USING(true).
--              La protección de PII de tournament_teams queda diferida
--              (ver sección 4).
-- ============================================================

-- 1. Endurecer políticas de business_exceptions (hay 2 duplicadas)
DROP POLICY IF EXISTS "Cualquiera puede ver excepciones" ON business_exceptions;
DROP POLICY IF EXISTS "Business exceptions are publicly readable" ON business_exceptions;

CREATE POLICY "business_exceptions_owner_read" ON business_exceptions
  FOR SELECT USING (
    auth.uid() IN (SELECT owner_id FROM businesses WHERE id = business_id)
    OR has_business_access(business_id)
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

-- 4. PII de tournament_teams (captain_phone): DIFERIDO
-- La app pública consulta tournament_teams con la anon key
-- (src/app/[slug]/torneo/page.tsx), por lo que REVOKE SELECT ... FROM anon
-- rompería el portal. Proteger captain_phone requiere migrar esa consulta a
-- una vista/column-grants en una tarea aparte.
