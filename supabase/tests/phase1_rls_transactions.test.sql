-- ============================================================================
-- Pruebas locales de la Fase 1: RLS, Storage y transacciones.
--
-- Se ejecutan sobre el Postgres desechable descrito en phase1_local_setup.sql.
-- No contienen datos reales ni deben ejecutarse contra un proyecto remoto.
--
-- Uso (después de cargar database/schema.sql, el setup y todas las migraciones):
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/phase1_rls_transactions.test.sql
--
-- El archivo se ejecuta como rol `postgres` (dueño de las tablas: omite RLS
-- sólo al sembrar datos). Cada bloque de prueba cambia a `anon` o
-- `authenticated` para comprobar que las políticas sí restringen.
-- Un fallo lanza `FALLO: ...` y detiene la ejecución.
-- ============================================================================

\set ON_ERROR_STOP on

-- ----------------------------------------------------------------------------
-- 0. Semilla de datos de prueba.
-- ----------------------------------------------------------------------------
BEGIN;

DELETE FROM storage.objects WHERE bucket_id IN ('courts', 'logos');
DELETE FROM public.businesses
WHERE id IN ('a0000000-0000-0000-0000-00000000000a',
             'b0000000-0000-0000-0000-00000000000b');
DELETE FROM auth.users
WHERE id IN ('11111111-1111-1111-1111-111111111111',
             '22222222-2222-2222-2222-222222222222',
             '33333333-3333-3333-3333-333333333333',
             '44444444-4444-4444-4444-444444444444',
             '55555555-5555-5555-5555-555555555555',
             '66666666-6666-6666-6666-666666666666',
             '77777777-7777-7777-7777-777777777777',
             '88888888-8888-8888-8888-888888888888');

INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'dueno-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'staff-a@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'dueno-b@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'cliente-1@test.local'),
  ('55555555-5555-5555-5555-555555555555', 'cliente-2@test.local'),
  ('66666666-6666-6666-6666-666666666666', 'cliente-3@test.local'),
  ('77777777-7777-7777-7777-777777777777', 'super@test.local'),
  ('88888888-8888-8888-8888-888888888888', 'cliente-nuevo@test.local');

-- El trigger de perfiles exige service_role para sembrar roles privilegiados.
SET request.jwt.claim.role = 'service_role';
SET request.jwt.claim.sub = '';

INSERT INTO public.profiles (id, full_name, phone, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Dueño A', '600000001', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Staff A', '600000002', 'staff'),
  ('33333333-3333-3333-3333-333333333333', 'Dueño B', '600000003', 'owner'),
  ('44444444-4444-4444-4444-444444444444', 'Cliente 1', '600000004', 'customer'),
  ('55555555-5555-5555-5555-555555555555', 'Cliente 2', '600000005', 'customer'),
  ('66666666-6666-6666-6666-666666666666', 'Cliente 3', '600000006', 'customer'),
  ('77777777-7777-7777-7777-777777777777', 'Super Admin', '600000007', 'super_admin');

SET request.jwt.claim.role = '';

INSERT INTO public.businesses (id, name, slug, owner_id, location, phone, email, admin_notes) VALUES
  ('a0000000-0000-0000-0000-00000000000a', 'Complejo A', 'complejo-a',
   '11111111-1111-1111-1111-111111111111', 'Calle A', '600000010',
   'privado-a@test.local', 'nota interna A'),
  ('b0000000-0000-0000-0000-00000000000b', 'Complejo B', 'complejo-b',
   '33333333-3333-3333-3333-333333333333', 'Calle B', '600000011',
   'privado-b@test.local', 'nota interna B');

INSERT INTO public.business_users (business_id, user_id, role) VALUES
  ('a0000000-0000-0000-0000-00000000000a',
   '22222222-2222-2222-2222-222222222222', 'staff');

INSERT INTO public.courts (id, business_id, name, is_active) VALUES
  ('c0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-00000000000a', 'Cancha A1', true),
  ('c0000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-00000000000a', 'Cancha A2', true),
  ('c0000000-0000-0000-0000-0000000000b1', 'b0000000-0000-0000-0000-00000000000b', 'Cancha B1', true);

COMMIT;

