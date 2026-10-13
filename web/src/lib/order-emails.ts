import { sendEmail, shopNotificationEmail } from "./email";
import { formatCOP } from "./format";
import type { Order } from "./types";

/**
 * Correos del ciclo de vida de un pedido, en español y con la identidad de la
 * marca (mismos colores que `globals.css`).
 *
 * Cuándo se envían:
 * - `sendOrderReceived`  → al registrar el pedido (`POST /api/orders`).
 * - `sendPaymentApproved`→ cuando el webhook firmado de Wompi aprueba el pago.
 * - `sendOrderShipped`   → al pasar el pedido a «Enviado» desde el panel.
 * - `sendOrderCancelled` → al cancelar (acción `cancel` o estado «Cancelado»).
 *
 * Todos son best-effort: ningún correo puede tumbar la operación que lo dispara.
 * Sin `RESEND_API_KEY` no se envía nada y queda un aviso en el log.
 */

const SITE_URL = (process.env.SITE_URL?.trim() || "https://pintao-store.vercel.app").replace(/\/+$/, "");

const COLOR = {
  noir: "#0a0a0a",
  ash: "#1c1c19",
  cream: "#f5f1ea",
  sand: "#6f6a5f",
  accent: "#c9a227",
  line: "#e4dfd6",
  page: "#f7f4ef",
};

