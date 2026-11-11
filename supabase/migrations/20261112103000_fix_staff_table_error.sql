-- ============================================================
-- Migración: Fix missing 'staff' table reference
-- Fecha: 2026-11-12
-- Descripción: Usa la función existente has_business_access()
--              en lugar de asumir una tabla 'staff'.
-- ============================================================

-- Eliminar la política que falló (por si acaso se creó a medias)
DROP POLICY IF EXISTS "business_exceptions_owner_read" ON business_exceptions;

-- Recrearla usando la función correcta que ya existe en tu BD
CREATE POLICY "business_exceptions_owner_read" ON business_exceptions
  FOR SELECT USING (
    auth.uid() IN (SELECT owner_id FROM businesses WHERE id = business_id)
    OR has_business_access(business_id)
  );
