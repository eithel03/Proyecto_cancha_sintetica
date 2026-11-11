#!/usr/bin/env bash
# ============================================================================
# Prueba de concurrencia de Fase 1: dos sesiones PostgreSQL simultáneas
# intentan reservar la misma cancha, fecha y hora.
#
# Espera que la segunda sesión quede bloqueada por el advisory lock de
# `create_customer_reservation`, que al liberarse detecte la fila confirmada
# por la primera y falle con el mensaje de solapamiento. Al final debe quedar
# exactamente UNA reserva.
#
# Uso (sólo Postgres local desechable, nunca un proyecto remoto):
#   DB_CONTAINER=saasintetica-db-fresh ./supabase/tests/phase1_concurrency_test.sh
# ============================================================================
set -euo pipefail

CONTAINER="${DB_CONTAINER:-saasintetica-db-fresh}"
PSQL=(docker exec -i "$CONTAINER" psql -U postgres -d postgres -X -q)

BUSINESS_ID='e0000000-0000-0000-0000-00000000000e'
COURT_ID='e1000000-0000-0000-0000-0000000000e1'
CUSTOMER_A='e2000000-0000-0000-0000-0000000000a1'
CUSTOMER_B='e2000000-0000-0000-0000-0000000000b2'
RESERVATION_DATE='2027-03-15'
START_TIME='18:00'
END_TIME='19:00'

WORKDIR="$(mktemp -d)"

cleanup() {
  # Deja la base local como estaba para que otras baterías no vean estos datos.
  "${PSQL[@]}" -v ON_ERROR_STOP=0 >/dev/null 2>&1 <<SQL || true
DELETE FROM public.reservations WHERE court_id = '$COURT_ID';
DELETE FROM public.courts WHERE id = '$COURT_ID';
DELETE FROM public.businesses WHERE id = '$BUSINESS_ID';
DELETE FROM public.profiles WHERE id IN ('$CUSTOMER_A', '$CUSTOMER_B');
DELETE FROM auth.users WHERE id IN ('$CUSTOMER_A', '$CUSTOMER_B');
SQL
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "== Semilla de la prueba (cancha $COURT_ID, $RESERVATION_DATE $START_TIME) =="
"${PSQL[@]}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO auth.users (id, email) VALUES
  ('$CUSTOMER_A', 'concurrencia-a@test.local'),
  ('$CUSTOMER_B', 'concurrencia-b@test.local')
ON CONFLICT (id) DO NOTHING;

SET request.jwt.claim.role = 'service_role';
INSERT INTO public.profiles (id, full_name, phone, role) VALUES
  ('$CUSTOMER_A', 'Cliente Concurrencia A', '700000001', 'customer'),
  ('$CUSTOMER_B', 'Cliente Concurrencia B', '700000002', 'customer')
ON CONFLICT (id) DO UPDATE SET role = 'customer';
SET request.jwt.claim.role = '';

INSERT INTO public.businesses (id, name, slug, location, is_active)
VALUES ('$BUSINESS_ID', 'Complejo Concurrencia', 'complejo-concurrencia', 'Local', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courts (id, business_id, name, is_active)
VALUES ('$COURT_ID', '$BUSINESS_ID', 'Cancha Concurrencia', true)
ON CONFLICT (id) DO NOTHING;

-- Sólo datos de esta prueba, en un contenedor desechable.
DELETE FROM public.reservations
WHERE court_id = '$COURT_ID' AND reservation_date = DATE '$RESERVATION_DATE';
SQL

cat > "$WORKDIR/sesion_a.sql" <<SQL
\\set ON_ERROR_STOP on
\\timing on
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '$CUSTOMER_A', true);
SELECT public.create_customer_reservation(
  '$BUSINESS_ID', '$COURT_ID', DATE '$RESERVATION_DATE',
  TIME '$START_TIME', TIME '$END_TIME', 'Cliente A', '700000001', NULL);
-- Mantiene el advisory lock y la transacción abiertas para forzar el cruce.
SELECT pg_sleep(2);
COMMIT;
\\echo 'SESION_A: TRANSACCION CONFIRMADA'
SQL

cat > "$WORKDIR/sesion_b.sql" <<SQL
\\set ON_ERROR_STOP off
\\timing on
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '$CUSTOMER_B', true);
SELECT public.create_customer_reservation(
  '$BUSINESS_ID', '$COURT_ID', DATE '$RESERVATION_DATE',
  TIME '$START_TIME', TIME '$END_TIME', 'Cliente B', '700000002', NULL);
COMMIT;
\\echo 'SESION_B: FIN'
SQL

echo "== Lanzando sesión A y, 0.7 s después, sesión B =="
"${PSQL[@]}" -v ON_ERROR_STOP=1 -f - < "$WORKDIR/sesion_a.sql" > "$WORKDIR/a.log" 2>&1 &
PID_A=$!

sleep 0.7

START_B=$(date +%s%N)
"${PSQL[@]}" -f - < "$WORKDIR/sesion_b.sql" > "$WORKDIR/b.log" 2>&1 || true

wait "$PID_A"
END_B=$(date +%s%N)

echo "--- sesión A ---"
cat "$WORKDIR/a.log"
echo "--- sesión B ---"
cat "$WORKDIR/b.log"
echo "--- resultado ---"

grep -q 'SESION_A: TRANSACCION CONFIRMADA' "$WORKDIR/a.log" \
  || { echo "FALLO: la sesión A no confirmó su reserva."; exit 1; }
grep -q 'ya está reservada en este horario' "$WORKDIR/b.log" \
  || { echo "FALLO: la sesión B no fue rechazada por solapamiento."; exit 1; }

ROWS=$("${PSQL[@]}" -t -A -c "
  SELECT count(*) FROM public.reservations
  WHERE court_id = '$COURT_ID'
    AND reservation_date = DATE '$RESERVATION_DATE'
    AND status IN ('pending', 'confirmed');")

if [ "$ROWS" != "1" ]; then
  echo "FALLO: quedaron $ROWS reservas en el bloque; se esperaba 1."
  exit 1
fi

echo "Sesión B rechazada en $(( (END_B - START_B) / 1000000 )) ms; reservas en el bloque: $ROWS."
echo "OK: la prueba de concurrencia de reservas de Fase 1 pasó."
