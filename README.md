# PINTAO — streetwear colombiano

Tienda multipágina de PINTAO con portada, catálogo por colecciones, búsqueda, fichas de producto, carrito, checkout, cuenta de comprador, venta por volumen y administración protegida.

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
- `/informacion` envíos, cambios y privacidad
- `/admin/login` acceso administrativo

## Administración local

En desarrollo, si no se definen variables de entorno:

- Correo: `admin@pintao.local`
- Contraseña: `Pintao2026!`

Para otro entorno, copiar `.env.example` y definir `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el proceso antes de iniciar. El panel y sus API requieren una sesión administrativa.

## Alcance del pago

El checkout registra solicitudes pendientes de confirmación. No simula un cobro. Para cobrar en producción se debe integrar una pasarela y validar sus notificaciones en el servidor.
