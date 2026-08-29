# PINTAO — streetwear colombiano

**Una sola tienda**: aplicación Next.js 15 + TypeScript + Tailwind v4 + Framer Motion **en `web/`**. Es la app única y definitiva que se desplegaen Vercel.

## Producción

- Tienda pública: `https://pintao-store.vercel.app`
- Hosting y HTTPS: Vercel (`vercel.json` con headers de seguridad; sin rewrites legacy)). El Root Directory del proyecto se configura en el dashboard de Vercel (`web/`)).
- Base de datos real (roadmap): Supabase — migraciones en [`supabase/`](supabase/)
- La tienda legacy (HTML/JS plano) está archivada en [`legacy/`](legacy/README.md) solo como referencia histórica.

## Iniciar

```bash
cd web
npm install
npm run dev
```

Abrir `http://127.0.0.1:3000/`.

## Comandos (dentro de `web/`)

- `npm run dev` — desarrollo
- `npm run build` — build de producción
- `npm run typecheck` — chequeo de tipos TypeScript

## Rutas principales (app única)

- `/` home con hero, colecciones y destacados
- `/tienda` catálogo con filtros, búsqueda y orden
- `/producto/1` ficha con galería, tallas y stock
- `/checkout` checkout por pasos (datos+envío → pago+confirmación)
- `/cuenta` panel del comprador (login requerido)
- `/acceso` acceso unificado (cliente y administrador)
- `/informacion` envíos, cambios y privacidad
- `/admin` dashboard administrativo (login requerido)
- `/admin/login` acceso administrativo

## Administración local

En desarrollo (sin variables de entorno):

- Correo: `admin@pintao.local`
- Contraseña: `Pintao2026!`

## Cuentas de demostración

El repositorio incluye dos cuentas listas para probar el flujo completo:

| Rol | Correo | Contraseña | Dónde iniciar sesión |
|---|---|---|---|
| Administrador | `admin@pintao.local` | `Pintao2026!` | `/admin/login` |
| Cliente | `cliente@pintao.local` | `Cliente2026!` | `/cuenta` |

- El cliente demo (`Cliente Demo PINTAO`) está sembrado en `src/lib/server-store.ts` (store en memoria de desarrollo).
- El administrador en desarrollo se resuelve desde `ADMIN_EMAIL`/`ADMIN_PASSWORD` (valores por defecto arriba). En producción, la migración `supabase/migrations/202608090001_seed_default_admin.sql` siembra el mismo administrador en `pintao_admin_users` con hash PBKDF2-SHA256 a 210000 iteraciones.
- **Cámbialas antes de un lanzamiento real** rotando el hash desde un proceso seguro.

## Alcance del pago

El checkout registra solicitudes pendientes de confirmación. No simula un cobro. Para cobrar en producción se debe integrar una pasarela y validar sus notificaciones en el servidor.
