# PINTAO — notas del repositorio

## Estructura actual

- **`web/`**: aplicación Next.js 15 + TS strict + Tailwind v4 + Framer Motion. **Todo trabajo nuevo debe ir aquí**. Es la app que se desplegaen Vercel (Root Directory del proyecto en el dashboard: `web/`).
- **`legacy/`**: sitio legacy estático (HTML/CSS/JS) con `server.js` en Node plano y espejo en Supabase Edge Functions.. Solo referencia histórica..

## Comandos

- App nueva: `cd web && npm run dev|build|typecheck`
- Legacy(referencia): `cd legacy && npm start` → :4173

## Persistencia (Supabase)

- **`src/lib/db.ts`** crea el cliente Supabase si existen `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (env vars). Sin ellas, todas las rutas caen automáticamente al store en memoria (`src/lib/server-store.ts`) — dev/demo sin setup..
- **`src/lib/persistence.ts`** es la capa única de datos para rutas API: `createOrder` (inserta el pedido y luego descuenta inventario con el RPC atómico `decrement_stock`, borrando el pedido si no alcanza el stock), `restoreOrderStock` (repone al cancelar), `createQuote`, `subscribeNewsletter`, `getAllOrders`, `getOrdersForCustomer`, `getQuotes`.
- **`src/lib/stock.ts`** es la única puerta al inventario (`decrement_stock` / `increment_stock` en Supabase; variantes del catálogo en memoria sin credenciales). **`src/lib/idempotency.ts`** implementa `Idempotency-Key` (`pintao_idempotency`) y la deduplicación de webhooks (`pintao_webhook_events`). Los pedidos y los pagos de Wompi aceptan esa clave: repetirla devuelve la misma respuesta.
- **`src/lib/auth.ts`** maneja sesiones y login: admin validado contra `pintao_admin_users` (PBKDF2-SHA256, 210k iteraciones, igual que la migración seed); sesiones en `pintao_sessions` con **`token_hash` = SHA-256 del token** (la cookie guarda el token en claro, la tabla sólo su hash) y `expires_at` con renovación deslizante. Sin Supabase usa los usuarios de `server-store.ts`; las cuentas demo sólo valen fuera de producción o con `PINTAO_ALLOW_DEMO_LOGIN=true`.
- **CSP**: vive en `src/middleware.ts` con **nonce por petición** (`script-src 'self' 'nonce-…' 'strict-dynamic'`). Esto obliga a render dinámico (`export const dynamic = "force-dynamic"` en `app/layout.tsx`): el nonce no existe en HTML pre-renderizado y las páginas estáticas quedaban sin hidratar. No mover la CSP de vuelta a `next.config.ts` sin leer `AUDIT.md` §6.1.
- Para aplicar migraciones: `supabase db push` (necesita credenciales locales) o ejecutar los `.sql` de `supabase/migrations/` en el SQL editor del dashboard..
- En producción, el stock leído desde la BD usa `getProductWithLiveStock` (aún no conectado a las páginas — ver `web/src/lib/persistence.ts`).

## Higiene del repo

- **`.next/` y `node_modules/` NO se commitean**: están en `.gitignore`)(raíz)y `web/.gitignore`. Si aparecen rastreados,, `git rm -r --cached .next` y commit sin borrarlos del disco.. Ver commit `65157bb` (añadió `.next` accidentalmente) como antecedente a evitar.

## Credenciales demo (desarrollo)

- Cliente `cliente@pintao.local` / `Cliente2026!`
- Admin `admin@pintao.local` / `Pintao2026!`

## Observaciones clave

- Tailwind v4: `@apply` no puede referenciar clases custom definidas en el mismo archivo (usar selectores combinados).
- El store en memoria (`web/src/lib/server-store.ts`) es la capa de desarrollo: **guarda de verdad** pedidos y cotizaciones (antes los descartaba y el historial salía vacío). El reemplazo por Supabase está documentado en `web/README.md` y `ARCHITECTURE.md`.
- Carrito (`web/src/components/cart-drawer.tsx`): los `color` de producto son nombres en español (no hex); usa `COLOR_SWATCH` para los chips de color. Microinteracciones Framer Motion respetan `prefers-reduced-motion`.
- **La tienda desplegada es `web/`** (Next.js). El Root Directory del proyecto en Vercel es `web/`. `legacy/` está archivada y **no** debe recibir mejoras: si algo hay que cambiar en la tienda, se cambia en `web/`. (Este párrafo decía lo contrario y contradecía al README; ver `AUDIT.md`.)

### Pricing unificado (web/)
- `web/src/lib/pricing.ts` es la ÚNICA fuente de verdad para precios: `computePricing()` calcula descuento por volumen + cupón + envío. Devuelve `{ subtotal, volumeDiscount, afterVolume, coupon, couponDiscount, afterCoupon, shipping, freeShipping, total }`.
- Cupones válidos: `PINTAO10` (10%) y `DROP01` (8%). Envío gratis desde `FREE_SHIPPING_THRESHOLD` (250.000 COP), tarifa plana `FLAT_SHIPPING_COP` (8.990).
- **Seguridad**: el checkout (`checkout-form.tsx`) envía solo `{customer, paymentMethod, items:[{productId,size,qty}], coupon}` al servidor. `POST /api/orders` valida con zod (`lib/validation.ts`) y RECALCULA todos los precios/totales server-side desde `products.ts` + `computePricing` — nunca confía en el cliente. Uso zod para validar deps.

## Verificación rápida del preview del carrito
- Precarga del carrito demo en localStorage: clave `pintao-cart` con `[{"productId":1,"size":"M","qty":12}]` para ver el descuento por volumen activo en el drawer.
