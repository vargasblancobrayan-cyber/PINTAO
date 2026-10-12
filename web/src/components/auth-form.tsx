"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Acceso unificado: elige el destino según el rol que devuelve la API. */
export function AuthForm({ title, hint }: { title: string; hint?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setLoading(false);
      setError("No pudimos conectar con el servidor. Intenta de nuevo.");
      return;
    }
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No pudimos iniciar sesión");
      return;
    }
    const { user } = await res.json();
    /*
     * La sesión la fija el servidor con una cookie `HttpOnly` (`pintao_session`)
     * desde `/api/auth/login`. Aquí había un intento de escribir a mano una
     * cookie `pintao_refresh` con la bandera `HttpOnly`: el navegador **ignora**
     * `HttpOnly` en `document.cookie`, así que el código no protegía nada (y la
     * API nunca devolvía `refreshToken`, por lo que ni siquiera se ejecutaba).
     */
    router.push(user.role === "admin" ? "/admin" : "/cuenta");
  }

  return (
    <form onSubmit={submit} className="card-surface w-full max-w-md space-y-5 p-8">
      <h1 className="display-title text-3xl">{title}</h1>
      {hint && <p className="text-sm text-sand">{hint}</p>}
      <div>
        <label htmlFor="email" className="eyebrow mb-2 block">CORREO</label>
        <input id="email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div>
        <label htmlFor="password" className="eyebrow mb-2 block">CONTRASEÑA</label>
        <input id="password" type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button type="submit" disabled={loading} className="btn-solid w-full disabled:opacity-50">
        {loading ? "VERIFICANDO…" : "ENTRAR"}
      </button>
    </form>
  );
}
