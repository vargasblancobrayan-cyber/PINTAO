# PINTAO Web — Frontend premium (Next.js)

Rediseño del storefront de PINTAO con arquitectura nivel producción.

## Stack

- **Next.js 15** (App Router) + **TypeScript strict**
- **Tailwind CSS v4** con sistema de tokens propios (`@theme` en `globals.css`)
- **Framer Motion** para microinteracciones (respetan `prefers-reduced-motion`)
- API Routes tipadas con store en memoria (desarrollo); puente documentado hacia Supabase
- Vercel-ready (`npm start` sirve el build; `web/` es subcarpeta del repo)

## Estructura

```
web/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # Fuentes + Providers + Header/Footer/Drawer
│  │  ├─ globals.css             # Design tokens "PINTAO Noir"
│  │  ├─ page.tsx                # Home (hero, colecciones, destacados, manifiesto)
│  │  ├─ tienda/page.tsx         # Catálogo con filtros dinámicos client-side
│  │  ├─ producto/[id]/page.tsx  # Ficha + recomendaciones por reglas
│  │  ├─ checkout/page.tsx       # Formulario + resumen del pedido
│  │  ├─ acceso/page.tsx         # Login unificado (cliente/admin)
│  │  ├─ cuenta/page.tsx         # Panel del comprador
│  │  ├─ informacion/page.tsx    # Envíos / cambios / privacidad
│  │  ├─ admin/                  # Dashboard (stats, pedidos, cotizaciones)
│  │  ├─ admin/login/            # Acceso administrativo
│  │  └─ api/                    # health, products, auth, orders, quotes, admin/stats
│  ├─ lib/
│  │  ├─ products.ts             # 22 productos tipados, variantes y SKUs
│  │  ├─ types.ts                # Tipos del dominio
│  │  ├─ format.ts               # COP, slugify, descuento por volumen
│  │  ├─ recommendations.ts      # Motor por reglas ("completa tu pinta")
│  │  └─ server-store.ts         # store demo en memoria (swapable por Supabase)
│  └─ components/                # design system reusable
```

## Comandos

```bash
npm install
npm run dev    # http://127.0.0.1:3000
npm run build  # verificación de tipos + compilación
npm run typecheck
```

## Credenciales demo

| Rol | Correo | Contraseña |
|---|---|---|
| Cliente | `cliente@pintao.local` | `Cliente2026!` |
| Admin | `admin@pintao.local` | `Pintao2026!` |

## Puente a Supabase

`src/lib/server-store.ts` expone la misma interfaz que las rutas API consumen.
Para producción, reemplaza esa única capa por el cliente Supabase (Postgres)
conservando los tipos de `src/lib/types.ts`.
