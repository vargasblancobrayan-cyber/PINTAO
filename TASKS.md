# Tasks — PINTAO

## Completado en esta iteración (2026-10-12)

- [x] Auditoría completa de la aplicación `web/` (ver `AUDIT.md`, con evidencias).
- [x] CSP con nonce por petición: la aplicación vuelve a hidratar (era el bloqueante principal).
- [x] Cacheo correcto de assets (se eliminó el `no-store` global).
- [x] Checkout en dos pasos con estado controlado, validación por campo y enlace de pago real.
- [x] Cupón compartido entre carrito y checkout, con feedback de error/éxito.
- [x] Autenticación: fallback en memoria, PBKDF2 para admin, `token_hash` correcto, rol en la respuesta, límite de intentos.
- [x] Persistencia en modo demo: pedidos y cotizaciones dejan de perderse.
- [x] Wompi: crear una transacción ya no marca el pedido como pagado.
- [x] Imagen de producto 404 y `favicon` corregidos.
- [x] Tienda: filtrado inmediato, panel móvil, chips y URL compartible.
- [x] Accesibilidad: foco visible, salto al contenido, `aria-*` en formularios, contraste AA, `prefers-reduced-motion`.
- [x] Movimiento: cinta animada, progreso de lectura, menú móvil, fundido de galería, confirmaciones.
- [x] `loading.tsx` / `error.tsx` de ruta.
- [x] Panel admin: inventario real (precio, stock, publicar/ocultar, baja).
- [x] Panel admin: cambio de estado de pedidos reparado (la ruta no entendía el cuerpo que envía la interfaz).
- [x] Verificación end-to-end reproducible (`web/scripts/e2e-check.js`): 31/31 en verde + comprobaciones de API.
- [x] Eliminados `*.bak` y los `*.d.ts` que suplantaban los tipos de `next/server`.
- [x] Documentación actualizada: `AUDIT.md`, `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md`, `CHANGELOG.md`.

## Pendiente de autorización

- [ ] **Estrategia de render y CSP** (afecta seguridad y rendimiento): hoy se prioriza CSP estricta con render
      dinámico; la alternativa es HTML estático cacheable con `script-src 'unsafe-inline'`. Decisión en `AUDIT.md` §6.1.
- [ ] **Cuentas de cliente reales**: requiere decidir el almacén de credenciales (Supabase Auth o
      `pintao_clients.password_hash`). Hoy el login de cliente sólo existe con usuarios demo fuera de producción.
- [ ] **Persistencia del catálogo** en `pintao_store` (el panel de inventario escribe en memoria del proceso).
- [ ] **Descuento de stock al vender**: decidir trigger vs. llamada explícita al RPC `decrement_stock`.
- [ ] Vitest + Playwright Test (dependencias y CI).
- [ ] Migración a Next 16 (`npm audit fix --force`): *breaking*, y fijar la versión exacta de Next (hoy el rango
      `^15.3.0` resuelve a 15.5.27).

## Bloqueado por credenciales

- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en el entorno → ejecutar migraciones y verificar el flujo real.
- [ ] `WOMPI_PUBLIC_KEY` + `WOMPI_INTEGRITY_SECRET` → probar el pago en sandbox y el webhook firmado.
- [ ] Corregir la inconsistencia de nombres de variables de Wompi entre documentación y código.

## Próximos pasos sugeridos

1. Resolver las autorizaciones de la sección anterior (sobre todo la de render/CSP).
2. Convertir `scripts/e2e-check.js` en una suite de Playwright Test con CI.
3. Conectar el catálogo y el stock a Supabase y verificar con datos reales.
4. Añadir observabilidad (colector de errores) y `/api/health` ampliado.
