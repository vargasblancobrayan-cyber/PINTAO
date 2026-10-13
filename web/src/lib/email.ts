/**
 * Correo transaccional.
 *
 * Antes nadie recibía nada: el comprador pagaba y no le llegaba ni la
 * confirmación del pedido. Es lo primero que espera un cliente y lo que evita
 * («¿me confirmas por WhatsApp?») media conversación de soporte.
 *
 * Proveedor: **Resend** (`https://api.resend.com/emails`), que se consume con
 * `fetch` para no añadir dependencias — igual que la integración de Wompi.
 *
 * Variables de entorno:
 * - `RESEND_API_KEY`            — obligatoria para enviar. Sin ella, el envío se
 *                                 omite y se registra en consola (el checkout no
 *                                 falla por correo).
 * - `EMAIL_FROM`                — remitente verificado, p. ej. `"PINTAO <hola@pintao.co>"`.
 *                                 Por defecto usa el dominio de pruebas de Resend,
 *                                 que **sólo entrega al correo de la cuenta**.
 * - `ORDER_NOTIFICATION_EMAIL`  — buzón de la tienda para el aviso de pedido nuevo.
 * - `EMAIL_REPLY_TO`            — `reply-to` de los correos salientes.
 *
 * Envío: `sendEmail()` nunca lanza. Devuelve `{ ok: false, skipped: true }` cuando
 * no hay credenciales, para que las rutas puedan ignorar el resultado.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

/** ¿Hay credenciales para enviar? Lo reporta `GET /api/health`. */
export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || "PINTAO <onboarding@resend.dev>";
}

export function shopNotificationEmail(): string | null {
  const value = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  return value ? value : null;
}

function recipients(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to])
    .map((value) => String(value ?? "").trim())
    .filter((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value));
}

export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const to = recipients(message.to);
  if (to.length === 0) return { ok: false, error: "sin destinatario" };

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY no configurada: se omite «${message.subject}»`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom(),
        to,
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
        ...(message.replyTo ?? process.env.EMAIL_REPLY_TO
          ? { reply_to: message.replyTo ?? process.env.EMAIL_REPLY_TO }
          : {}),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] Resend respondió ${res.status}: ${detail.slice(0, 300)}`);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.error("[email] fallo de red al enviar:", error);
    return { ok: false, error: "network" };
  }
}
