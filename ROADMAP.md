# Roadmap — PINTAO

## Criterios de valor

Añadir una funcionalidad solo si resuelve un problema real del cliente (comprador o vendedor). Priorizamos:

1. Pasos críticos del checkout (compra real).
2. Datos que el vendedor necesita para despachar.
3. Presencia en buscadores y redes.
4. Bienestar del carrito (descuentos e indicaciones visibles).
5. Accesibilidad de base de datos y administración.

## Etapas

### Fase 1: Fundamentos ejecutables

- [x] Completar la aplicación en `web/` y ejecutar sin errores de TypeScript.
- [x] Completar build de producción.
- [x] Pegar credenciales de Supabase y correr migraciones SQL.
- [x] Hacer pruebas funcionales en `http://127.0.0.1:3000/`.

### Fase 2: Corrección de casos críticos

- [ ] Detectar y resolver mezclas nuevas de `postcss`/`next` (cambios con breaking, revisa consejos de `npm audit fix --force` antes de aplicar).
- [ ] **Decidir la estrategia de render y CSP** (ver `AUDIT.md` §6.1): hoy CSP estricta con nonce y render dinámico; la
      alternativa es HTML estático cacheable con `'unsafe-inline'` en scripts. Afecta rendimiento y seguridad.
- [ ] Confirmar que la app usa las variables de entorno en producción.
- [ ] Definir cómo se autentican los **clientes** (hoy sólo usuarios demo fuera de producción).
- [ ] Implementar pruebas automatizadas (Vitest/Playwright) para los flujos críticos.
- [ ] Liberar CORS sólo en las URLs escritas en `lib/csrf.ts` env.

### Fase 3: Puesta a punto de pago y datos

- [ ] Conectar Wompi (`WOMPI_PUBLIC_KEY` + `WOMPI_INTEGRITY_SECRET`) y activar webhooks; unificar los nombres de las
      variables, que hoy no coinciden entre documentación y código.
- [ ] Asegurar que las respuestas de Wompi abran el pago conforme.
- [ ] Definir la estrategia de stock: tabla `pintao_store` ya existe para productos; se reemplaza `pintao_store` por view / RPC.
- [x] **Descontar stock al crear el pedido** (2026-10-13): `createOrder` llama al RPC atómico `decrement_stock` vía
      `lib/stock.ts` (llamada explícita, no trigger) y cancela reponiendo con `increment_stock`. Verificado en modo
      memoria con `scripts/api-check.mjs` (15/15).
- [ ] **Stock visible al cliente en modo Supabase**: conectar `getProductWithLiveStock` a la tienda y a la ficha para
      no mostrar unidades ya vendidas.
- [ ] Persistir en `pintao_store` las ediciones del panel de inventario (hoy viven en memoria del proceso).

### Fase 4: Soporte operativo

- [ ] Exigir las credenciales: guardarlas en Vercel env, no en el repo.
- [ ] Agregar alertas de estado: `/api/health` en Vercel (basicos).
- [ ] Habilitar logs a stderr o con herramientas de monitoreo.
- [ ] Plan de cambio de superficie de la API (contratos firmados).

## Métricas de éxito

- Build production exitoso y sin advertencias de TypeScript.
- Completar flow minimal (`/tienda` → `/checkout` → pago) con datos de prueba.
- Verificar que los pedidos persisten y el stock se descuenta con `prev` en las migraciones.
- Que el `POST /api/payments/wompi/webhook` acepte y cachee las respuestas de Wompi.
- Que el pago sea confirmable y el ticket se pueda generar.

## Notas

- Cambios a infraestructura o integración de pago **requieren autorización expresa** antes de ejecutarse.
- Cambios que afecten la categoría visual del producto requieren revisión previa.
