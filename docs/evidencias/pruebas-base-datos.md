# Evidencia de pruebas de base de datos

Fecha de ejecucion: 2026-08-01  
Fuente revisada: `database/schema.sql`, `database/seed.sql`, `supabase/schema.sql`, `supabase/rls_policies.sql`.

## Resultado

Se realizaron pruebas estaticas sobre los scripts SQL. No se ejecutaron inserciones, actualizaciones ni eliminaciones contra Supabase porque `.env.local` apunta a una instancia remota y no se pudo confirmar que fuera una base de datos de pruebas.

## Evidencia estatica

- `businesses.slug` tiene restriccion `UNIQUE` e indice `idx_businesses_slug`.
- `courts.business_id` referencia `public.businesses(id)` con `ON DELETE CASCADE`.
- `reservations.status` tiene `CHECK` para `pending`, `confirmed`, `cancelled` y `completed`.
- Existen indices para `reservations(court_id, reservation_date)` y `reservations(business_id, reservation_date)`.
- `business_hours.day_of_week` tiene `CHECK` entre 0 y 6 y `UNIQUE (business_id, day_of_week)`.
- `supabase/schema.sql` incluye la funcion `check_reservation_overlap()` y el trigger `prevent_double_booking`.
- `database/schema.sql` no contiene la funcion ni el trigger de doble reserva, por lo que hay inconsistencia entre scripts.

## Limitaciones

- No se uso `EXPLAIN ANALYZE` por falta de conexion segura a una base de pruebas.
- No se validaron codigos PostgreSQL reales en ejecucion, salvo los codigos esperados por definicion de constraints (`23505`, `23503`, `23514`).
