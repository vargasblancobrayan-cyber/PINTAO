"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Acceso unificado: elige el destino según el rol que devuelve la API.
 *
 * Con `allowRegister` (sólo en `/acceso`) alterna entre entrar y crear cuenta
 * de cliente; `/admin/login` no lo muestra, de modo que allí sigue habiendo un
 * único botón con el texto «ENTRAR».
 */
export function AuthForm({
  title,
  hint,
  allowRegister = false,
}: {
  title: string;
  hint?: string;
  allowRegister?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (isRegister && password.length < 8) {
      setLoading(false);
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    const url = isRegister ? "/api/auth/register" : "/api/auth/login";
    const payload = isRegister ? { name, email, phone, password } : { email, password };
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      setLoading(false);
      setError("No pudimos conectar con el servidor. Intenta de nuevo.");
      return;
    }
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No pudimos completar la operación");
      return;
    }
    const { user } = await res.json();
    /*
     * La sesión la fija el servidor con una cookie `HttpOnly` (`pintao_session`)
     * desde la ruta API. Aquí había un intento de escribir a mano una cookie
     * `pintao_refresh` con la bandera `HttpOnly`: el navegador **ignora**
     * `HttpOnly` en `document.cookie`, así que el código no protegía nada.
     */
    router.push(user.role === "admin" ? "/admin" : "/cuenta");
  }

  function toggle() {
    setError(null);
    setMode(isRegister ? "login" : "register");
  }

  return (
    <form onSubmit={submit} className="card-surface w-full max-w-md space-y-5 p-8">
      <h1 className="display-title text-3xl">{isRegister ? "Crear cuenta." : title}</h1>
      {!isRegister && hint && <p className="text-sm text-sand">{hint}</p>}
      {isRegister && (
        <p className="text-sm text-sand">
          Tu cuenta guarda el historial de pedidos y los favoritos. Sólo necesitas nombre,
          correo y contraseña.
        </p>
      )}
      {isRegister && (
        <div>
          <label htmlFor="name" className="eyebrow mb-2 block">NOMBRE</label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
      )}
      <div>
        <label htmlFor="email" className="eyebrow mb-2 block">CORREO</label>
        <input
          id="email"
          type="email"
          required
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete={isRegister ? "email" : "email"}
        />
      </div>
      {isRegister && (
        <div>
          <label htmlFor="phone" className="eyebrow mb-2 block">WHATSAPP (OPCIONAL)</label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            className="field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="3001234567"
          />
        </div>
      )}
      <div>
        <label htmlFor="password" className="eyebrow mb-2 block">CONTRASEÑA</label>
        <input
          id="password"
          type="password"
          required
          minLength={isRegister ? 8 : undefined}
          maxLength={128}
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
        />
        {isRegister && <p className="mt-2 text-xs text-mute">Mínimo 8 caracteres.</p>}
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button type="submit" disabled={loading} className="btn-solid w-full disabled:opacity-50">
        {loading ? "VERIFICANDO…" : isRegister ? "CREAR CUENTA" : "ENTRAR"}
      </button>
      {allowRegister && (
        <button type="button" onClick={toggle} className="w-full text-center text-xs text-mute underline">
          {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Créala aquí"}
        </button>
      )}
    </form>
  );
}
