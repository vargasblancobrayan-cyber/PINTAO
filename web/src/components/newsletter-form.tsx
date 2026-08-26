"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.querySelector("input");
    await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: input?.value }),
    });
    if (input) input.value = "";
    setSent(true);
  }

  if (sent) {
    return <p className="text-sm text-accent">✓ Suscripto. Te avisamos de cada drop.</p>;
  }

  return (
    <form className="flex gap-2" onSubmit={submit}>
      <input
        required
        type="email"
        placeholder="Tu correo electrónico"
        aria-label="Correo electrónico"
        className="field flex-1"
      />
      <button className="btn-solid px-4 py-2" aria-label="Suscribirse">→</button>
    </form>
  );
}
