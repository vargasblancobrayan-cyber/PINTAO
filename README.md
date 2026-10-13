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
- `node scripts/api-check.mjs` — verificación de API (stock, idempotencia, cancelación) contra un servidor levantado

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
  `ADMIN_PASSWORD` (tienen prioridad) o usa Supabase.
- **Cuentas de cliente**: cualquiera crea la suya en `/acceso` (enlace «Créala aquí»). La contraseña se guarda con
  PBKDF2-SHA256 en `pintao_clients` (migración `202610120001_clients_credentials.sql`), así que en el despliegue el
  alta y el login de cliente exigen `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; sin ellas el alta responde 503.

## Correo transaccional

El comprador recibe correo en cuatro momentos: **pedido recibido** (al registrar el pedido), **pago confirmado** (sólo
desde el webhook firmado de Wompi), **pedido enviado** y **pedido cancelado** (desde el panel). La tienda recibe
además un aviso de cada pedido nuevo.

Proveedor: [Resend](https://resend.com) (`POST https://api.resend.com/emails`, sin dependencias nuevas). Variables:

| Variable | Para qué | Obligatoria |
|---|---|---|
| `RESEND_API_KEY` | Enviar. Sin ella el correo se omite y queda un aviso en el log (el checkout nunca falla por correo) | Para enviar |
| `EMAIL_FROM` | Remitente verificado, p. ej. `"PINTAO <hola@pintao.co>"`. Por defecto el dominio de pruebas de Resend, que **sólo entrega al correo de la cuenta** | No |
| `ORDER_NOTIFICATION_EMAIL` | Buzón de la tienda para el aviso de pedido nuevo | No |
| `EMAIL_REPLY_TO` | `reply-to` de los correos salientes (por defecto el WhatsApp/documentación de la marca) | No |
| `SITE_URL` | Base de los enlaces del correo (por defecto `https://pintao-store.vercel.app`) | No |

`GET /api/health` informa de `email`, `storage` y `payments`, para detectar un despliegue sin claves antes que un
cliente.

## Inventario e idempotencia

- **El stock se descuenta al vender** y se repone al cancelar (`lib/stock.ts` → `decrement_stock` / `increment_stock`).
  Si el inventario no alcanza, el pedido responde 409 y no se crea. Requiere la migración
  `202610130001_idempotencia_stock_webhooks.sql`; sin Supabase el inventario vive en memoria del proceso (dev/demo).
- **Los pedidos y pagos son idempotentes**: el checkout envía `Idempotency-Key` y un reintento del navegador devuelve
  el mismo pedido (y el mismo enlace de pago) en lugar de duplicarlo.
- El **webhook de Wompi se deduplica** por `<transacción>:<estado>`: un reintento del proveedor no vuelve a aprobar
  el cobro.

## Alcance del pago

El checkout registra la solicitud del pedido en estado «Pendiente de confirmación». Si el comprador elige «Enlace de
pago» o «PSE», la app pide a Wompi un enlace de pago real (`POST /api/payments/wompi/create`) y lo muestra en la
confirmación. **Sólo el webhook firmado de Wompi puede marcar un pedido como pagado**; crear la transacción no lo
hace. Sin `WOMPI_PUBLIC_KEY`/`WOMPI_INTEGRITY_SECRET` el endpoint responde 503 y el checkout avisa al comprador.

## Estado del proyecto

- Auditoría de esta iteración, con evidencias y decisiones pendientes de autorización: [`AUDIT.md`](AUDIT.md).
- Informe de pruebas y cómo reproducirlas: [`TESTING.md`](TESTING.md).

