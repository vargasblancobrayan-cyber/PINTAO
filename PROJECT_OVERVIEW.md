# PINTAO — Project Overview

## What it is

PINTAO is a streetwear e-commerce for Colombia, built with Next.js 15.3 + TypeScript strict, TailwindCSS 4, Framer Motion, and Supabase. It runs on Vercel with a store-in-memory fallback for local demo without external services.

- **Commerce flow**: `/tienda` → `/producto/:id` → `/checkout` → pending confirmation (asesor validates inventory and payment before dispatch).
- **Pricing**: volume discounts (12/24/48 units), coupons PINTAO10 / DROP01, shipping thresholds.
- **Auth**: admin users in `pintao_admin_users` (PBKDF2-SHA256 210k iterations); sessions in `pintao_sessions` keyed by `token_hash` = SHA-256 of the cookie token. Without Supabase it falls back to the in-memory demo users (development only).
- **Payment**: Wompi integrated but needs live credentials to charge. Creating a transaction returns a payment link and leaves the order `PENDING`; only the signed webhook can mark it paid.
- **Rendering**: every route is rendered dynamically because the per-request CSP nonce cannot be embedded in pre-rendered HTML (see `AUDIT.md` §6.1 for the trade-off and the static alternative).
- **Verification**: `web/scripts/e2e-check.js` (31 checks, all green on the production build) — see `TESTING.md`.

## Main routes

- `/` — home (hero, categories, featured products, manifest, services)
- `/tienda` — full catalog with filters, search, sort
- `/producto/:id` — product detail with gallery, sizes, stock
- `/checkout` — two-step checkout
- `/cuenta` — customer account (login required)
- `/acceso` — unified login (customer/admin)
- `/informacion` — shipping, returns, privacy
- `/admin` — admin dashboard (login required)

## Tech stack

- Next.js 15.3.8 (App Router, RSC)
- TypeScript strict
- TailwindCSS 4 (`@tailwindcss/postcss`)
- Framer Motion 12
- @supabase/supabase-js + @supabase/ssr
- Zod (validation)
- Wompi (payments, roadmap)

## How to run

```bash
cd web
npm install
npm run dev        # development
npm run build      # production build
npm run typecheck  # typecheck
```

Environment variables (Vercel):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `WOMPI_SECRET_KEY`, `WOMPI_ACCEPTANCE_TOKEN`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (dev only)

## Demo credentials

- Admin: `admin@pintao.local` / `Pintao2026!`
- Customer demo: `cliente@pintao.local` / `Cliente2026!` (memory store only)