-- ----------------------------------------------------------------------------
-- 1. Verificación estructural: RLS activo en todas las tablas de la Fase 1.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_falta text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_falta
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname = ANY (ARRAY[
      'businesses', 'profiles', 'business_users', 'courts', 'business_hours',
      'business_exceptions', 'court_pricing_rules', 'reservations', 'challenges',
      'tournament_teams', 'tournament_players', 'tournament_matches',
      'tournament_match_events', 'user_favorites', 'business_subscriptions'
    ])
    AND NOT c.relrowsecurity;

  ASSERT v_falta IS NULL, 'FALLO: tablas sin RLS activo: ' || v_falta;

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'INSERT' AND policyname = 'Business staff upload courts'
  ), 'FALLO: falta la política de subida de canchas';

  ASSERT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'INSERT' AND policyname = 'Business staff upload logos'
  ), 'FALLO: falta la política de subida de logos';
END $$;

-- ----------------------------------------------------------------------------
-- 2. Anónimo: no ve la tabla base de negocios ni datos privados.
-- ----------------------------------------------------------------------------
SET ROLE anon;
SET request.jwt.claim.role = 'anon';
SET request.jwt.claim.sub = '';

DO $$
DECLARE
  v_base integer;
  v_view integer;
  v_courts integer;
  v_borrados integer;
BEGIN
  SELECT count(*) INTO v_base FROM public.businesses;
  ASSERT v_base = 0, 'FALLO: anon puede leer businesses base (' || v_base || ' filas)';

  SELECT count(*) INTO v_view FROM public.businesses_public;
  ASSERT v_view >= 2, 'FALLO: anon no ve negocios en businesses_public (' || v_view || ')';

  SELECT count(*) INTO v_courts FROM public.courts;
  ASSERT v_courts >= 3, 'FALLO: anon no ve canchas activas (' || v_courts || ')';

  BEGIN
    EXECUTE 'SELECT admin_notes FROM public.businesses_public LIMIT 1';
    RAISE EXCEPTION 'FALLO: businesses_public expone admin_notes';
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  BEGIN
    EXECUTE 'SELECT owner_id FROM public.businesses_public LIMIT 1';
    RAISE EXCEPTION 'FALLO: businesses_public expone owner_id';
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  BEGIN
    EXECUTE 'SELECT email FROM public.businesses_public LIMIT 1';
    RAISE EXCEPTION 'FALLO: businesses_public expone email';
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  BEGIN
    INSERT INTO public.businesses (name, slug, owner_id)
    VALUES ('Intruso', 'intruso', NULL);
    RAISE EXCEPTION 'FALLO: anon pudo insertar un negocio';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%FALLO:%' THEN RAISE; END IF;
  END;

  -- RLS filtra las filas en lugar de lanzar error: comprobamos el recuento.
  DELETE FROM storage.objects WHERE bucket_id = 'logos';
  GET DIAGNOSTICS v_borrados = ROW_COUNT;
  ASSERT v_borrados = 0, 'FALLO: anon borró ' || v_borrados || ' objetos de Storage';
END $$;

-- ----------------------------------------------------------------------------
-- 3. Cliente autenticado: sólo ve lo suyo.
-- ----------------------------------------------------------------------------
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

DO $$
DECLARE
  v_base integer;
  v_profiles integer;
  v_staff integer;
  v_res integer;
  v_ch integer;
BEGIN
  SELECT count(*) INTO v_base FROM public.businesses;
  ASSERT v_base = 0, 'FALLO: un cliente ajeno leyó businesses base';

  SELECT count(*) INTO v_profiles FROM public.profiles;
  ASSERT v_profiles = 1, 'FALLO: un cliente ve perfiles ajenos (' || v_profiles || ')';

  SELECT count(*) INTO v_staff FROM public.business_users;
  ASSERT v_staff = 0, 'FALLO: un cliente ve el staff del negocio';

  SELECT count(*) INTO v_res FROM public.reservations;
  ASSERT v_res = 0, 'FALLO: un cliente ve reservas ajenas';

  SELECT count(*) INTO v_ch FROM public.challenges;
  ASSERT v_ch = 0, 'FALLO: un cliente ve retos ajenos';
END $$;

-- ----------------------------------------------------------------------------
-- 4. Elevación de privilegios bloqueada.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET role = 'super_admin' WHERE id = auth.uid();
    RAISE EXCEPTION 'FALLO: el cliente pudo elevar su rol';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%No puedes cambiar tu rol%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al elevar rol: %', SQLERRM;
    END IF;
  END;