function money(value: number): string {
  return formatCOP(value);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Envuelve el contenido con el encabezado y el pie de la marca. */
function layout(title: string, intro: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px 12px;background:${COLOR.page};font-family:'Helvetica Neue',Arial,sans-serif;color:${COLOR.noir};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid ${COLOR.line};border-radius:16px;overflow:hidden;">
    <tr>
      <td style="background:${COLOR.noir};padding:20px 24px;">
        <span style="font-size:20px;letter-spacing:6px;color:${COLOR.cream};font-weight:700;">PINTAO</span>
        <span style="font-size:11px;letter-spacing:2px;color:${COLOR.accent};text-transform:uppercase;display:block;margin-top:6px;">${escapeHtml(title)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR.ash};">${intro}</p>
        ${body}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;background:${COLOR.page};border-top:1px solid ${COLOR.line};font-size:12px;color:${COLOR.sand};line-height:1.6;">
        PINTAO · streetwear colombiano<br />
        <a href="${SITE_URL}/cuenta" style="color:${COLOR.accent};text-decoration:none;">Ver mis pedidos</a> ·
        <a href="${SITE_URL}/informacion" style="color:${COLOR.accent};text-decoration:none;">Envíos y cambios</a>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function itemsTable(order: Order): string {
  const rows = order.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid ${COLOR.line};font-size:14px;">
          ${escapeHtml(item.name)} <span style="color:${COLOR.sand};">· talla ${escapeHtml(item.size)}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid ${COLOR.line};font-size:14px;text-align:center;color:${COLOR.sand};">×${item.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid ${COLOR.line};font-size:14px;text-align:right;white-space:nowrap;">${money(item.unitPrice * item.qty)}</td>
      </tr>`,
    )
    .join("");

  const totals = [
    `<tr><td colspan="2" style="padding:6px 0;font-size:13px;color:${COLOR.sand};">Envío</td><td style="padding:6px 0;font-size:13px;text-align:right;">${order.shipping === 0 ? "GRATIS" : money(order.shipping)}</td></tr>`,
  ];
  if (order.volume_discount > 0) {
    totals.unshift(
      `<tr><td colspan="2" style="padding:6px 0;font-size:13px;color:${COLOR.sand};">Descuento por volumen</td><td style="padding:6px 0;font-size:13px;text-align:right;">−${money(order.volume_discount)}</td></tr>`,
    );
  }
  if (order.coupon_discount > 0) {
    totals.unshift(
      `<tr><td colspan="2" style="padding:6px 0;font-size:13px;color:${COLOR.sand};">Cupón ${escapeHtml(order.coupon ?? "")}</td><td style="padding:6px 0;font-size:13px;text-align:right;">−${money(order.coupon_discount)}</td></tr>`,
    );
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      ${rows}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td colspan="2" style="padding:6px 0;font-size:13px;color:${COLOR.sand};">Subtotal</td><td style="padding:6px 0;font-size:13px;text-align:right;">${money(order.subtotal)}</td></tr>
      ${totals.join("")}
      <tr>
        <td colspan="2" style="padding:10px 0;border-top:1px solid ${COLOR.line};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${COLOR.sand};">Total</td>
        <td style="padding:10px 0;border-top:1px solid ${COLOR.line};font-size:16px;text-align:right;font-weight:700;color:${COLOR.accent};">${money(order.total)}</td>
      </tr>
    </table>`;
}

/**
 * `shippingMethod` llega en camelCase desde el checkout y en snake_case cuando
 * el pedido se lee de `pintao_orders` (el panel admin). Se aceptan las dos.
 */
function shippingMethodOf(order: Order): string {
  return (
    order.shippingMethod ??
    (order as unknown as { shipping_method?: string }).shipping_method ??
    "envio"
  );
}

function deliveryBlock(order: Order): string {
  const shippingMethod = shippingMethodOf(order);
  if (shippingMethod === "recoge") {
    return `<p style="margin:16px 0 0;font-size:13px;color:${COLOR.sand};">Entrega: <strong>recoges en tienda</strong> (te avisamos cuando esté listo).</p>`;
  }
  const address = order.address
    ? `${escapeHtml(order.address.line1)}${order.address.line2 ? `, ${escapeHtml(order.address.line2)}` : ""}, ${escapeHtml(order.address.city)} (${escapeHtml(order.address.region)})`
    : "";
  const label = shippingMethod === "expreso" ? "envío exprés prioritario" : "envío nacional";
  return `<p style="margin:16px 0 0;font-size:13px;color:${COLOR.sand};">Entrega: <strong>${label}</strong>${address ? `<br />${address}` : ""}</p>`;
}

/** Envoltorio seguro: un fallo de correo nunca interrumpe el flujo de compra. */
async function notify(label: string, task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.error(`[email] ${label}:`, error);
  }
}

function orderReference(order: Order): string {
  return `#${order.id}`;
}

export async function sendOrderReceived(order: Order): Promise<void> {
  const html = layout(
    "Pedido recibido",
    `Gracias, ${escapeHtml(order.customer.name)}. Recibimos tu pedido <strong>${orderReference(order)}</strong> y quedó
     <strong>pendiente de confirmación</strong>: verificamos inventario y pago antes de despachar.`,
    `${itemsTable(order)}${deliveryBlock(order)}
     <p style="margin:20px 0 0;font-size:13px;color:${COLOR.sand};">
       Medio de pago elegido: <strong>${escapeHtml(order.paymentMethod ?? "por confirmar")}</strong>. Te escribimos al WhatsApp
       ${escapeHtml(order.customer.phone)} si necesitamos confirmar algo.
     </p>`,
  );

  await notify("pedido recibido", async () => {
    const shop = shopNotificationEmail();
    await Promise.all([
      sendEmail({
        to: order.customer.email,
        subject: `Recibimos tu pedido ${orderReference(order)} — PINTAO`,
        html,
      }),
      shop && shop.toLowerCase() !== order.customer.email.toLowerCase()
        ? sendEmail({
            to: shop,
            subject: `Nuevo pedido ${orderReference(order)} · ${money(order.total)}`,
            html: layout(
              "Nuevo pedido",
              `<strong>${escapeHtml(order.customer.name)}</strong> (${escapeHtml(order.customer.email)}, WhatsApp ${escapeHtml(order.customer.phone)})
               acaba de registrar el pedido <strong>${orderReference(order)}</strong>.`,
              `${itemsTable(order)}${deliveryBlock(order)}`,
            ),
          })
        : Promise.resolve(null),
    ]);
  });
}

export async function sendPaymentApproved(order: Order): Promise<void> {
  const html = layout(
    "Pago confirmado",
    `Confirmamos el pago de tu pedido <strong>${orderReference(order)}</strong> por ${money(order.total)}.
     Ya estamos preparándolo.`,
    `${itemsTable(order)}${deliveryBlock(order)}`,
  );

  await notify("pago confirmado", () =>
    sendEmail({
      to: order.customer.email,
      subject: `Pago confirmado — Pedido ${orderReference(order)}`,
      html,
    }),
  );
}

export async function sendOrderShipped(order: Order): Promise<void> {
  const html = layout(
    "Tu pedido está en camino",
    `El pedido <strong>${orderReference(order)}</strong> salió de nuestra bodega hacia ${escapeHtml(order.customer.name)}.`,
    `${deliveryBlock(order)}
     <p style="margin:16px 0 0;font-size:13px;color:${COLOR.sand};">
       Coordinadora / Interrapidísimo suele tardar entre 3 y 5 días hábiles en envío nacional. Te compartimos la guía
       por WhatsApp en cuanto la transportadora la emita.
     </p>`,
  );

  await notify("pedido enviado", () =>
    sendEmail({
      to: order.customer.email,
      subject: `Tu pedido ${orderReference(order)} está en camino`,
      html,
    }),
  );
}

export async function sendOrderCancelled(order: Order): Promise<void> {
  const html = layout(
    "Pedido cancelado",
    `El pedido <strong>${orderReference(order)}</strong> quedó cancelado y el inventario volvió a estar disponible.`,
    `<p style="margin:0;font-size:14px;color:${COLOR.ash};line-height:1.55;">
       Si fue un error o quieres retomarlo, respóndenos a este correo o escríbenos por WhatsApp y lo volvemos a armar.
     </p>`,
  );

  await notify("pedido cancelado", () =>
    sendEmail({
      to: order.customer.email,
      subject: `Pedido ${orderReference(order)} cancelado`,
      html,
    }),
  );
}
