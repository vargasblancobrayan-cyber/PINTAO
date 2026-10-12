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
- Por seguridad, las cuentas demo **sólo funcionan fuera de producción**. Si pruebas el build de producción en local
  (`npm start`), habilítalas con `PINTAO_ALLOW_DEMO_LOGIN=true`. En un despliegue real define `ADMIN_EMAIL` y
  `ADMIN_PASSWORD` (tienen prioridad) o usa Supabase. El acceso de **clientes** todavía no tiene almacén de
  contraseñas: sólo existe con usuarios demo.

## Alcance del pago

El checkout registra la solicitud del pedido en estado «Pendiente de confirmación». Si el comprador elige «Enlace de
pago» o «PSE», la app pide a Wompi un enlace de pago real (`POST /api/payments/wompi/create`) y lo muestra en la
confirmación. **Sólo el webhook firmado de Wompi puede marcar un pedido como pagado**; crear la transacción no lo
hace. Sin `WOMPI_PUBLIC_KEY`/`WOMPI_INTEGRITY_SECRET` el endpoint responde 503 y el checkout avisa al comprador.

## Estado del proyecto

- Auditoría de esta iteración, con evidencias y decisiones pendientes de autorización: [`AUDIT.md`](AUDIT.md).
- Informe de pruebas y cómo reproducirlas: [`TESTING.md`](TESTING.md).

