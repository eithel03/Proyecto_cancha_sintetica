# Evidencia de pruebas de rendimiento

Fecha de ejecucion: 2026-08-02  
Script ejecutado: `tests/performance/load-test.js`

## Herramienta

k6 fue instalada en Windows 11 mediante winget y ejecutada desde `C:\Program Files\k6\k6.exe`.

Version verificada:

```powershell
k6.exe v2.1.0 (commit/83a87a41e2, go1.26.4, windows/amd64)
```

## Configuracion preparada

- Ruta probada: `/`.
- Variable `BASE_URL` para apuntar al ambiente local o de pruebas.
- Variable `LOAD_TEST_PATH` para probar una ruta publica estable.
- Escenarios de 10, 25 y 50 usuarios concurrentes.
- Umbrales: tasa de error menor al 1 % y percentil 95 menor a 2 segundos.

## Comando ejecutado

```powershell
& 'C:\Program Files\k6\k6.exe' run --summary-export docs\evidencias\k6-summary-2026-08-02.json -e BASE_URL=http://127.0.0.1:3000 -e LOAD_TEST_PATH=/ tests\performance\load-test.js
```

## Resultados reales

| Metrica | Resultado |
| --- | --- |
| Entorno objetivo | Next.js local en `http://127.0.0.1:3000` |
| Ruta probada | `/` |
| Usuarios concurrentes | 10, luego 25, luego 50 |
| Duracion | 1 minuto por escenario, con separacion entre escenarios |
| Solicitudes totales | 2381 |
| Solicitudes por segundo | 11.219278/s |
| Tiempo minimo | 38.04 ms |
| Tiempo promedio | 1178.18 ms |
| Mediana | 903.89 ms |
| Percentil 90 | 2703.96 ms |
| Percentil 95 | 3002.64 ms |
| Tiempo maximo | 5305.38 ms |
| Tasa de error HTTP | 0.00 % |
| Checks exitosos | 2381 de 2381 |
| Cumplimiento RNF-01 | No cumple en esta ejecucion, porque el P95 fue mayor a 2000 ms |

El archivo de evidencia generado por k6 se conserva en `docs/evidencias/k6-summary-2026-08-02.json`.

## Limitaciones

La ruta publica real de negocio `cancha-la-tigra-sport`, tomada del archivo `database/seed.sql`, devolvio 404 en la base Supabase configurada para el entorno local. Por esta razon se uso `/`, que respondio 200 OK y no ejecuta flujos de creacion de usuarios, reservaciones ni registros masivos.

La ejecucion se realizo contra el servidor local de desarrollo de Next.js porque `npm run build` fallo durante typecheck en `.next/dev/types/validator.ts`. Por lo tanto, los resultados reflejan el comportamiento del entorno local de desarrollo y no deben interpretarse como rendimiento definitivo de produccion.
