# Changelog — PINTAO

## [0.2.0] — 2026-10-12 (auditoría y transformación de `web/`)

### Corregido (bloqueantes)

- **La CSP bloqueaba todo el JavaScript**: `script-src 'self' 'strict-dynamic'` sin nonce impedía ejecutar los chunks
  de Next y su bootstrap inline, así que la aplicación no hidrataba (25 errores de consola, carrito y formularios
  muertos). Ahora la CSP se emite por petición con nonce desde `src/middleware.ts`.
- **El checkout no podía completarse**: el formulario se remontaba por paso y el paso 2 leía `FormData` de un
  formulario sin campos de cliente. El estado del cliente vive ahora en React y sobrevive al cambio de paso.
- **El login devolvía 500 sin Supabase** y las cuentas demo del README no funcionaban. `lib/auth.ts` tiene fallback
  en memoria, PBKDF2 real para administradores y devuelve el rol (antes un admin acababa en el panel de cliente).
- **Los pedidos y cotizaciones se descartaban en modo demo**: el historial de `/cuenta` y el panel `/admin` salían
  siempre vacíos. El fallback en memoria ahora persiste y lee.
- **Sesiones incompatibles con el esquema**: se consultaba una columna `token` inexistente (es `token_hash`); en
  producción ninguna sesión se habría resuelto.
- **Imagen de producto 404** (Polo Essential Blanco) y `favicon.ico` inexistente.
- **`/api/payments/wompi/create` marcaba el pedido como «Pagado» al crear la transacción**, sin pago. Sólo el webhook
  con firma verificada puede aprobar un pago.
- **Los botones de cambio de estado del panel admin no funcionaban**: la UI enviaba `{ status }` y la ruta sólo
  entendía `{ action }` (`400 "action desconocido"`); además exigía Supabase. Ahora la ruta valida el estado contra
  los cinco estados del panel y persiste con o sin base de datos.
- `findPaymentAttempt` fabricaba un intento `APPROVED` en memoria y bloqueaba el pago en línea.
- Eliminado el intento de escribir una cookie `HttpOnly` desde JavaScript en el formulario de acceso (no protegía
  nada y era código muerto).
- Añadido límite de intentos de login (8/minuto por IP).
- El `Cache-Control: no-store` global impedía cachear los chunks con hash; ahora los assets son inmutables.
- Eliminados `src/types/next.d.ts` y `src/app/types/next-server.d.ts`, que suplantaban los tipos oficiales de
  `next/server`.

### Añadido

- CSP con nonce por petición (`src/middleware.ts`) y cabeceras de seguridad sin duplicar `vercel.json`.
- `loading.tsx` y `error.tsx` de ruta dentro de la identidad de la marca.
- Enlace «saltar al contenido», estilos `:focus-visible` consistentes y red de seguridad para
  `prefers-reduced-motion`.
- Cinta superior animada, barra de progreso de lectura y menú móvil con transición y cierre con `Escape`.
- Panel de filtros en móvil, chips de filtros activos y estado sincronizado con la URL en `/tienda`.
- Inventario real en la pestaña «PRODUCTOS» del panel admin (precio, stock, publicar/ocultar, baja) contra la API
  existente y sobre el mismo catálogo que sirve la tienda.
- **Cuentas de cliente reales**: tabla `pintao_clients` (migración `202610120001_clients_credentials.sql`, PBKDF2-SHA256
  a 210 000 iteraciones, RLS denegado a `anon`/`authenticated`), `POST /api/auth/register` y alta en `/acceso` con
  correo único, contraseña mínima de 8 caracteres, CSRF y 5 altas/minuto por IP.
- `web/scripts/e2e-check.js`: verificación end-to-end reproducible (35 comprobaciones).
- `AUDIT.md` con la auditoría completa, evidencias, decisiones pendientes de autorización y limitaciones.

### Cambiado

- El filtrado de `/tienda` es inmediato (se eliminó el retardo artificial de 280 ms y el skeleton falso).
- El cupón vive en el contexto del carrito: se conserva entre carrito y checkout.
- `--color-mute` pasa de #6f6a5f a #8a8478 para cumplir contraste AA en textos de 10-12 px.
- La pestaña de producto respeta el stock al elegir cantidad y «comprar ahora» no abre el carrito sobre el checkout.
- `/cuenta` usa `next/image` y los favoritos del contexto compartido (antes `<img>` y `localStorage` desincronizado).
- Copy del checkout alineada con la funcionalidad real (sin «recargo» inexistente en contraentrega).
- **Render dinámico en todo el árbol** (`app/layout.tsx`): la CSP con nonce no es compatible con HTML pre-renderizado.
  Se pierde el pre-render estático de la home y de las fichas de producto. Ver `AUDIT.md` §6 para la alternativa.

### Notas de seguridad

- Las cuentas de demostración sólo se aceptan fuera de producción o con `PINTAO_ALLOW_DEMO_LOGIN=true`;
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` tienen prioridad. Ese mismo opt-in habilita el alta en memoria fuera de Vercel:
  en el despliegue real sin claves de Supabase **no se crea ninguna cuenta efímera** (503).
- El alta de cliente y el login limitan intentos por IP (5/min y 8/min) y sólo aceptan peticiones de origen propio.
- Sigue pendiente evaluar `npm audit fix --force` (migración a Next 16, *breaking*).

## [0.1.0] — 2026-08-30 (desarrollo)

- Aplicación reescrita en `web/` (Next.js 15.3 + TS + Tailwind v4 + Framer Motion).
- Catálogo estático con 22 prendas y variantes por talla.
- Checkout en dos pasos (datos+envío → pago), con descuentos por volumen.
- Tienda con filtros, búsqueda, orden y detalle de producto.
- Panel de cuenta, acceso, panel administrativo.
- API REST: `/api/products`, `/api/orders`, `/api/auth`, `/api/health`, `/api/newsletter`, `/api/payments/wompi`.
- Persistencia: migraciones de Supabase + store en memoria para demo.
- Validación Zod y recálculo server-side de precios.

### Notas de seguridad

- `postcss <=8.5.22` vulnerable (high) en el árbol de dependencias de Next.js.
- `sharp` actualizado a 0.35.5.
