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
- El token de GitHub disponible en el sandbox fue solo-lectura para este repo (push/PR via API → 403). Para empujar cambios se requiere PAT con `contents:write` o rama local del usuario.