END $$;

SET request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (auth.uid(), 'Nuevo', 'owner');
    RAISE EXCEPTION 'FALLO: el cliente pudo crearse un perfil con rol owner';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%No puedes asignarte un rol privilegiado%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al crear perfil: %', SQLERRM;
    END IF;
  END;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (auth.uid(), 'Nuevo cliente', 'customer');
END $$;

-- ----------------------------------------------------------------------------
-- 5. Staff: puede editar su negocio, no apropiarse de él.
-- ----------------------------------------------------------------------------
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  v_rows integer;
BEGIN
  BEGIN
    UPDATE public.businesses
    SET owner_id = auth.uid()
    WHERE id = 'a0000000-0000-0000-0000-00000000000a';
    RAISE EXCEPTION 'FALLO: el staff se apropió del negocio';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Solo un superadministrador%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al cambiar owner_id: %', SQLERRM;
    END IF;
  END;

  UPDATE public.businesses
  SET description = 'Editado por staff'
  WHERE id = 'a0000000-0000-0000-0000-00000000000a';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  ASSERT v_rows = 1, 'FALLO: el staff no pudo editar su negocio';

  BEGIN
    UPDATE public.businesses
    SET description = 'Intruso'
    WHERE id = 'b0000000-0000-0000-0000-00000000000b';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    ASSERT v_rows = 0, 'FALLO: el staff editó un negocio ajeno';
  END;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Reservas: RPC transaccional, solapamientos y límites del cliente.
-- ----------------------------------------------------------------------------
SET request.jwt.claim.sub = '';

DO $$
BEGIN
  BEGIN
    PERFORM public.create_customer_reservation(
      'a0000000-0000-0000-0000-00000000000a',
      'c0000000-0000-0000-0000-0000000000a1',
      DATE '2026-12-01', TIME '09:00', TIME '10:00',
      'Anónimo', '600000099', NULL);
    RAISE EXCEPTION 'FALLO: la RPC de reservas aceptó una sesión sin usuario';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Debes iniciar sesión%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado sin sesión: %', SQLERRM;
    END IF;
  END;
END $$;

SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

DO $$
DECLARE
  v_id uuid;
BEGIN
  v_id := public.create_customer_reservation(
    'a0000000-0000-0000-0000-00000000000a',
    'c0000000-0000-0000-0000-0000000000a1',
    DATE '2026-12-01', TIME '10:00', TIME '11:00',
    'Cliente 2', '600000005', 'cliente-2@test.local');
  ASSERT v_id IS NOT NULL, 'FALLO: no se creó la reserva del cliente';
END $$;

SET request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

DO $$
BEGIN
  BEGIN
    PERFORM public.create_customer_reservation(
      'a0000000-0000-0000-0000-00000000000a',
      'c0000000-0000-0000-0000-0000000000a1',
      DATE '2026-12-01', TIME '10:30', TIME '11:30',
      'Cliente 3', '600000006', NULL);
    RAISE EXCEPTION 'FALLO: se permitió una segunda reserva solapada';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ya está reservada%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado en solapamiento: %', SQLERRM;
    END IF;
  END;

  -- Inserción directa: RLS permite reservas pendientes propias, pero el
  -- trigger de disponibilidad debe bloquear el solapamiento.
  BEGIN
    INSERT INTO public.reservations (
      business_id, court_id, customer_id, customer_name, customer_phone,
      reservation_date, start_time, end_time, status)
    VALUES (
      'a0000000-0000-0000-0000-00000000000a',
      'c0000000-0000-0000-0000-0000000000a1',
      auth.uid(), 'Cliente 3', '600000006',
      DATE '2026-12-01', TIME '10:30', TIME '11:30', 'pending');
    RAISE EXCEPTION 'FALLO: el trigger permitió una reserva solapada directa';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ya está reservada%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado en inserción directa: %', SQLERRM;
    END IF;
  END;

  BEGIN
    INSERT INTO public.reservations (
      business_id, court_id, customer_id, customer_name, customer_phone,
      reservation_date, start_time, end_time, status)
    VALUES (
      'a0000000-0000-0000-0000-00000000000a',
      'c0000000-0000-0000-0000-0000000000a2',
      auth.uid(), 'Cliente 3', '600000006',
      DATE '2026-12-07', TIME '08:00', TIME '09:00', 'confirmed');
    RAISE EXCEPTION 'FALLO: un cliente pudo auto-confirmar una reserva';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%row-level security%'
      AND SQLERRM NOT LIKE '%row level security%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al auto-confirmar: %', SQLERRM;
    END IF;
  END;
