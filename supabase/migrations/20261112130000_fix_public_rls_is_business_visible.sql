-- ============================================================
-- Migración: Restaurar lectura pública de horarios, excepciones y precios
-- Fecha: 2026-11-12
-- Descripción: Las políticas creadas en 20261112100000 usan
--              EXISTS/JOIN contra public.businesses. anon no tiene política
--              SELECT en businesses (solo miembros), por lo que el subquery
--              no ve filas y business_hours / court_pricing_rules quedaban
--              vacíos en el portal ("Local cerrado"). Se añade un helper
--              SECURITY DEFINER y se reescriben las políticas públicas.
--              También se restaura la lectura pública de excepciones para
--              que las fechas bloqueadas se muestren a los clientes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_business_publicly_visible(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_business_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE id = target_business_id
        AND coalesce(is_active, true) = true
    );
$$;

REVOKE ALL ON FUNCTION public.is_business_publicly_visible(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_business_publicly_visible(uuid) TO anon, authenticated, service_role;

-- Horarios: lectura pública solo de negocios activos.
DROP POLICY IF EXISTS "business_hours_public_active" ON public.business_hours;
CREATE POLICY "business_hours_public_active" ON public.business_hours
  FOR SELECT USING (public.is_business_publicly_visible(business_id));

-- Excepciones: el portal necesita ver los días bloqueados.
DROP POLICY IF EXISTS "business_exceptions_public_active" ON public.business_exceptions;
CREATE POLICY "business_exceptions_public_active" ON public.business_exceptions
  FOR SELECT USING (public.is_business_publicly_visible(business_id));

-- Precios por franja: lectura pública solo de canchas de negocios activos.
DROP POLICY IF EXISTS "court_pricing_rules_business_context" ON public.court_pricing_rules;
CREATE POLICY "court_pricing_rules_public_active" ON public.court_pricing_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.courts c
      WHERE c.id = court_pricing_rules.court_id
        AND public.is_business_publicly_visible(c.business_id)
    )
  );
