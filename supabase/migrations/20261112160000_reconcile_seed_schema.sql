-- Compatibilidad con database/seed.sql y con instalaciones anteriores.
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_challenges_customer_id
  ON public.challenges (customer_id);
