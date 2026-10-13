# Changelog — PINTAO

## [0.3.0] — 2026-10-13 (cierre operativo: stock, idempotencia y webhooks)

La iteración anterior dejó la aplicación funcionando; esta cierra los huecos que sólo aparecen con tráfico real:
**vender no bajaba el inventario**, un reintento creaba pedidos duplicados y un reintento de Wompi volvía a
«aprobar» el pago.

### Corregido

- **Vender no descontaba stock.** El RPC atómico `decrement_stock` existía desde `202608290001` pero ningún endpoint
  lo llamaba (`AUDIT.md` §6.4): se podía vender la misma unidad tantas veces como clientes la pidieran. Ahora
  `createOrder` descuenta inventario con ese RPC (o sobre el catálogo en memoria sin Supabase) y, si el descuento
  falla, **borra el pedido ya insertado** para no dejar una venta sin inventario. El rechazo por inventario
  responde `409` con un mensaje accionable.
- **Cancelar un pedido volvía a descontar stock.** `PATCH /api/admin/orders/[id]` con `action: "cancel"` llamaba a
  `decrement_stock` (¡el movimiento inverso!) y además exigía Supabase (503 en demo). Ahora cancela y **repone**
  inventario con `lib/stock.ts`, funciona con y sin base de datos y es idempotente: cancelar dos veces no devuelve
  el stock dos veces, y sólo un pedido cancelado puede reponerse (`action: "restock"`).
- **`refund_stock` (202608300005) nunca reponía nada**: apuntaba a `pintao_store.data -> 'variants'` cuando las
  variantes viven en `data -> 'products'[i] -> 'variants'`. Se sustituye por `increment_stock`, construida sobre la
  estructura real.
- **El `CHECK` de `pintao_payment_attempts.result` no admitía `PENDING`**, que es justo el estado que escribe
  `createPaymentAttempt()` al crear una transacción de Wompi: cada intento de pago en línea fallaba el `insert` en
  silencio. Se amplía el `CHECK`.
- **`pintao_stock_movements` no tenía RLS ni permisos**: la tabla de auditoría de inventario quedaba expuesta/inútil.

### Añadido

- **Idempotencia de endpoints de escritura** (`lib/idempotency.ts`, tabla `pintao_idempotency`):
  `POST /api/orders` y `POST /api/payments/wompi/create` aceptan `Idempotency-Key`. Repetir la clave devuelve la
  misma respuesta (el mismo pedido, el mismo enlace de pago) en lugar de duplicar; dos peticiones simultáneas con la
  misma clave reciben `409`. Sólo se memorizan las respuestas `2xx`, para que un error corregible no quede pegado.
- **Webhook de Wompi idempotente** (`pintao_webhook_events`): cada evento se registra por `<transacción>:<estado>` y
  un reintento del proveedor responde `200 { duplicate: true }` sin volver a aplicar el cobro.
- `lib/stock.ts`: única puerta al inventario (descuento, reposición, siembra de `pintao_store` cuando el catálogo
  remoto no tiene variantes y registro de movimientos).
- Migración `202610130001_idempotencia_stock_webhooks.sql` (tablas nuevas, `increment_stock`, permisos y el `CHECK`
  corregido).
- `web/scripts/api-check.mjs`: comprobación de API reproducible (**15/15 en verde** sobre el build de producción).
- El checkout envía `Idempotency-Key` por intento de compra y la reutiliza si el navegador reintenta.

### Verificado

- `npm run typecheck` limpio y `npm run build` correcto (Next 15.5.27).
- `scripts/api-check.mjs` 15/15: descuento de stock, repetición idempotente (mismo id, sin segundo descuento),
  rechazo por inventario agotado, cancelación que repone, idempotencia de la cancelación, reponer una cancelación y
  CSRF. Detalle en `TESTING.md`.

### Limitaciones (sin resolver en esta iteración)

- La migración `202610130001` **no está aplicada**: sin Supabase en el entorno se verificó el modo memoria.
- El catálogo se sigue sirviendo desde `lib/products.ts`, así que en modo Supabase la ficha puede mostrar stock ya
  agotado; el pedido se rechaza igualmente al confirmar (el RPC es la autoridad).
- No hay reintento automático ni emails transaccionales (siguiente iteración).

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
