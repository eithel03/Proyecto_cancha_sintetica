-- ============================================================
-- Migración: Expose show_tournament in businesses_public
-- Fecha: 2026-11-12
-- Descripción: La vista pública se creó antes de agregar
--              show_tournament; se recrea agregando la columna al final
--              para que el portal pueda ocultar la sección de torneo.
-- ============================================================

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
  created_at,
  show_tournament
FROM public.businesses;

ALTER VIEW public.businesses_public SET (security_invoker = false);
REVOKE ALL ON public.businesses_public FROM public;
GRANT SELECT ON public.businesses_public TO anon, authenticated;
