-- ============================================================
-- Migración: Add tournament visibility toggle
-- Fecha: 2026-11-12
-- Descripción: Agrega el campo show_tournament a businesses para
--              controlar la visibilidad de la sección de torneo en
--              el portal público.
-- ============================================================

-- Add tournament visibility toggle to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS show_tournament BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN businesses.show_tournament IS 'Controls visibility of tournament section in public portal. When false, tournament tab is hidden and public access is blocked.';

-- Update RLS policies if needed (allow owner to update this field)
-- La política existente de businesses ya permite al owner hacer UPDATE
