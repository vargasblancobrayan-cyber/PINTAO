# Auditoría y transformación — PINTAO `web/`

Fecha: 2026-10-12. Alcance: la aplicación de `web/` (Next.js 15.3 + TypeScript strict + Tailwind v4 + Framer Motion).
Entorno de verificación: Node 24.11, Windows, sin credenciales de Supabase ni de Wompi (modo demo), servidor de
producción (`npm run build && npm start`) y navegador Chromium vía `playwright-cli`.

Este documento es el registro de la auditoría: qué estaba roto, con qué evidencia, qué se corrigió y qué queda
abierto. No se declara nada como verificado si no se pudo ejecutar.

---

## 1. Bloqueantes (la aplicación no funcionaba)

| # | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| B1 | **La CSP bloqueaba todo el JavaScript.** `script-src 'self' 'strict-dynamic'` sin `nonce` ni hash: con `'strict-dynamic'` la allowlist por host se ignora, así que se bloqueaban los chunks de Next y su bootstrap inline. La app servía HTML pero **no hidrataba**. | 25 errores de consola `Loading the script ... violates ... Content-Security-Policy`; `CARRITO` no abría nada (`drawerOpen: false`) | **Corregido** — CSP con nonce por petición en `src/middleware.ts`. Verificado: 0 errores y el carrito abre |
| B2 | **El checkout no podía completarse.** El formulario se remontaba por paso (`<motion.form key={step}>`) y el paso 2 leía `FormData` de un formulario sin campos de cliente: `name` era `null` y zod rechazaba con «Nombre requerido». | Revisión de código + reproducción del flujo | **Corregido** — estado controlado en React que sobrevive al cambio de paso. Verificado en E2E |
| B3 | **El login devolvía 500.** `lib/auth.ts` lanzaba `Error: Supabase no está configurado` sin `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, así que las cuentas demo documentadas en el README no funcionaban y `/cuenta` y `/admin` quedaban inutilizables. | `POST /api/auth/login` → `HTTP 500` y stack en el log del servidor | **Corregido** — fallback en memoria + PBKDF2 real. Verificado: cliente y admin entran con su rol |
| B4 | **Los pedidos se descartaban en modo demo.** `persistence.ts` devolvía `ok: true` sin escribir en el store en memoria y `getAllOrders()`/`getOrdersForCustomer()` devolvían `[]`. El historial de `/cuenta` y el panel `/admin` salían siempre vacíos. | `/api/health` → `orders: 0` tras registrar pedidos | **Corregido** — el fallback en memoria guarda y lee de verdad. Verificado: `HISTORIAL DE PEDIDOS (1)` |
| B5 | **Sesiones incompatibles con el esquema.** `getSession()` consultaba `eq("token", …)` cuando la columna real es `token_hash` (`202607190001_create_pintao_store.sql`). En producción ninguna sesión se habría resuelto y todos los endpoints autenticados habrían dado 401/403. | Esquema vs código | **Corregido** — `token_hash = sha256(token)` + `expires_at > now()` + renovación deslizante |
| B6 | **La API de login no devolvía `role`**, y `auth-form.tsx` decide el destino con `user.role === "admin"`. Un administrador habría acabado siempre en el panel de cliente. | Código del route + formulario | **Corregido** — `role` en la respuesta |
| B7 | **Imagen de producto rota.** `photo-1625910513413-5fc45e7b3086` (Polo Essential Blanco) responde 404 en Unsplash; `next/image` fallaba con `upstream image response failed ... 404`. | `curl` sobre las 34 URLs: 1 de 34 caída; log de Next | **Corregido** — imagen válida verificada. E2E: «ninguna rota en el catálogo» |
| B8 | **`favicon.ico` 404** en todas las páginas. | Error de consola repetido | **Corregido** — `src/app/icon.svg` |

## 2. Seguridad y corrección financiera

| # | Hallazgo | Riesgo | Estado |
|---|---|---|---|
| S1 | **`/api/payments/wompi/create` marcaba el pedido como «Pagado» al crear la transacción** (`createPaymentAttempt(...,"APPROVED")` + `updateOrderPayment(...,"APPROVED")`). Daba por cobrado un pedido sin pago; bastaba llamar al endpoint con un `orderId` existente. | Alto (cobro/fraude) | **Corregido** — sólo se registra `PENDING`; el único punto que aprueba es el webhook con firma verificada. *No verificable sin claves de Wompi: revisar en sandbox* |
| S2 | **`findPaymentAttempt` fabricaba un intento `APPROVED`** para cualquier pedido en memoria, bloqueando el pago en línea con un falso «ya fue pagado». | Medio | **Corregido** — se deriva del estado real del pedido |
| S3 | **`auth-form.tsx` intentaba escribir una cookie `HttpOnly` desde JavaScript.** El navegador ignora `HttpOnly` en `document.cookie`: no protegía nada y (al no devolver la API ningún `refreshToken`) era código muerto que simulaba seguridad. | Medio (falsa sensación de seguridad) | **Eliminado** — la sesión la fija el servidor |
| S4 | **Sin límite de intentos de login** existiendo tabla `pintao_login_attempts`. | Medio (fuerza bruta) | **Corregido** — 8 intentos/minuto por IP en `/api/auth/login` |
| S5 | **Credenciales demo alcanzables en producción.** Con la documentación actual, `admin@pintao.local / Pintao2026!` era válido en cualquier despliegue sin Supabase. | Alto | **Corregido** — sólo fuera de producción o con `PINTAO_ALLOW_DEMO_LOGIN=true`; `ADMIN_EMAIL`/`ADMIN_PASSWORD` tienen prioridad |
| S6 | **`Cache-Control: no-store` en todas las rutas**, incluidos `/_next/static/*`: el navegador re-descargaba cada chunk en cada navegación. | Medio (rendimiento) | **Corregido** — cacheo inmutable para assets, sin `no-store` global |
| S7 | **`web/src/types/next.d.ts` y `web/src/app/types/next-server.d.ts`** suplantaban las declaraciones oficiales de `next/server` (de ahí la prohibición informal de usar `NextResponse` como valor). | Bajo (deuda técnica) | **Eliminados** — `tsc --noEmit` limpio con los tipos reales |

## 3. Experiencia de uso e interacción

| # | Hallazgo | Estado |
|---|---|---|
| U1 | La tienda **retrasaba cada filtro 280 ms** con un skeleton falso, así que escribir en el buscador se sentía roto sin motivo. | **Corregido** — filtrado inmediato (22 referencias). E2E: `22 → 2` al instante, URL sincronizada |
| U2 | Los filtros **no existían en móvil** (columna lateral oculta) y no había estado en la URL. | **Corregido** — panel plegable en móvil, chips de filtros activos, query string compartible |
| U3 | **El cupón no viajaba del carrito al checkout** (estado local en cada componente). | **Corregido** — cupón en el contexto del carrito. E2E: «Cupón PINTAO10» conservado |
| U4 | El cupón inválido en el checkout **no daba ninguna respuesta**. | **Corregido** — mensaje de error/éxito accesible |
| U5 | **«Comprar ahora» abría el carrito encima del checkout** recién cargado. | **Corregido** — `add(..., { openDrawer: false })`, verificado en E2E |
| U6 | El **skeleton de carga era artificial** (esperaba 280 ms) en vez de reflejar trabajo real. | **Corregido** — eliminado; hay `loading.tsx` de ruta con esqueleto real |
| U7 | El formulario de newsletter **mostraba «✓ Suscripto» aunque el servidor devolviera 400 o 429**. | **Corregido** — estados reales de carga/error/éxito. E2E verificado |
| U8 | Cantidad de producto **sin tope de stock** y sin ajuste al cambiar de talla; el temporizador de «Agregado» no se limpiaba. | **Corregido** |
| U9 | La pestaña **«PRODUCTOS» del panel admin era un texto de relleno** («Ver listado completo en la vista de productos») aunque la API (`GET/PUT/DELETE /api/admin/products`) ya existía. Además `admin-products.ts` editaba un `Map` paralelo que la tienda nunca leía. | **Corregido** — inventario real con precio, stock, publicar/ocultar y baja, sobre el mismo catálogo que sirve la tienda. E2E verificado |
| U10 | `/cuenta` usaba `<img>` (sin optimizar) y leía los favoritos de `localStorage` una sola vez, quedando desincronizados. | **Corregido** — `next/image` + contexto compartido |
| U11 | `«D+/ unidades mejoran el precio»` en el carrito: literal roto. | **Corregido** — `12+ unidades` |
| U12 | El carrito no se cerraba con `Escape` ni declaraba `aria-modal`. | **Corregido** |
| U13 | Copy del checkout prometía «recargo» en contraentrega que el motor de precios nunca aplica. | **Corregido** — copy ajustada a la funcionalidad real |
| U14 | El campo ETA de los métodos de envío existía en los datos pero no se mostraba. | **Corregido** — visible en cada opción |
| U15 | **Los botones de cambio de estado del panel admin no funcionaban**: la UI envía `{ status }` pero `PATCH /api/admin/orders/[id]` sólo entendía `{ action: "cancel" \| "restock" }`, así que respondía `400 "action desconocido"`. Además exigía Supabase (503 sin credenciales), mientras el resto del panel sí funcionaba. | **Corregido** — la ruta acepta y **valida** el estado (contra los 5 estados del panel), persiste vía `lib/persistence.ts` (funciona con y sin base de datos) y `GET` del detalle también cae al store en memoria. Verificado en E2E: el estado se persiste |

### Correcciones posteriores a la primera pasada de verificación

La verificación de los endpoints de escritura reveló U15 (arriba), que no aparecía en la revisión del código de la
interfaz. Todas las comprobaciones se repitieron después del arreglo: ver `TESTING.md`.

## 4. Accesibilidad

| # | Hallazgo | Estado |
|---|---|---|
| A1 | El botón de favorito estaba **dentro del `<Link>`** de la tarjeta (botón anidado en enlace: HTML inválido, foco impredecible). | **Corregido** — hermano del enlace con `z-10` |
| A2 | «Agregar rápido» **sólo aparecía con `group-hover`**: inalcanzable en táctil y con teclado. | **Corregido** — visible por defecto, se revela al hover sólo en escritorio y aparece con foco. E2E verificado en móvil |
| A3 | **Sin estilos de foco visibles** (`outline-none` en los campos) para navegación por teclado. | **Corregido** — anillo de foco consistente en `:focus-visible` |
| A4 | **Sin enlace «saltar al contenido»** y sin `id` en `<main>`. | **Corregido** |
| A5 | `--color-mute` (#6f6a5f) daba **~3,7:1 sobre negro** y se usa en textos de 10-12 px (mínimo AA: 4,5:1). | **Corregido** — #8a8478; medido en navegador ≥ 4,5:1 |
| A6 | Etiquetas de formulario **sin `htmlFor`/`id` únicos** en los filtros (se duplicaban al añadir el panel móvil). | **Corregido** — prefijos `d-`/`m-` |
| A7 | **Sin `prefers-reduced-motion`** global (sólo algunos componentes lo respetaban) y `scroll-behavior: smooth` sin excepción. | **Corregido** — red de seguridad CSS + `useReducedMotion` en los componentes animados |
| A8 | Errores de formulario sin `aria-invalid`/`aria-describedby` ni `role="alert"`. | **Corregido** en el checkout |

## 5. Producto y movimiento (mejoras añadidas)

- **Cinta superior real** (`ticker-track`): el contenedor tenía `overflow-hidden` pero ninguna animación. Ahora gira, se pausa al pasar el cursor y se detiene con `prefers-reduced-motion`.
- **Barra de progreso de lectura** en el header (rAF-throttled, un solo listener).
- **Menú móvil animado** con `AnimatePresence`, cierre con `Escape` y en cambio de ruta; antes aparecía/desaparecía en seco.
- **Subrayado animado** en la navegación y confirmación en el propio botón («✓ Agregado»).
- **Fundido entre imágenes** en la galería de producto en lugar de un salto seco.
- **Estados de carga y error por ruta** (`loading.tsx`, `error.tsx`) dentro de la identidad de la marca; antes cualquier excepción mostraba la pantalla genérica de Next.
- **Nuevo estado vacío/válido en formularios** y microinteracciones con lenguaje de movimiento coherente (`cubic-bezier(0.16,1,0.3,1)`).
- **Filtros con chips**, contador en vivo y «limpiar» con número de filtros activos.

## 6. Decisiones que requieren tu autorización

1. **CSP estricta vs. HTML cacheable en el borde.** La CSP con `nonce` (sin `'unsafe-inline'` en scripts) obliga a
   render dinámico: Next.js no inyecta el nonce en HTML pre-renderizado y las páginas estáticas quedaban sin
   hidratar. Se conservó la CSP estricta y todo el árbol quedó `force-dynamic` (`app/layout.tsx`).
   *Coste real:* se pierde el pre-render estático de la home y de las 22 fichas de producto.
   *Alternativa si prefieres rendimiento de CDN:* volver a estático y usar `script-src 'self' 'unsafe-inline'`
   (el riesgo práctico es bajo: la app no renderiza HTML de usuario y el único `dangerouslySetInnerHTML` es el
   JSON-LD con datos del catálogo propio). **Decide tú**: seguridad estricta (actual) o caché de HTML.
2. **Cuentas de cliente reales.** No existe almacén de contraseñas de cliente (`pintao_clients` guarda nombre,
   correo y teléfono). Hoy el login de cliente sólo funciona con usuarios demo y **nunca en producción**.
   Habilitarlo requiere elegir entre Supabase Auth o `pintao_clients.password_hash` (decisión de producto/seguridad).
3. **Persistencia del catálogo.** Las ediciones del panel de inventario viven en memoria del proceso (se pierden al
   reiniciar). La fuente definitiva es la tabla `pintao_store`; hace falta decidir si el catálogo se sirve desde
   Supabase o si se escribe en la tabla con un RPC.
4. **Descuento de stock al crear pedidos.** Con Supabase configurado, `createOrder` no llama a `decrement_stock`:
   las migraciones `202608290001_persistencia_pedidos_stock.sql` definen el RPC pero el código no lo usa, así que el
   stock no baja al vender. Hay que decidir la estrategia (trigger o llamada explícita) y verificarla con Supabase.
5. **Credenciales Wompi.** Sin `WOMPI_PUBLIC_KEY` + `WOMPI_INTEGRITY_SECRET` el pago en línea responde 503 y el
   checkout lo informa. La corrección de S1 (no marcar como pagado) **no se ha podido probar de extremo a extremo**.

## 7. Pendientes conocidos (no corregidos en esta iteración)

- **Nombres de variables de Wompi inconsistentes** entre la documentación (`WOMPI_SECRET_KEY`,
  `WOMPI_ACCEPTANCE_TOKEN`) y el código (`WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`). Documentado en `SECURITY.md`.
- **Soft 404**: `/producto/9999` responde 200 (el HTML ya empezó a transmitirse). Mitigado con `robots: noindex`;
  un 404 real exigiría resolver el producto antes de iniciar el streaming.
- **`getProducts()`/`createProduct()` de `persistence.ts`**: corregidos los bugs evidentes, pero no se usan; la
  lectura de catálogo sigue siendo la constante local.
- **Versión de Next 15.5.27** frente al rango declarado `^15.3.0`: conviene fijar la versión exacta para despliegues
  reproducibles. La migración a Next 16 (`npm audit fix --force`) sigue pendiente por ser *breaking*.
- **Sin suite formal** (Vitest/Playwright Test). Ver `TESTING.md`: la verificación es un guion reproducible.
- **Observabilidad**: sólo `/api/health` y logs. Sin colector de errores.