END $$;

SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

DO $$
DECLARE
  v_id uuid;
  v_rows integer;
BEGIN
  BEGIN
    UPDATE public.reservations
    SET start_time = TIME '15:00'
    WHERE customer_id = auth.uid() AND reservation_date = DATE '2026-12-01';
    RAISE EXCEPTION 'FALLO: el cliente movió su reserva de horario';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%No puedes modificar los datos logísticos%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al mover reserva: %', SQLERRM;
    END IF;
  END;

  BEGIN
    UPDATE public.reservations
    SET status = 'confirmed'
    WHERE customer_id = auth.uid() AND reservation_date = DATE '2026-12-01';
    RAISE EXCEPTION 'FALLO: el cliente confirmó su propia reserva';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%No puedes cambiar el estado%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al confirmar: %', SQLERRM;
    END IF;
  END;

  -- Cancelar sigue permitido y libera el bloque.
  UPDATE public.reservations
  SET status = 'cancelled'
  WHERE customer_id = auth.uid() AND reservation_date = DATE '2026-12-01';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  ASSERT v_rows = 1, 'FALLO: el cliente no pudo cancelar su reserva';

  v_id := public.create_customer_reservation(
    'a0000000-0000-0000-0000-00000000000a',
    'c0000000-0000-0000-0000-0000000000a1',
    DATE '2026-12-01', TIME '10:00', TIME '11:00',
    'Cliente 2', '600000005', NULL);
  ASSERT v_id IS NOT NULL, 'FALLO: el horario cancelado no se pudo reutilizar';
END $$;

SET request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

DO $$
DECLARE
  v_res integer;
  v_ch integer;
BEGIN
  SELECT count(*) INTO v_res FROM public.reservations;
  ASSERT v_res = 0, 'FALLO: un cliente ajeno ve reservas (' || v_res || ')';

  SELECT count(*) INTO v_ch FROM public.challenges;
  ASSERT v_ch = 0, 'FALLO: un cliente ajeno ve retos (' || v_ch || ')';
END $$;

-- ----------------------------------------------------------------------------
-- 7. Retos: publicación, solapamientos y aceptación transaccional.
-- ----------------------------------------------------------------------------
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

