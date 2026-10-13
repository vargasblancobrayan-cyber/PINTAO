# Testing — PINTAO

## Estado

- `npm run typecheck` (`tsc --noEmit`): **limpio**.
- `npm run build`: **exitoso** (Next 15.5.27, sin errores ni avisos de tipos).
- Verificación funcional end-to-end: **35/35 comprobaciones en verde** sobre el build de producción.
- Verificación de API sin navegador (`scripts/api-check.mjs`): **15/15 en verde** (stock, idempotencia,
  cancelación, CSRF). Ver más abajo.
- **Todavía no hay suite formal** (Vitest + Playwright Test). Está pendiente de autorización porque añade
  dependencias y scripts de CI (ver `TASKS.md`).

## Verificación end-to-end reproducible

`web/scripts/e2e-check.js` recorre los flujos críticos contra un servidor levantado y devuelve un informe
PASS/FAIL. No es un runner de tests: es la comprobación funcional que se ejecutó para validar esta iteración.

```bash
cd web
npm run build
# Las cuentas de demostración sólo funcionan fuera de producción o con este opt-in explícito:
PINTAO_ALLOW_DEMO_LOGIN=true npm start      # o: npm run dev

npx playwright-cli open                     # abre la sesión de navegador
npx playwright-cli run-code --filename=scripts/e2e-check.js
```

## Comprobación de API sin navegador (`scripts/api-check.mjs`)

Cubre lo que el recorrido en navegador no puede observar: el descuento real de inventario, la idempotencia de los
endpoints de escritura y la cancelación administrativa.

```bash
cd web
npm run build
PINTAO_ALLOW_DEMO_LOGIN=true npm start          # o: npm run dev
node scripts/api-check.mjs                      # PINTAO_BASE para apuntar a otro host
```

### Verificación adicional de correo (2026-10-13)

| Comprobación | Resultado |
|---|---|
| `GET /api/health` sin `RESEND_API_KEY` | `email: "disabled"` |
| Pedido con `RESEND_API_KEY` ausente | `201`, aviso `[email] RESEND_API_KEY no configurada: se omite «Recibimos tu pedido #…»` en el log |
| Pedido con `RESEND_API_KEY` inválida | `201` y `[email] Resend respondió 401: API key is invalid` (4 intentos); la compra no falla |
| `GET /api/health` con clave presente | `email: "resend"` |
| `scripts/api-check.mjs` con correo configurado (clave inválida) | 15/15 |

**No verificado:** la entrega real de un correo (requiere `RESEND_API_KEY` válida y un dominio verificado en
Resend; el dominio de pruebas sólo entrega al correo de la cuenta) y el formato visual en clientes de correo.

### Resultado de la última ejecución (2026-10-13, build de producción)

| # | Comprobación | Resultado |
|---|---|---|
| 1 | El catálogo responde y reporta inventario | PASS (`40 unidades`) |
| 2 | El pedido se registra (201) | PASS (`PNT-…`) |
| 3 | Vender descuenta inventario | PASS (`40 → 37`) |
| 4 | Repetir la `Idempotency-Key` devuelve el MISMO pedido | PASS (`PNT-MV78C7UC` = `PNT-MV78C7UC`) |
| 5 | La repetición no descuenta stock otra vez | PASS (`37 → 37`) |
| 6 | Sin `Idempotency-Key` el pedido se registra como siempre | PASS (id distinto) |
| 7 | Se puede comprar todo el inventario disponible | PASS |
| 8 | Comprar sin inventario se rechaza | PASS (`400` «Stock insuficiente. Solo 0 unidades…») |
| 9 | El rechazo no descuenta nada | PASS (`0 unidades`) |
| 10 | Login de administrador | PASS (`200`, rol `admin`) |
| 11 | Cancelar repone el stock (no lo descuenta) | PASS (`200 → 2 unidades`) |
| 12 | Cancelar dos veces no repone inventario dos veces | PASS (`unchanged: true`) |
| 13 | Reponer una cancelación vuelve a descontar el stock | PASS (`200 → 0 unidades`) |
| 14 | No se puede reponer un pedido no cancelado | PASS (`400`) |
| 15 | CSRF: un origen ajeno se rechaza | PASS (`403`) |

