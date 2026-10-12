import { getWompiConfig } from "../src/lib/wompi";

/** Verifica que Wompi esté configurado y conectable. */
export async function checkWompi() {
  const config = getWompiConfig();

  if (!config.enabled) {
    const missing: string[] = [];
    if (!process.env.WOMPI_PUBLIC_KEY) missing.push("WOMPI_PUBLIC_KEY");
    if (!process.env.WOMPI_INTEGRITY_SECRET) missing.push("WOMPI_INTEGRITY_SECRET");
    console.log(
      "WOMPI_NOT_CONFIGURED:",
      missing.length > 0 ? `Faltan: ${missing.join(", ")}` : "WOMPI_PUBLIC_KEY o WOMPI_INTEGRITY_SECRET vacíos",
    );
    return false;
  }

  console.log(
    "WOMPI_CONFIGURED:",
    `environment=${config.environment} publicKey=${config.publicKey.slice(0, 8)}...`,
  );

  // Try to fetch the merchant endpoint
  try {
    const res = await fetch(
      `https://${config.environment === "production" ? "production" : "sandbox"}.wompi.co/v1/merchants/${config.publicKey}`,
      {
        headers: { authorization: `Bearer ${config.publicKey}` },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.log("WOMPI_INVALID_KEY:", `HTTP ${res.status} ${body?.message ?? body?.error?.message ?? "invalid"}`);
      return false;
    }

    const data = await res.json();
    const merchant = data?.data;
    if (!merchant?.presigned_acceptance?.acceptance_token) {
      console.log("WOMPI_NO_MERCHANT:", "No se pudo obtener el acceptance token del merchant.");
      return false;
    }

    console.log("WOMPI_OK:", "Conexión Wompi OK, mercado listo.");
    return true;
  } catch (err) {
    console.log("WOMPI_CONNECT_ERROR:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

if (require.main === module) {
  checkWompi().then((ok) => process.exit(ok ? 0 : 1));
}
