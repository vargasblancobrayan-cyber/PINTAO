# PINTAO — notas del repositorio

## Estructura actual

- **Raíz**: sitio legacy estático (HTML/CSS/JS) con `server.js` en Node plano y espejo en Supabase Edge Functions. Se conserva como referencia.
- **`web/`**: nueva aplicación premium (Next.js 15 + TS strict + Tailwind v4 + Framer Motion). Todo trabajo nuevo debe ir aquí.

## Comandos

- Legacy: `npm start` (raíz, `node server.js`) → :4173
- Nuevo: `cd web && npm run dev|build|typecheck`

## Credenciales demo (desarrollo)

- Cliente `cliente@pintao.local` / `Cliente2026!`
- Admin `admin@pintao.local` / `Pintao2026!`

## Observaciones clave

- Tailwind v4: `@apply` no puede referenciar clases custom definidas en el mismo archivo (usar selectores combinados).
- El store en memoria (`web/src/lib/server-store.ts`) es la capa única para rutas API; el reemplazo por Supabase está documentado en `web/README.md`.
- Carrito (`web/src/components/cart-drawer.tsx`): los `color` de producto son nombres en español (no hex); usa `COLOR_SWATCH` para los chips de color. Microinteracciones Framer Motion respetan `prefers-reduced-motion`.

## Verificación rápida del preview del carrito
- Precarga del carrito demo en localStorage: clave `pintao-cart` con `[{"productId":1,"size":"M","qty":12}]` para ver el descuento por volumen activo en el drawer.
