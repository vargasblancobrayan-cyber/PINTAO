# PINTAO — notas del repositorio

## Estructura actual

- **`web/`**: aplicación Next.js 15 + TS strict + Tailwind v4 + Framer Motion. **Todo trabajo nuevo debe ir aquí**. Es la app que se desplegaen Vercel (`vercel.json` con `rootDirectory: web`)).
- **`legacy/`**: sitio legacy estático (HTML/CSS/JS) con `server.js` en Node plano y espejo en Supabase Edge Functions.. Solo referencia histórica..

## Comandos

- App nueva: `cd web && npm run dev|build|typecheck`
- Legacy(referencia): `cd legacy && npm start` → :4173

## Higiene del repo

- **`.next/` y `node_modules/` NO se commitean**: están en `.gitignore`)(raíz)y `web/.gitignore`. Si aparecen rastreados,, `git rm -r --cached .next` y commit sin borrarlos del disco.. Ver commit `65157bb` (añadió `.next` accidentalmente) como antecedente a evitar.

## Credenciales demo (desarrollo)

- Cliente `cliente@pintao.local` / `Cliente2026!`
- Admin `admin@pintao.local` / `Pintao2026!`

## Observaciones clave

- Tailwind v4: `@apply` no puede referenciar clases custom definidas en el mismo archivo (usar selectores combinados).
- El store en memoria (`web/src/lib/server-store.ts`) es la capa única para rutas API; el reemplazo por Supabase está documentado en `web/README.md`.
- Carrito (`web/src/components/cart-drawer.tsx`): los `color` de producto son nombres en español (no hex); usa `COLOR_SWATCH` para los chips de color. Microinteracciones Framer Motion respetan `prefers-reduced-motion`.
- La tienda DESPLEGADA en Vercel es la **legacy** (raíz: `index.html` + `shop.js` + `shop.css` + `premium.css`), no `web/`. Mejoras visibles del carrito van en el inject de `shop.js` (markup `cart-drawer`) + estilos aditivos en `premium.css` (tokens `--p-*`). Expuesto en `window.Punto` (`Punto.add`, `Punto.money`, etc.) y el `cart` se lee de `localStorage['pintao-cart']`.

### Pricing unificado (web/)
- `web/src/lib/pricing.ts` es la ÚNICA fuente de verdad para precios: `computePricing()` calcula descuento por volumen + cupón + envío. Devuelve `{ subtotal, volumeDiscount, afterVolume, coupon, couponDiscount, afterCoupon, shipping, freeShipping, total }`.
- Cupones válidos: `PINTAO10` (10%) y `DROP01` (8%). Envío gratis desde `FREE_SHIPPING_THRESHOLD` (250.000 COP), tarifa plana `FLAT_SHIPPING_COP` (8.990).
- **Seguridad**: el checkout (`checkout-form.tsx`) envía solo `{customer, paymentMethod, items:[{productId,size,qty}], coupon}` al servidor. `POST /api/orders` valida con zod (`lib/validation.ts`) y RECALCULA todos los precios/totales server-side desde `products.ts` + `computePricing` — nunca confía en el cliente. Uso zod para validar deps.

## Verificación rápida del preview del carrito
- Precarga del carrito demo en localStorage: clave `pintao-cart` con `[{"productId":1,"size":"M","qty":12}]` para ver el descuento por volumen activo en el drawer.
