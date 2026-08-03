# Evidencia de pruebas E2E

Fecha de ejecucion: 2026-08-01  
Herramienta: Playwright 1.62.1  
Archivo: `tests/e2e/app.spec.ts`

## Comandos

```bash
npm.cmd test -- --project=chromium
npm.cmd test
```

## Resultado completo

`npm.cmd test` ejecuto 14 pruebas entre escritorio y movil:

- 10 aprobadas.
- 4 omitidas por falta de `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD` y `E2E_BUSINESS_SLUG`.
- 2 fallas esperadas: login invalido de dueño no renderiza mensaje de error visible.

## Cobertura ejecutada

- Carga de pagina principal.
- Acceso a login de dueño.
- Acceso a login de super administrador.
- Acceso a login de cliente.
- Proteccion de `/dashboard` para usuario anonimo.
- Respuesta 404 para slug inexistente.
- Validacion responsive basica mediante proyecto `mobile-chrome`.

## Limitaciones

- No se probaron flujos autenticados reales por falta de credenciales de prueba.
- No se creo reservacion real por falta de base de pruebas confirmada.