## Resultado de la última ejecución del recorrido en navegador (2026-10-12, build de producción)

| # | Comprobación | Resultado |
|---|---|---|
| 1 | Home hidrata (React monta el árbol) | PASS |
| 2 | Home: cinta superior con animación | PASS |
| 3 | Home: enlace de salto al contenido | PASS |
| 4 | Tienda: la búsqueda filtra al instante | PASS (`22 → 2`) |
| 5 | Tienda: la URL refleja el filtro | PASS (`?q=oversize`) |
| 6 | Tienda: botón de filtros móvil existe | PASS |
| 7 | Carrito: el drawer se abre al agregar | PASS |
| 8 | Carrito: progreso de descuento por volumen | PASS |
| 9 | Carrito: cupón válido se aplica | PASS |
| 10 | Carrito → checkout: el cupón se conserva | PASS (`Cupón PINTAO10`) |
| 11 | Comprar ahora: navega al checkout sin abrir el carrito encima | PASS |
| 12 | Checkout: avanza al paso 2 sin errores | PASS |
| 13 | Checkout: los datos del cliente sobreviven al cambiar de paso | PASS |
| 14 | Checkout: valida el correo antes de avanzar | PASS |
| 15 | Checkout: el pedido se registra | PASS (`PNT-…`) |
| 16 | Cuenta: sesión de cliente activa | PASS |
| 17 | Cuenta: el pedido aparece en el historial | PASS |
| 18 | Admin: el dashboard carga con sesión | PASS |
| 19 | Admin: inventario real (no el stub anterior) | PASS |
| 20 | Admin: inventario lista referencias | PASS |
| 21 | Admin: la vista de pedidos lista los pedidos | PASS |
| 22 | Admin: cambiar el estado de un pedido se persiste | PASS (`Enviado`) |
| 23 | Newsletter: un correo inválido NO reporta éxito | PASS |
| 24 | Newsletter: un correo válido confirma | PASS |
| 25 | Móvil: sin desbordamiento horizontal (390 px) | PASS |
| 26 | Móvil: «agregar rápido» visible sin hover | PASS |
| 27 | Móvil: el panel de filtros se despliega | PASS |
| 28 | Imágenes: ninguna rota en el catálogo | PASS |
| 29 | Accesibilidad: contraste AA del texto apagado | PASS (5,33:1) |
| 30 | Producto inexistente: no queda indexable (`noindex`) | PASS |
| 31 | Producto inexistente: muestra la página de no encontrado | PASS |
| 32 | Registro: el alta crea la sesión y abre `/cuenta` | PASS (`e2e-…@pintao.local`) |
| 33 | Registro: muestra el nombre registrado | PASS |
| 34 | Registro: un correo duplicado se rechaza (409) | PASS (`ya tiene una cuenta.`) |
| 35 | Registro: se puede entrar con la cuenta nueva | PASS |

Errores de consola en la ejecución: **2**, y ambos esperados (el `409` del correo duplicado que prueba la
comprobación 34 y el `400` del newsletter inválido de la comprobación 23).

### Comprobaciones de API (curl, sesión de administrador)

Además del recorrido en navegador se verificaron los endpoints de escritura, que dependen del módulo de autenticación
reescrito:

