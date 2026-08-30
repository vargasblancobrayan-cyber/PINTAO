import crypto from "crypto";

/**
 * Integración Wompi (pasarela de Grupo Bancolombia).
 *
 * Contrato basado en los OpenAPI/AsyncAPI públicos de Wompi:
 * - Crear transacción:  POST {base}/v1/transactions  (Auth: Bearer public_key)
 * - Acceptance token: GET  {base}/v1/merchants/{public_key}
 * - Eventos/webhooks:  POST al Events URL con header `X-Event-Checksum`
 *   = sha256(campos_firmados + timestamp_unix + integrity_secret)
 *
 * El checkout de Wompi (payment_link) es donde el cliente paga (tarjeta,
 * Nequi, PSE, Bancolombia). Cuando el pago se aprueba, Wompi envía
 * `transaction.updated` con status APPROVED al webhook configurado (Events URL).
 */

export interface WompiConfig {
  enabled: boolean;
  environment: "sandbox" | "production";
  publicKey: string;
  integritySecret: string;
}

export function getWompiConfig(): WompiConfig {
  const publicKey = process.env.WOMPI_PUBLIC_KEY ?? "";
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET ?? "";
  const environment = process.env.WOMPI_ENV === "production" ? "production" : "sandbox";
  return {
    enabled: Boolean(publicKey && integritySecret),
    environment,
    publicKey,
    integritySecret,
  };
}

function baseUrl(env: "sandbox" | "production"): string {
  return env === "production" ? "https://production.wompi.co" : "https://sandbox.wompi.co";
}

/** Firma de integridad para crear una transacción. */
export function integritySignature(config: WompiConfig, reference: string, amountInCents: number, currency = "COP"): string {
  return crypto
    .createHash("sha256")
    .update(`${reference}${amountInCents}${currency}${config.integritySecret}`)
    .digest("hex");
}

export interface WompiMerchant {
  acceptanceToken: string;
  personalDataAuthToken: string;
  acceptedPaymentMethods: string[];
}

/** GET /v1/merchants/{public_key} — presigned acceptance tokens. */
export async function getMerchant(config: WompiConfig): Promise<WompiMerchant | null> {
  try {
    const res = await fetch(`${baseUrl(config.environment)}/v1/merchants/${config.publicKey}`, {
      headers: { authorization: `Bearer ${config.publicKey}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const d = json?.data;
    return {
      acceptanceToken: d?.presigned_acceptance?.acceptance_token ?? "",
      personalDataAuthToken: d?.presigned_personal_data_auth?.acceptance_token ?? "",
      acceptedPaymentMethods: Array.isArray(d?.accepted_payment_methods) ? d.accepted_payment_methods : [],
    };
  } catch {
    return null;
  }
}

export interface CreateTransactionParams {
  amountInCents: number;
  reference: string;
  customerEmail: string;
  paymentMethod?: {
    type: "CARD" | "NEQUI" | "PSE";
    phoneNumber?: string; // NEQUI
    userType?: number; // PSE: 0 natural, 1 empresa
    userLegalIdType?: string; // PSE: CC / NIT
    userLegalId?: string; // PSE
    financialInstitutionCode?: string; // PSE
    paymentDescription?: string; // PSE
    token?: string; // CARD tokenizado
    installments?: number;
  };
}

export interface WompiTransaction {
  id: string;
  reference: string;
  status: string;
  amountInCents: number;
  currency: string;
  paymentLink?: string;
}

/**
 * POST /v1/transactions — crea la transacción.
 * Devuelve el `payment_link` (payment_url) para redirigir al checkout de Wompi.
 */
export async function createWompiTransaction(
  config: WompiConfig,
  params: CreateTransactionParams,
  acceptanceToken: string,
): Promise<{ ok: boolean; transaction?: WompiTransaction; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      amount_in_cents: params.amountInCents,
      currency: "COP",
      customer_email: params.customerEmail,
      reference: params.reference,
      acceptance_token: acceptanceToken,
      signature: integritySignature(config, params.reference, params.amountInCents),
    };
    if (params.paymentMethod) body.payment_method = params.paymentMethod.type === "CARD"
      ? { type: "CARD", ...(params.paymentMethod.token ? { token: params.paymentMethod.token } : {}), ...(params.paymentMethod.installments ? { installments: params.paymentMethod.installments } : {}) }
      : params.paymentMethod.type === "NEQUI"
        ? { type: "NEQUI", phone_number: params.paymentMethod.phoneNumber ?? "" }
        : { type: "PSE", user_type: params.paymentMethod.userType ?? 0, user_legal_id_type: params.paymentMethod.userLegalIdType ?? "CC", user_legal_id: params.paymentMethod.userLegalId ?? "", financial_institution_code: params.paymentMethod.financialInstitutionCode ?? "", payment_description: params.paymentMethod.paymentDescription ?? "Compra PINTAO" };

    const res = await fetch(`${baseUrl(config.environment)}/v1/transactions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.publicKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.message ?? json?.error?.message ?? `Wompi: ${res.status}` };
    }
    const t = json?.data?.transaction ?? json?.data;
    return {
      ok: true,
      transaction: {
        id: String(t?.id ?? ""),
        reference: String(t?.reference ?? params.reference),
        status: String(t?.status ?? "PENDING"),
        amountInCents: Number(t?.amount_in_cents ?? params.amountInCents),
        currency: String(t?.currency ?? "COP"),
        paymentLink: t?.payment_link ?? t?.payment_url ?? undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error conectando con Wompi" };
  }
}

/**
 * Verifica la firma de un webhook de Wompi.
 *
 * Algoritmo (AsyncAPI oficial): SHA256(campos_firmados_en_orden +
 * timestamp_unix + integrity_secret). El checksum viaja en el header
 * `X-Event-Checksum` y en el body `signature.checksum`.
 */
export function verifyWebhookSignature(
  integritySecret: string,
  checksum: string | undefined,
  signedFields: unknown[],
  timestampUnix: number | string,
): boolean {
  if (!checksum) return false;
  const payload = `${signedFields.join("")}${timestampUnix}${integritySecret}`;
  const expected = crypto.createHash("sha256").update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(checksum, "hex"));
}