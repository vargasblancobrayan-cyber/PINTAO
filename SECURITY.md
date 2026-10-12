# Security — PINTAO

## Enfoque aplicado

- **Validación de entrada** con Zod en los endpoints de escritura.
- **Recálculo server-side** de precios y totales en `POST /api/orders` (nunca se confía en el cliente).
- **Rate limiting** en memoria y por IP: pedidos (10/min), newsletter (5/min), cotizaciones (5/min), creación de pago
  en línea (20/min) y **login (8/min)**.
- **CSRF**: `assertSameOrigin` en los endpoints de escritura.
- **Cabeceras**: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Cacheo**: assets con hash inmutables; los documentos no se cachean públicamente (llevan un `nonce` por petición).
- **Supabase**: RLS habilitado; `anon`/`authenticated` denegados en las tablas sensibles (`pintao_orders`,
  `pintao_sessions`, `pintao_admin_users`, `pintao_login_attempts`); sólo `service_role` escribe.

## CSP y render

La CSP vive en `web/src/middleware.ts` y se emite **por petición con un nonce**:

```
default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https:; …; object-src 'none'; frame-ancestors 'none'; base-uri 'self';
form-action 'self'; upgrade-insecure-requests
```

Antes estaba en `next.config.ts` como `script-src 'self' 'strict-dynamic'` **sin nonce**, lo que bloqueaba todo el
JavaScript de Next: la página se veía pero no hidrataba (carrito, filtros y formularios inertes). Con
`'strict-dynamic'` la allowlist por host se ignora, así que un nonce (o un hash) es obligatorio.

**Consecuencia a tener en cuenta:** un nonce no puede existir en HTML pre-renderizado, de modo que este esquema exige
render dinámico (`export const dynamic = "force-dynamic"` en `app/layout.tsx`). Se pierde el pre-render estático de la
home y de las fichas de producto. La alternativa (HTML estático cacheable con `script-src 'self' 'unsafe-inline'`) está
planteada en `AUDIT.md` §6.1 y **requiere decisión del responsable del producto**.

## Autenticación (contrato)

- La cookie `pintao_session` es `HttpOnly`, `SameSite=Lax` y `Secure` en producción; guarda un **token aleatorio** de
  32 bytes en hexadecimal.
- En `pintao_sessions` se persiste **`token_hash` = SHA-256(token)** (nunca el token), con `expires_at` y renovación
  deslizante al usarla. Un volcado de la tabla no permite reutilizar sesiones.
- Las contraseñas de administrador se verifican con **PBKDF2-SHA256** (sal en hex, 210 000 iteraciones por defecto) y
  comparación en tiempo constante, en línea con `202608090001_seed_default_admin.sql`.
- **Cuentas de demostración**: sólo se aceptan cuando `NODE_ENV !== "production"` o con
  `PINTAO_ALLOW_DEMO_LOGIN=true` (pensado para probar el build de producción en local). Nunca deben habilitarse en un
  despliegue real. Si se definen `ADMIN_EMAIL`/`ADMIN_PASSWORD`, tienen prioridad en cualquier entorno.
- **Cuentas de cliente**: contraseña en `pintao_clients` con PBKDF2-SHA256 (sal aleatoria, 210 000 iteraciones), en
  una tabla con RLS denegado a `anon`/`authenticated` y accesible sólo desde el backend con `service_role`. El alta es
  pública en `/acceso` (`POST /api/auth/register`): mismo origen, 5 altas/minuto por IP, contraseña mínima de 8
  caracteres y correo único (409 si existe). *Sin verificación de correo ni restablecimiento de contraseña* — es la
  contrapartida elegida frente a Supabase Auth (`AUDIT.md` §6.2). Sin `SUPABASE_URL` en el despliegue el alta
  responde 503 y no se crea ninguna cuenta efímera.

## Pagos

- La aprobación de un pago **sólo** la realiza el webhook, que verifica `X-Event-Checksum`
  (SHA-256 de los campos firmados + timestamp + secreto de integridad) y comprueba que el importe coincide con el total
  del pedido.
- **Crear una transacción no marca el pedido como pagado.** Antes, `POST /api/payments/wompi/create` registraba un
  intento `APPROVED` y ponía el pedido en «Pagado», de modo que un pedido podía darse por cobrado sin pago. Ahora sólo
  se deja constancia de la transacción en estado `PENDING`.

## Variables de entorno

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (servidor)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cliente)
- `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_ENV` (el código usa estos nombres)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (opcional; tienen prioridad sobre las cuentas demo)
- `PINTAO_ALLOW_DEMO_LOGIN` (sólo para probar el build de producción en local)

> **Inconsistencia detectada:** la documentación anterior mencionaba `WOMPI_SECRET_KEY` y `WOMPI_ACCEPTANCE_TOKEN`, pero
> `lib/wompi.ts` lee `WOMPI_PUBLIC_KEY` y `WOMPI_INTEGRITY_SECRET`. Unificar nombres antes de configurar producción.

Ninguna credencial debe quedar en el repositorio ni en el historial de git.

## Pendientes de seguridad

- Auditoría de sesiones: rotación al cambiar de rol/contraseña y purga de sesiones caducadas.
- CORS explícito para la API pública (hoy sólo `assertSameOrigin` en escrituras).
- Verificar RLS de `pintao_sessions` y `pintao_admin_users` con una base de datos real (no se pudo ejecutar sin
  credenciales).
- Dependencias: evaluar `npm audit fix --force` (Next 16, *breaking*) y fijar la versión exacta de Next.
- Colector de errores en producción (hoy sólo `/api/health` y logs).