| Comprobación | Resultado |
|---|---|
| `GET /api/admin/orders`, `/quotes`, `/stats` con sesión de admin | 200 |
| `PATCH /api/admin/orders/:id` con `{ status }` (control del panel) | 200 y el estado se persiste |
| `PATCH /api/admin/orders/:id` **sin sesión** | 403 |
| `PUT /api/admin/products` **sin sesión** | 403 |
| `POST` con `Origin` ajeno (CSRF) | 403 |
| `POST /api/auth/register` (alta válida) | 201 + cookie de sesión y la sesión devuelve el nombre |
| `POST /api/auth/register` (correo repetido) | 409 `Ese correo ya tiene una cuenta.` |
| `POST /api/auth/register` (contraseña de 7 caracteres / correo malformado) | 400 con el mensaje del campo |
| `POST /api/auth/register` con `Origin` ajeno (CSRF) | 403 |
| `POST /api/auth/register` (6.ª llamada en un minuto) | 429 con `Retry-After: 60` |
| `POST /api/auth/register` **sin claves de Supabase en producción** | 503, sin cuenta efímera (esperado) |

### Antes de la intervención

Con el mismo navegador y el mismo build, la primera carga de `/tienda` registraba **25 errores de consola** (todos
de CSP) y la aplicación no respondía a ningún clic: el botón `CARRITO` no abría el drawer.

## Qué **no** se ha podido verificar

- **Flujo de pago real con Wompi**: sin `WOMPI_PUBLIC_KEY` y `WOMPI_INTEGRITY_SECRET` el endpoint responde 503 y el
  checkout lo informa correctamente. La corrección de que una transacción recién creada **no** marque el pedido como
  pagado está revisada en código, pero debe probarse en sandbox.
- **Persistencia en Supabase** (pedidos, stock atómico, `decrement_stock`, `increment_stock`, RLS): requiere
  credenciales. El modo demo en memoria sí está verificado, incluido el descuento y la reposición de stock.
- **Migración `202610130001_idempotencia_stock_webhooks.sql`**: escrita y revisada, **sin aplicar** (no hay Supabase
  en el entorno). El camino SQL (RPC atómico, tabla de idempotencia, dedupe de webhooks) no se ha ejecutado.
- **Webhook de Wompi**: sin `WOMPI_PUBLIC_KEY`/`WOMPI_INTEGRITY_SECRET` responde `503`; la deduplicación por
  `<transacción>:<estado>` está revisada en código pero no probada con eventos reales.
- **Concurrencia real** de la idempotencia (dos peticiones simultáneas con la misma clave → `409`): se verificó la
  repetición secuencial, no la carrera.
- **Login y alta de cliente contra `pintao_clients`** (PBKDF2-SHA256): implementado siguiendo el formato de
  `202608090001_seed_default_admin.sql`, pero sin ejecutar contra una base de datos real. Sólo se verificó el modo
  memoria (alta, sesión, nombre en `/cuenta`, duplicado 409 y nuevo login).
- **Acciones `cancel`/`restock`** de `/api/admin/orders/[id]`: ya **no** dependen de Supabase (funcionan también en
  modo memoria) y están cubiertas por `scripts/api-check.mjs` a nivel de API. Siguen **sin estar expuestas en la
  interfaz** del panel: hoy sólo se pueden invocar por `PATCH` directo.
- **Revisión visual humana**: el diseño se validó con métricas del DOM (desbordamiento, contraste, visibilidad de
  controles, existencia de secciones), no con un juicio estético. Falta una revisión a ojo.
- **Rendimiento bajo carga** (Lighthouse/Core Web Vitals): no se ejecutó una medición formal. Lo comprobado es que no
  hay scripts bloqueados, que las imágenes cargan, que los assets se cachean como inmutables y que el filtrado es
  inmediato.

## Próximos pasos sugeridos

1. Añadir Vitest para `lib/pricing`, `lib/format` y `lib/validation` (unidad, sin navegador).
2. Convertir este guion en una suite de Playwright Test con aserciones y CI.
3. Pruebas de integración para `POST /api/orders` (validación zod, recálculo de totales, stock insuficiente).
4. Pruebas de regresión del flujo de checkout con cada despliegue.
