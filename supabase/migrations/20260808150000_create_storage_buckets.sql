-- Migration: Create storage buckets used by the app + align overlap trigger message
-- The app uploads court images to the 'courts' bucket and business logos to 'logos'.
-- Neither bucket is created by schema.sql, so uploads fail with "bucket not found".
-- Run this in the Supabase SQL Editor.

-- 1. Storage buckets (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public) VALUES ('courts', 'courts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies for the 'courts' bucket
DROP POLICY IF EXISTS "Public read courts" ON storage.objects;
CREATE POLICY "Public read courts" ON storage.objects FOR SELECT USING (bucket_id = 'courts');
DROP POLICY IF EXISTS "Authenticated upload courts" ON storage.objects;
CREATE POLICY "Authenticated upload courts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'courts' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated update courts" ON storage.objects;
CREATE POLICY "Authenticated update courts" ON storage.objects FOR UPDATE USING (bucket_id = 'courts' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated delete courts" ON storage.objects;
CREATE POLICY "Authenticated delete courts" ON storage.objects FOR DELETE USING (bucket_id = 'courts' AND auth.role() = 'authenticated');

-- 3. Storage policies for the 'logos' bucket
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
CREATE POLICY "Public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
DROP POLICY IF EXISTS "Authenticated upload logos" ON storage.objects;
CREATE POLICY "Authenticated upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated update logos" ON storage.objects;
CREATE POLICY "Authenticated update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated delete logos" ON storage.objects;
CREATE POLICY "Authenticated delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- 4. Recreate the overlap trigger with the friendly message that the app matches on
CREATE OR REPLACE FUNCTION public.check_reservation_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.reservations
        WHERE court_id = NEW.court_id
          AND reservation_date = NEW.reservation_date
          AND status IN ('pending', 'confirmed')
          AND id != NEW.id
          AND (
                (NEW.start_time < end_time AND NEW.start_time >= start_time) OR
                (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
                (NEW.start_time <= start_time AND NEW.end_time >= end_time)
          )
    ) THEN
        RAISE EXCEPTION 'La cancha ya está reservada en este horario.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
