# PINTAO — streetwear colombiano

Tienda multipágina de PINTAO con portada, catálogo por colecciones, búsqueda, fichas de producto, carrito, checkout, cuenta de comprador, venta por volumen y administración protegida.

**Nuevo frontend premium:** una aplicación Next.js 15 + TypeScript + Tailwind v4 + Framer Motion en [`web/`](web/README.md). La tienda legacy sigue en la raíz para referencia.

## Producción

- Tienda pública: `https://pintao-store.vercel.app`
- Hosting estático y HTTPS: Vercel
- Inventario, clientes, pedidos y sesiones: Supabase
- Costo inicial de infraestructura: plan gratuito

La configuración de producción está en `vercel.json`. La API pública se ejecuta en la función `store-api` y las tablas bloquean el acceso directo desde el navegador mediante RLS.

## Iniciar

```bash
npm start
```

Abrir `http://127.0.0.1:4173/`.

## Rutas principales

- `/` tienda del comprador
- `/catalogo` catálogo y búsqueda
- `/producto/1` detalle de producto
- `/checkout` confirmación del pedido
- `/cuenta` acceso e historial del comprador
- `/acceso` acceso unificado (cliente y administrador)
- `/informacion` envíos, cambios y privacidad
- `/admin/login` acceso administrativo

## Administración local

En desarrollo, si no se definen variables de entorno:

- Correo: `admin@pintao.local`
- Contraseña: `Pintao2026!`

Para otro entorno, copiar `.env.example` y definir `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el proceso antes de iniciar. El panel y sus API requieren una sesión administrativa.

## Cuentas de demostración

El repositorio incluye dos cuentas listas para probar el flujo completo:

| Rol | Correo | Contraseña | Dónde iniciar sesión |
|---|---|---|---|
| Administrador | `admin@pintao.local` | `Pintao2026!` | `/admin/login` |
| Cliente | `cliente@pintao.local` | `Cliente2026!` | `/cuenta` |

- El cliente demo (`Cliente Demo PINTAO`, tipo Empresa) está sembrado en `data/store.json`.
- El administrador en desarrollo se resuelve desde `ADMIN_EMAIL`/`ADMIN_PASSWORD` (valores por defecto arriba). En producción, la migración `supabase/migrations/202608090001_seed_default_admin.sql` siembra el mismo administrador en `pintao_admin_users` con hash PBKDF2-SHA256 a 210000 iteraciones.
- **Cámbialas antes de un lanzamiento real** rotando el hash desde un proceso seguro.

## Alcance del pago

El checkout registra solicitudes pendientes de confirmación. No simula un cobro. Para cobrar en producción se debe integrar una pasarela y validar sus notificaciones en el servidor.
