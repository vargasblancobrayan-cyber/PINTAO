# PINTAO — aplicación web

Next.js 15 (App Router) + TypeScript strict + Tailwind v4 + Framer Motion. Esta carpeta es la aplicación única y
desplegada; `../legacy/` es sólo referencia histórica.

## Arrancar

```bash
npm install
npm run dev          # http://127.0.0.1:3000
```

Otros comandos: `npm run build`, `npm start`, `npm run typecheck`.

## Modos de ejecución

| Modo | Requisitos | Qué cambia |
|---|---|---|
| **Demo (por defecto)** | ninguno | Sin `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, la persistencia y las sesiones usan el store en memoria de `src/lib/server-store.ts`. Sirve para recorrer todo el flujo sin servicios externos. |
| **Supabase** | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Pedidos, sesiones y administradores contra Postgres (migraciones en `../supabase/migrations`). |
| **Wompi** | `WOMPI_PUBLIC_KEY` + `WOMPI_INTEGRITY_SECRET` | El checkout puede generar enlaces de pago reales; el webhook firmado confirma el pago. |

Copia `.env.example` a `.env.local` y rellena lo que tengas.

### Cuentas de demostración

Sólo funcionan en modo demo y **fuera de producción** (con `npm start` hace falta `PINTAO_ALLOW_DEMO_LOGIN=true`):

- Cliente: `cliente@pintao.local` / `Cliente2026!`
- Administrador: `admin@pintao.local` / `Pintao2026!`

En un despliegue real define `ADMIN_EMAIL`/`ADMIN_PASSWORD` o usa Supabase. El acceso de **clientes** todavía no tiene
almacén de contraseñas real (ver `../AUDIT.md` §6.2).

## Notas de implementación

- **CSP**: `src/middleware.ts` emite un nonce por petición. Por eso todo el árbol es `force-dynamic`
  (`src/app/layout.tsx`). No muevas la CSP a `next.config.ts` sin leer `../AUDIT.md` §6.1.
- **Seguridad de headers**: `src/lib/security-headers.ts` aplica HSTS, `X-Frame-Options`, `nosniff`, etc. y el cacheo
  correcto de assets (los chunks con hash son inmutables).
- **Precios**: `src/lib/pricing.ts` es la única fuente de verdad; el servidor recalcula todo en `POST /api/orders`.
- **Persistencia**: `src/lib/persistence.ts` es la capa única (Postgres ↔ memoria) y siempre se usa desde las rutas API.
- **Catálogo**: `src/lib/products.ts` es la fuente en memoria que sirve la tienda y también edita el panel admin
  (`src/lib/admin-products.ts`).

## Verificación

`scripts/e2e-check.js` recorre los flujos críticos contra un servidor levantado. Instrucciones y último resultado en
[`../TESTING.md`](../TESTING.md).

`scripts/check-supabase.ts` y `scripts/check-wompi.ts` validan credenciales cuando las tengas configuradas.
