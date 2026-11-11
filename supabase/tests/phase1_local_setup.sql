-- ============================================================================
-- Entorno local mínimo para probar la migración de Fase 1 sin un proyecto
-- Supabase remoto.
--
-- Crea únicamente lo que la imagen de PostgreSQL no trae por sí sola: el
-- esquema `storage` que normalmente provisiona Supabase Storage. No se ejecuta
-- contra un proyecto remoto ni contiene datos reales.
--
-- Uso:
--   psql -v ON_ERROR_STOP=1 -f database/schema.sql
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/phase1_local_setup.sql
--   psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261108120000_phase1_security_rls_storage_transactions.sql
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/phase1_rls_transactions.test.sql
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Mismos privilegios base que otorga Supabase a los roles de PostgREST.
GRANT ALL ON storage.objects TO anon, authenticated, service_role;
GRANT ALL ON storage.buckets TO anon, authenticated, service_role;
