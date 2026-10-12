"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "ok" | "error";

/**
 * Suscripción al newsletter.
 *
 * Antes mostraba "✓ Suscripto" pasara lo que pasara: ignoraba la respuesta del
 * servidor, así que un 400 (correo inválido) o un 429 (rate limit) se veían
 * como un éxito. Ahora refleja el resultado real y permite reintentar.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "No pudimos registrar tu correo. Intenta de nuevo.");
        return;
      }
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Sin conexión con el servidor. Intenta de nuevo.");
    }
  }

  if (status === "ok") {
    return (
      <p className="text-sm text-accent" role="status" aria-live="polite">
        ✓ Suscrito. Te avisamos de cada drop.
      </p>
    );
  }

  return (
    <form className="space-y-2" onSubmit={submit} noValidate>
      <div className="flex gap-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="Tu correo electrónico"
          aria-label="Correo electrónico"
          aria-invalid={status === "error"}
          aria-describedby={message ? "newsletter-msg" : undefined}
          disabled={status === "sending"}
          className="field flex-1"
        />
        <button
          className="btn-solid px-4 py-2"
          aria-label="Suscribirse"
          type="submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "…" : "→"}
        </button>
      </div>
      {message && (
        <p id="newsletter-msg" role="alert" className="text-xs text-danger" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}
