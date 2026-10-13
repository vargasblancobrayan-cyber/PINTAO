# Tasks — PINTAO

## Completado en esta iteración (2026-10-13)

- [x] **Descuento de stock al vender**: `createOrder` llama al RPC atómico `decrement_stock` (y a `increment_stock` al
      reponer), con compensación del pedido si el inventario no alcanza. `lib/stock.ts` es la única puerta.
- [x] **Cancelación que repone** en `PATCH /api/admin/orders/[id]` (antes volvía a descontar) e idempotente al repetirla.
- [x] **Idempotencia** (`Idempotency-Key`) en `POST /api/orders` y `POST /api/payments/wompi/create` con
      `lib/idempotency.ts` + tabla `pintao_idempotency`; el checkout envía la clave.
- [x] **Webhook de Wompi idempotente** (`pintao_webhook_events`): un reintento no vuelve a aprobar el cobro.
- [x] Corregido `refund_stock` (nunca reponía nada) con `increment_stock`, el `CHECK` de `pintao_payment_attempts`
      (no admitía `PENDING`) y RLS/permisos de `pintao_stock_movements`.
- [x] `web/scripts/api-check.mjs`: 15/15 comprobaciones de API (stock, idempotencia, cancelación, CSRF) sobre el
      build de producción.
- [x] **Correos transaccionales** (`lib/email.ts` + `lib/order-emails.ts`): pedido recibido, pago confirmado, pedido
      enviado y cancelado, con aviso a la tienda del pedido nuevo. Proveedor Resend vía `fetch` (sin dependencias);
      sin `RESEND_API_KEY` el envío se omite y se registra, sin tumbar el checkout.
- [x] `GET /api/health` informa de `storage`, `email` y `payments` (detectar despliegues sin claves).
- [x] Documentación actualizada (`CHANGELOG.md`, `AUDIT.md` §6.4 y §8, `ARCHITECTURE.md`, `TESTING.md`, `ROADMAP.md`,
      `DECISIONS.md`).

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
- [x] Verificación end-to-end reproducible (`web/scripts/e2e-check.js`): 35/35 en verde + comprobaciones de API.
- [x] Eliminados `*.bak` y los `*.d.ts` que suplantaban los tipos de `next/server`.
- [x] Documentación actualizada: `AUDIT.md`, `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md`, `CHANGELOG.md`.

## Pendiente de autorización

- [ ] **Estrategia de render y CSP** (afecta seguridad y rendimiento): hoy se prioriza CSP estricta con render
      dinámico; la alternativa es HTML estático cacheable con `script-src 'unsafe-inline'`. Decisión en `AUDIT.md` §6.1.
- [x] **Cuentas de cliente reales**: decidido `pintao_clients.password_hash` (migración
      `202610120001_clients_credentials.sql`, RLS denegado) y alta en `/acceso` vía `POST /api/auth/register`.
      Para que funcione en el despliegue hay que cargar `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en Vercel;
      sin ellas el alta responde 503. Ver `AUDIT.md` §6.2 (sin verificación de correo ni reset de contraseña).
- [ ] **Persistencia del catálogo** en `pintao_store` (el panel de inventario escribe en memoria del proceso).
- [ ] **Stock visible al cliente en modo Supabase**: el catálogo se sirve desde `lib/products.ts` y puede mostrar
      stock agotado; conectar `getProductWithLiveStock` a `/tienda` y a la ficha de producto.
- [ ] Vitest + Playwright Test (dependencias y CI).
- [ ] Migración a Next 16 (`npm audit fix --force`): *breaking*, y fijar la versión exacta de Next (hoy el rango
      `^15.3.0` resuelve a 15.5.27).

## Bloqueado por credenciales

- [ ] `RESEND_API_KEY` (y `EMAIL_FROM` con un dominio verificado) en Vercel → verificar un envío real de extremo a
      extremo. Con la clave ausente el correo se omite; con una inválida, Resend responde 401 y el checkout sigue
      funcionando (comprobado).

- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en el entorno → ejecutar migraciones (incluida la nueva
      `202610130001_idempotencia_stock_webhooks.sql`) y verificar el flujo real (stock, idempotencia, webhook).
- [ ] `WOMPI_PUBLIC_KEY` + `WOMPI_INTEGRITY_SECRET` → probar el pago en sandbox y el webhook firmado.
- [ ] Corregir la inconsistencia de nombres de variables de Wompi entre documentación y código.

## Próximos pasos sugeridos

1. Resolver las autorizaciones de la sección anterior (sobre todo la de render/CSP).
2. Convertir `scripts/e2e-check.js` en una suite de Playwright Test con CI.
3. Conectar el catálogo y el stock a Supabase y verificar con datos reales.
4. Añadir observabilidad (colector de errores) y `/api/health` ampliado.