DO $$
BEGIN
  BEGIN
    INSERT INTO public.challenges (
      id, business_id, court_id, customer_id, creator_id, customer_name,
      customer_phone, challenge_date, challenge_time, status)
    VALUES (
      'd0000000-0000-0000-0000-000000000010',
      'a0000000-0000-0000-0000-00000000000a',
      'c0000000-0000-0000-0000-0000000000a1',
      auth.uid(), auth.uid(), 'Cliente 1', '600000004',
      DATE '2026-12-01', '10:30', 'open');
    RAISE EXCEPTION 'FALLO: se publicó un reto sobre una reserva oficial';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%reserva oficial%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado reto/reserva: %', SQLERRM;
    END IF;
  END;

  INSERT INTO public.challenges (
    id, business_id, court_id, customer_id, creator_id, customer_name,
    customer_phone, challenge_date, challenge_time, notes, status)
  VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-00000000000a',
    'c0000000-0000-0000-0000-0000000000a1',
    auth.uid(), auth.uid(), 'Cliente 1', '600000004',
    DATE '2026-12-01', '12:00', 'Reto de prueba', 'open');

  BEGIN
    INSERT INTO public.challenges (
      id, business_id, court_id, customer_id, creator_id, customer_name,
      customer_phone, challenge_date, challenge_time, status)
    VALUES (
      'd0000000-0000-0000-0000-000000000011',
      'a0000000-0000-0000-0000-00000000000a',
      'c0000000-0000-0000-0000-0000000000a1',
      auth.uid(), auth.uid(), 'Cliente 1', '600000004',
      DATE '2026-12-01', '12:30', 'open');
    RAISE EXCEPTION 'FALLO: se publicaron dos retos en el mismo bloque';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%otro reto publicado%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado reto/reto: %', SQLERRM;
    END IF;
  END;

  BEGIN
    INSERT INTO public.challenges (
      id, business_id, court_id, customer_id, creator_id, customer_name,
      customer_phone, challenge_date, challenge_time, status)
    VALUES (
      'd0000000-0000-0000-0000-000000000012',
      'a0000000-0000-0000-0000-00000000000a',
      'c0000000-0000-0000-0000-0000000000a2',
      auth.uid(), auth.uid(), 'Cliente 1', '600000004',
      DATE '2026-12-09', '23:30', 'open');
    RAISE EXCEPTION 'FALLO: se permitió un reto que termina después de medianoche';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%medianoche%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado en hora límite: %', SQLERRM;
    END IF;
  END;

  BEGIN
    UPDATE public.challenges
    SET status = 'confirmed'
    WHERE id = 'd0000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FALLO: el creador auto-confirmó su reto';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%No puedes cambiar el estado del reto%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al auto-confirmar reto: %', SQLERRM;
    END IF;
  END;

  BEGIN
    UPDATE public.challenges
    SET challenge_time = '13:00'
    WHERE id = 'd0000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FALLO: el creador movió el horario de su reto';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%No puedes modificar los datos logísticos%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al mover reto: %', SQLERRM;
    END IF;
  END;

  BEGIN
    PERFORM public.accept_challenge('d0000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'FALLO: el creador aceptó su propio reto';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%No puedes aceptar tu propio reto%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al auto-aceptar: %', SQLERRM;
    END IF;
  END;
END $$;

SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.accept_challenge('d0000000-0000-0000-0000-000000000001');
  ASSERT (v_result ->> 'success')::boolean, 'FALLO: la aceptación no devolvió success';

  BEGIN
    PERFORM public.accept_challenge('d0000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'FALLO: se aceptó dos veces el mismo reto';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ya no está disponible%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al reaceptar: %', SQLERRM;
    END IF;
  END;
END $$;

-- La reserva creada pertenece al creador del reto, así que sólo el negocio
-- (o su titular) puede verificarla: comprobamos además que la RLS la oculta
-- al oponente en la sección anterior.
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_res integer;
  v_status text;
BEGIN
  SELECT count(*) INTO v_res
  FROM public.reservations
  WHERE reservation_date = DATE '2026-12-01'
    AND start_time = TIME '12:00'
    AND status = 'confirmed';
  ASSERT v_res = 1,
    'FALLO: la aceptación creó ' || v_res || ' reservas confirmadas (esperada 1)';

  SELECT status INTO v_status
  FROM public.challenges
  WHERE id = 'd0000000-0000-0000-0000-000000000001';
  ASSERT v_status = 'confirmed', 'FALLO: el reto no quedó confirmado (' || v_status || ')';
END $$;

-- Un tercer cliente no puede aceptar un reto ya confirmado.
SET request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

DO $$
BEGIN
  BEGIN
    PERFORM public.accept_challenge('d0000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'FALLO: un tercer cliente aceptó un reto cerrado';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%ya no está disponible%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado en tercer cliente: %', SQLERRM;
    END IF;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- 8. Confirmación desde el panel: sólo el negocio dueño del reto.
-- ----------------------------------------------------------------------------
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

INSERT INTO public.challenges (
  id, business_id, court_id, customer_id, creator_id, customer_name,
  customer_phone, challenge_date, challenge_time, status)
VALUES (
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-00000000000a',
  'c0000000-0000-0000-0000-0000000000a2',
  auth.uid(), auth.uid(), 'Cliente 1', '600000004',
  DATE '2026-12-04', '15:00', 'open');

INSERT INTO public.challenges (
  id, business_id, court_id, customer_id, creator_id, customer_name,
  customer_phone, challenge_date, challenge_time, status)
VALUES (
  'd0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-00000000000b',
  'c0000000-0000-0000-0000-0000000000b1',
  auth.uid(), auth.uid(), 'Cliente 1', '600000004',
  DATE '2026-12-05', '18:00', 'open');

SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

DO $$
BEGIN
  BEGIN
    PERFORM public.confirm_challenge('d0000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'FALLO: el dueño de otro negocio confirmó el reto';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Solo el personal autorizado%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado en negocio ajeno: %', SQLERRM;
    END IF;
  END;
END $$;

SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_result jsonb;
  v_res integer;
BEGIN
  v_result := public.confirm_challenge('d0000000-0000-0000-0000-000000000002');
  ASSERT (v_result ->> 'success')::boolean, 'FALLO: el dueño no pudo confirmar su reto';

  SELECT count(*) INTO v_res
  FROM public.reservations
  WHERE reservation_date = DATE '2026-12-04'
    AND start_time = TIME '15:00'
    AND status = 'confirmed';
  ASSERT v_res = 1, 'FALLO: la confirmación no creó la reserva del reto';

  BEGIN
    PERFORM public.confirm_challenge('d0000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'FALLO: se confirmó dos veces el mismo reto';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%no está disponible para confirmación%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al reconfirmar: %', SQLERRM;
    END IF;
  END;
END $$;

-- El superadministrador sí puede operar sobre cualquier negocio.
SET request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';

DO $$
DECLARE
  v_result jsonb;
  v_biz integer;
BEGIN
  -- Se acota a los negocios sembrados: la base local puede contener otros
  -- fixtures de pruebas y el superadministrador debe ver igualmente ambos.
  SELECT count(*) INTO v_biz
  FROM public.businesses
  WHERE id IN ('a0000000-0000-0000-0000-00000000000a',
               'b0000000-0000-0000-0000-00000000000b');
  ASSERT v_biz = 2, 'FALLO: el superadministrador no ve los negocios sembrados';

  v_result := public.confirm_challenge('d0000000-0000-0000-0000-000000000003');
  ASSERT (v_result ->> 'success')::boolean,
    'FALLO: el superadministrador no pudo confirmar el reto del negocio B';
END $$;

-- ----------------------------------------------------------------------------
-- 9. Storage: la primera carpeta debe ser un negocio propio.
-- ----------------------------------------------------------------------------
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_rows integer;
BEGIN
  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('logos', 'a0000000-0000-0000-0000-00000000000a/logo.png');

  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('courts', 'a0000000-0000-0000-0000-00000000000a/courts/1.jpg');

  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('logos', 'b0000000-0000-0000-0000-00000000000b/logo.png');
    RAISE EXCEPTION 'FALLO: se pudo escribir en la carpeta de otro negocio';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%row-level security%'
      AND SQLERRM NOT LIKE '%row level security%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado en escritura cruzada: %', SQLERRM;
    END IF;
  END;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('logos', 'logo-sin-negocio.png');
    RAISE EXCEPTION 'FALLO: se pudo escribir sin carpeta de negocio';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%row-level security%'
      AND SQLERRM NOT LIKE '%row level security%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado sin carpeta: %', SQLERRM;
    END IF;
  END;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('courts', 'no-es-uuid/1.jpg');
    RAISE EXCEPTION 'FALLO: se pudo escribir con carpeta que no es UUID';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%row-level security%'
      AND SQLERRM NOT LIKE '%row level security%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado con carpeta inválida: %', SQLERRM;
    END IF;
  END;

  -- El staff del negocio A tampoco puede borrar objetos del negocio B.
  PERFORM set_config('request.jwt.claim.sub',
    '22222222-2222-2222-2222-222222222222', true);
  DELETE FROM storage.objects
  WHERE name = 'b0000000-0000-0000-0000-00000000000b/logo.png';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  ASSERT v_rows = 0, 'FALLO: el staff borró un objeto de otro negocio';
END $$;

SET ROLE anon;
SET request.jwt.claim.role = 'anon';
SET request.jwt.claim.sub = '';

DO $$
DECLARE
  v_logos integer;
  v_courts integer;
BEGIN
  SELECT count(*) INTO v_logos FROM storage.objects WHERE bucket_id = 'logos';
  ASSERT v_logos = 1, 'FALLO: anon no puede leer los logos públicos (' || v_logos || ')';

  SELECT count(*) INTO v_courts FROM storage.objects WHERE bucket_id = 'courts';
  ASSERT v_courts = 1, 'FALLO: anon no puede leer las imágenes públicas (' || v_courts || ')';

  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('logos', 'a0000000-0000-0000-0000-00000000000a/anon.png');
    RAISE EXCEPTION 'FALLO: anon pudo subir archivos';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%row-level security%'
      AND SQLERRM NOT LIKE '%row level security%' THEN
      RAISE EXCEPTION 'FALLO: mensaje inesperado al subir como anon: %', SQLERRM;
    END IF;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- 10. Disponibilidad pública: sin exponer filas privadas de reservas.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_rows integer;
  v_kinds text;
  v_result text;
BEGIN
  SELECT count(*) INTO v_rows
  FROM public.get_court_availability(
    'c0000000-0000-0000-0000-0000000000a1', DATE '2026-12-01');
  ASSERT v_rows >= 2,
    'FALLO: la disponibilidad pública devolvió ' || v_rows || ' filas';

  SELECT string_agg(DISTINCT kind, ',') INTO v_kinds
  FROM public.get_court_availability(
    'c0000000-0000-0000-0000-0000000000a1', DATE '2026-12-01');
  ASSERT v_kinds LIKE '%reservation%' AND v_kinds LIKE '%challenge%',
    'FALLO: la disponibilidad no incluye reservas y retos (' || v_kinds || ')';

  v_result := pg_get_function_result(
    'public.get_court_availability(uuid, date)'::regprocedure);
  ASSERT v_result NOT LIKE '%customer%',
    'FALLO: la disponibilidad expone datos del cliente: ' || v_result;
END $$;

-- ----------------------------------------------------------------------------
-- 11. Aislamiento entre negocios y perfiles visibles.
-- ----------------------------------------------------------------------------
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

DO $$
DECLARE
  v_id uuid;
BEGIN
  v_id := public.create_customer_reservation(
    'b0000000-0000-0000-0000-00000000000b',
    'c0000000-0000-0000-0000-0000000000b1',
    DATE '2026-12-06', TIME '10:00', TIME '11:00',
    'Cliente 3', '600000006', NULL);
  ASSERT v_id IS NOT NULL, 'FALLO: no se creó la reserva en el negocio B';
END $$;

SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  v_b integer;
  v_cliente2 integer;
  v_cliente3 integer;
  v_dueno_b integer;
BEGIN
  SELECT count(*) INTO v_b FROM public.businesses;
  ASSERT v_b = 1, 'FALLO: el staff ve ' || v_b || ' negocios';

  SELECT count(*) INTO v_cliente2 FROM public.profiles
  WHERE id = '55555555-5555-5555-5555-555555555555';
  ASSERT v_cliente2 = 1, 'FALLO: el staff no ve al cliente de su negocio';

  SELECT count(*) INTO v_cliente3 FROM public.profiles
  WHERE id = '66666666-6666-6666-6666-666666666666';
  ASSERT v_cliente3 = 0, 'FALLO: el staff ve un cliente de otro negocio';

  SELECT count(*) INTO v_dueno_b FROM public.profiles
  WHERE id = '33333333-3333-3333-3333-333333333333';
  ASSERT v_dueno_b = 0, 'FALLO: el staff ve al dueño de otro negocio';

  BEGIN
    DELETE FROM public.reservations
    WHERE business_id = 'b0000000-0000-0000-0000-00000000000b';
    GET DIAGNOSTICS v_b = ROW_COUNT;
    ASSERT v_b = 0, 'FALLO: el staff borró reservas de otro negocio';
  END;
END $$;

SET ROLE anon;
SET request.jwt.claim.role = 'anon';
SET request.jwt.claim.sub = '';

DO $$
DECLARE
  v_total integer;
  v_cliente1 integer;
  v_cliente3 integer;
  v_dueno integer;
BEGIN
  SELECT count(*) INTO v_total FROM public.profiles_public;
  ASSERT v_total = 2,
    'FALLO: profiles_public expone ' || v_total || ' perfiles (esperados 2 participantes)';

  SELECT count(*) INTO v_cliente1 FROM public.profiles_public
  WHERE id = '44444444-4444-4444-4444-444444444444';
  ASSERT v_cliente1 = 1, 'FALLO: falta el creador del reto en profiles_public';

  SELECT count(*) INTO v_cliente3 FROM public.profiles_public
  WHERE id = '66666666-6666-6666-6666-666666666666';
  ASSERT v_cliente3 = 0, 'FALLO: profiles_public expone a un no participante';

  SELECT count(*) INTO v_dueno FROM public.profiles_public
  WHERE id = '11111111-1111-1111-1111-111111111111';
  ASSERT v_dueno = 0, 'FALLO: profiles_public expone al dueño del negocio';
END $$;

RESET ROLE;
SET request.jwt.claim.role = '';
SET request.jwt.claim.sub = '';

DO $$
BEGIN
  RAISE NOTICE 'OK: todas las pruebas de RLS, Storage y transacciones de Fase 1 pasaron.';
END $$;
