# Architecture — PINTAO

## Overview

PINTAO is a streetwear e-commerce for Colombia, built with Next.js 15.3 + TypeScript strict, TailwindCSS 4, Framer Motion 12, and Supabase (for persistence and auth). It runs server-rendered on Vercel, with a store-in-memory fallback for local demo without external services.

## Layers

```
web/
├── app/                     # Next.js App Router pages + API routes
│   ├── api/                 # REST API endpoints
│   ├── tienda/              # Product catalog page
│   ├── producto/[id]/       # Product detail page
│   ├── checkout/            # Two-step checkout flow
│   ├── cuenta/              # Customer account panel
│   ├── acceso/              # Login / admin login
│   ├── admin/               # Admin dashboard
│   └── informacion/         # Shipping / returns / privacy
├── components/              # React UI components
│   ├── providers/           # Cart / favorites context
│   ├── product-card.tsx, product-detail.tsx
│   ├── checkout-form.tsx    # Two-step checkout
│   ├── cart-drawer.tsx      # Drawer with coupon + volume discount
│   ├── site-header.tsx, site-footer.tsx
│   └── storefront.tsx
├── lib/                     # Business logic and data
│   ├── db.ts                # Supabase client (server)
│   ├── server-store.ts      # Memory store for demo
│   ├── persistence.ts       # Unified data layer (DB + memory)
│   ├── products.ts          # Product catalogue (22 items)
│   ├── pricing.ts           # Pricing engine (volume + coupon + shipping)
│   ├── format.ts            # Currency (COP) and slug helpers
│   ├── validation.ts        # Zod schemas (order input)
│   ├── auth.ts              # Session logic and login
│   ├── wompi.ts             # Wompi payment integration (roadmap)
│   ├── recommendations.ts   # Recommendations engine
│   └── rate-limit.ts        # In-memory rate limiting
├── app/api/                 # REST endpoints
│   ├── products/            # GET catalog
│   ├── products/[id]/       # GET single product
│   ├── orders/              # POST create / GET list (auth)
│   ├── orders/[id]/         # GET detail (auth)
│   ├── auth/session         # GET current user
│   ├── auth/login           # POST login
│   ├── health               # GET health
│   ├── newsletter           # POST subscribe
│   └── payments/wompi/      # POST create / webhook
├── types/                   # TypeScript declarations
└── lib/                     # (duplicated, see lib/)
```

## Data flow

1. **Client** → fetch `/api/orders` (with session cookie) → **API route** → **persistence layer** → **DB or memory store**.
2. **Pricing**: `checkout-form.tsx` computes a local preview; `POST /api/orders` recalculates server-side from `products.ts + computePricing` and only trusts it after zod validation.
3. **Payment**: `POST /api/payments/wompi/create` returns a payment link. The server marks the order as `APPROVED` and updates status. Wompi webhook closes the loop.
4. **Auth**: session stored as an `HttpOnly` cookie `pintao_session`. Admin validated against `pintao_admin_users`; customers validated against the memory demo users.

## Persistence decisions

- **Supabase** is the target for production. All writes go through `lib/persistence.ts`, which falls back to an in-memory store when `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are absent. The in-memory fallback **actually stores and reads** orders and quotes (it used to accept writes and drop them, leaving `/cuenta` and `/admin` permanently empty).
- **Admin catalog edits** (`lib/admin-products.ts`) operate on the same array the storefront serves, so changes are visible immediately within the process; persistence beyond a restart requires the `pintao_store` table.
- Stock is **not** decremented on order creation yet: migrations define the `decrement_stock` RPC but `createOrder` never calls it (pending decision, see `AUDIT.md` §6.4).
- **Migrations** live in `supabase/migrations/` and use only the `service_role` key; the `anon` key is denied on the tables via RLS.
- **Enum-backed status field**: `status` uses strings (`Pendiente de confirmación`, `Pagado`, `Enviado`, `Completado`, `Cancelado`). It is not `check` constrained in Postgres so legacy data and IDs are more flexible.

## Rendering

- **All routes render dynamically** (`export const dynamic = "force-dynamic"` in `app/layout.tsx`).
  The per-request CSP nonce cannot be injected into pre-rendered HTML, so React never hydrated on statically
  generated pages (the page rendered but the cart, filters and forms were inert). Trade-off documented in
  `AUDIT.md` §6.1; the alternative is static HTML with `script-src 'self' 'unsafe-inline'`.
- Product data is local and in-memory, so per-request rendering is cheap; static `next/image` assets keep the
  immutable long-term caching.

## Request pipeline

```
request → src/middleware.ts (nonce + CSP) → route handler / RSC render → Response
```

`src/middleware.ts` generates the nonce, sets the `Content-Security-Policy` header on **both** the request and the
response, and skips static assets/images (`_next/static`, `_next/image`, `icon.svg`, media extensions).

## Auth contract

- Cookie `pintao_session` holds a random 32-byte hex token; `pintao_sessions` stores `token_hash = sha256(token)`
  with `expires_at` (sliding renewal).
- Admin passwords: PBKDF2-SHA256 (hex salt, 210 000 iterations), constant-time comparison.
- Without Supabase credentials the module falls back to the in-memory users in `lib/server-store.ts`
  (development only; gated behind `PINTAO_ALLOW_DEMO_LOGIN` when `NODE_ENV=production`).

## Security

- CSP with a per-request nonce (`src/middleware.ts`); `script-src 'self' 'nonce-…' 'strict-dynamic'`.
- Rate limiting: per-IP, in-memory, configured per endpoint (including login).
- CSRF: `assertSameOrigin` on write endpoints.
- Input validation: Zod on `POST /api/orders`; server recomputes totals.
- Security headers: HSTS, X-Frame-Options, nosniff, Permissions-Policy, Referrer-Policy.
- Payments: only the signed Wompi webhook can approve an order; creating a transaction leaves it `PENDING`.

## Observability

- No metrics pipeline yet. Only `GET /api/health` (os.health), targeted logs in `server-store.ts` and `rate-limit.ts`. The plan is Datadog/OpenTelemetry at an infra level (approved).

## Performance

- Images use `next/image` with remotePatterns for `images.unsplash.com`.
- Product catalog is static and cached at build time (`generateStaticParams`).
- Price calculations use integer arithmetic and no external calls per request.
