# Decisions — PINTAO

## Técnicas adoptadas

- **Persistencia**: Supabase para producción, store en memoria para demo sin credenciales.
- **Validación**: Zod en `POST /api/orders`; server recomputa totales.
- **Pago**: Wompi, con webhook firmado (`X-Event-Checksum`) y deduplicado por evento.
- **Idempotencia**: `Idempotency-Key` en pedidos y pagos; misma clave → misma respuesta.
- **Inventario**: `decrement_stock`/`increment_stock` atómicos vía `lib/stock.ts` (descuento al vender, reposición al
  cancelar).
- **Auth**: Cookie `pintao_session` (HttpOnly), admin y cliente en Supabase (`pintao_admin_users` / `pintao_clients`,
  ambos con PBKDF2); memoria en local sin credenciales.
- **Render**: Next.js 15,SSG para catálogo; SSR para checkout (esperando session del cliente para no exponer datos en HTML).
- **Seguridad**: CSP, HSTS, rate limiting, CSRF, `X-Frame-Options: DENY`.

## Decisiones de la iteración 0.2.0 (2026-10-12)

- **CSP con nonce por petición** (`src/middleware.ts`) en lugar de la cabecera estática anterior. Con
  `'strict-dynamic'` y sin nonce el navegador bloqueaba todo el JS de Next: la tienda no hidrataba.
- **Render dinámico en todo el árbol** (`export const dynamic = "force-dynamic"` en `app/layout.tsx`) como consecuencia
  de lo anterior. Pendiente de decisión del responsable: si se prefiere HTML estático cacheable, hay que pasar a
  `script-src 'self' 'unsafe-inline'` (ver `AUDIT.md` §6.1).
- **Sesiones con `token_hash`**: la cookie guarda un token aleatorio y en `pintao_sessions` se persiste su SHA-256, con
  `expires_at` y renovación deslizante. Se corrigió la consulta a una columna `token` que no existe.
- **Fallback en memoria que persiste de verdad** en `lib/persistence.ts` y `lib/auth.ts`: antes devolvía `ok: true` sin
  guardar y el historial de pedidos y el panel admin salían vacíos en local.
- **Sólo el webhook firmado aprueba pagos**: crear la transacción deja el pedido en `PENDING`.
- **El panel admin edita el mismo catálogo que sirve la tienda** (`lib/admin-products.ts`), no una copia paralela.
- **Eliminados los `*.d.ts` que redefinían `next/server`**: suplantaban los tipos oficiales y obligaban a evitar
  `NextRequest`/`NextResponse` como valores. Ahora se usan los tipos reales del framework.
- **Almacén de credenciales de cliente: `pintao_clients.password_hash`** (elegido el 2026-10-12) frente a Supabase
  Auth. Tabla nueva `202610120001_clients_credentials.sql` con el mismo formato PBKDF2 que `pintao_admin_users`, RLS
  denegado a `anon`/`authenticated` y alta pública en `POST /api/auth/register`. Se descartó Supabase Auth para no
  mantener dos sistemas de sesión en el mismo `/acceso`; la contrapartida (sin verificación de correo ni reset de
  contraseña) queda anotada en `AUDIT.md` §6.2.

## Conflictos resueltos

- `NextResponse` se usó como valor en varios archivos API; se cambiaron a `Response` estándar para que el tipado sea correcto.
- `NextRequest` no estaba disponible en `lib/format.ts` y `lib/pricing.ts` (errores TS2304/2339); se limpió el dominio.
- `types.ts`: `User` no estaba exportada (errores TS2305/2403).
- `server-store.ts`: `subscribeNewsletter` now returns `boolean` (errores TS1345).
- `db.ts`: `createClient` importado de `@supabase/supabase-js` y declarado en el mismo archivo (error TS2440); se renombró a `createSupabaseClient`.

## Decisiones de la iteración 0.3.0 (2026-10-13)

- **Stock por llamada explícita al RPC, no trigger**: el descuento debe poder fallar **antes** de dar la venta por
  buena, con un mensaje accionable (`409`) en lugar de un error de base de datos opaco. `lib/stock.ts` es la única
  puerta a `decrement_stock` / `increment_stock`; funciona igual con y sin Supabase.
- **Insertar el pedido y luego descontar** stock, con borrado compensatorio si el descuento falla. El orden inverso
  perdería inventario si fallara el `insert`.
- **Idempotencia con `Idempotency-Key`** (tabla `pintao_idempotency`, `status = 0` = en curso → `409`). Sólo se
  memorizan respuestas `2xx`: un `4xx` corregible no debe quedar pegado a la clave. Sin clave, el endpoint se
  comporta como antes (la idempotencia es opcional para no romper clientes).
- **Webhooks de Wompi deduplicados** por `<transacción>:<estado>` (`pintao_webhook_events`). Un reintento del
  proveedor responde `200 { duplicate: true }` sin volver a aplicar el cobro; un cambio real de estado entra porque
  la clave cambia.
- **Cancelación idempotente y sólo desde `Cancelado` se repone**: cancelar dos veces no devuelve inventario dos
  veces. Antes «cancelar» llamaba a `decrement_stock`, es decir volvía a descontar.
- **Siembra del catálogo en `pintao_store`** cuando falta o no tiene variantes, antes de rendirse: se prefiere un
  `upsert` ocasional a rechazar todas las ventas por un inventario sin publicar.
- **El stock sí baja al vender, pero la ficha puede mostrar stock viejo** en modo Supabase (el catálogo se sirve
  desde `lib/products.ts`). Se acepta esta iteración: el RPC impide sobrevender; mostrar el stock vivo queda
  pendiente en `TASKS.md`.

## Pendientes de decisión

- **Estrategia de render y CSP** (seguridad vs. caché de HTML en el borde): ver `AUDIT.md` §6.1.
- **Persistencia del catálogo** editado en el panel admin (`pintao_store`): `AUDIT.md` §6.3. El **descuento de stock**
  quedó resuelto en la iteración 0.3.0 (`AUDIT.md` §6.4 y §8).
- Migración a Next.js 16 para resolver vulnerabilidades de `postcss` (breaking change) y fijar la versión exacta.
- Revisión de roles y permisos de Supabase (admin/cliente/sesión).
