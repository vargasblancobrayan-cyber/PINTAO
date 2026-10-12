# Decisions — PINTAO

## Técnicas adoptadas

- **Persistencia**: Supabase para producción, store en memoria para demo sin credenciales.
- **Validación**: Zod en `POST /api/orders`; server recomputa totales.
- **Pago**: Wompi, con webhook y firma `X-Event-Checksum`.
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

## Pendientes de decisión

- **Estrategia de render y CSP** (seguridad vs. caché de HTML en el borde): ver `AUDIT.md` §6.1.
- **Persistencia del catálogo** editado en el panel admin (`pintao_store`) y **descuento de stock** al vender
  (`decrement_stock` existe en las migraciones pero `createOrder` no lo llama): `AUDIT.md` §6.3 y §6.4.
- Migración a Next.js 16 para resolver vulnerabilidades de `postcss` (breaking change) y fijar la versión exacta.
- Revisión de roles y permisos de Supabase (admin/cliente/sesión).
