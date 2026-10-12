import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import {
  createSession as createMemorySession,
  destroySession as destroyMemorySession,
  findUserByCredentials,
  getSession as getMemorySession,
  registerDemoCustomer,
} from "./server-store";

/**
 * Autenticación de PINTAO.
 *
 * Contrato (alineado con `supabase/migrations/*` y con la Edge Function
 * histórica `legacy`/`store-api`):
 *
 * - La cookie `pintao_session` guarda un **token aleatorio** (32 bytes hex).
 *   Lo que se persiste en `pintao_sessions` es su **SHA-256** (`token_hash`),
 *   así que una filtración de la tabla no permite reutilizar sesiones.
 * - La sesión se valida por `token_hash` + `expires_at > now()` y se renueva la
 *   caducidad al usarla.
 * - Las contraseñas de administrador se verifican con PBKDF2-SHA256
 *   (`password_salt` en hex, 210 000 iteraciones por defecto) comparando en
 *   tiempo constante, igual que `202608090001_seed_default_admin.sql`.
 *
 * Sin `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` el módulo cae al store en
 * memoria (modo demo). Antes, este archivo **lanzaba una excepción** sin
 * Supabase: `/api/auth/login` respondía 500 y las cuentas de demostración que
 * documenta el README no funcionaban. Además consultaba una columna `token` que
 * no existe en el esquema (es `token_hash`), por lo que en producción ninguna
 * sesión se habría resuelto.
 */

export const SESSION_COOKIE = "pintao_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEY_BYTES = 32;

export type SessionRole = "admin" | "customer";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: SessionRole;
}

export interface SignInResult {
  ok: boolean;
  error?: string;
  user?: SessionUser;
  token?: string;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** PBKDF2-SHA256 sobre sal hex, comparado en tiempo constante. */
function verifyPassword(
  password: string,
  saltHex: string,
  expectedHash: string,
  iterations = PBKDF2_ITERATIONS,
): boolean {
  try {
    const derived = crypto
      .pbkdf2Sync(password, Buffer.from(saltHex, "hex"), iterations, PBKDF2_KEY_BYTES, "sha256")
      .toString("hex");
    const a = Buffer.from(derived, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Hash PBKDF2-SHA256 con sal aleatoria: mismo formato que `pintao_admin_users`. */
function hashPassword(
  password: string,
  iterations = PBKDF2_ITERATIONS,
): { salt: string; hash: string; iterations: number } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, Buffer.from(salt, "hex"), iterations, PBKDF2_KEY_BYTES, "sha256")
    .toString("hex");
  return { salt, hash, iterations };
}

/**
 * Las cuentas de demostración sólo valen fuera de producción.
 *
 * En un despliegue real (o al probar el build de producción con `npm start`)
 * habilitarlas exige el opt-in explícito `PINTAO_ALLOW_DEMO_LOGIN=true`; de lo
 * contrario hay que definir `ADMIN_EMAIL`/`ADMIN_PASSWORD` o usar Supabase.
 */
function demoLoginAllowed(): boolean {
  return !isProduction() || process.env.PINTAO_ALLOW_DEMO_LOGIN === "true";
}

/** Administradores: `pintao_admin_users` en producción, credenciales demo si no hay BD. */
async function authenticateAdmin(email: string, password: string): Promise<SessionUser | null> {
  const db = getDb();

  if (db) {
    const { data, error } = await db
      .from("pintao_admin_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error || !data) return null;
    const valid = verifyPassword(
      password,
      String(data.password_salt ?? ""),
      String(data.password_hash ?? ""),
      Number(data.password_iterations ?? PBKDF2_ITERATIONS),
    );
    if (!valid) return null;
    return { id: String(data.id ?? data.email), name: String(data.name ?? "Administrador"), email, role: "admin" };
  }

  // Sin BD: `ADMIN_EMAIL`/`ADMIN_PASSWORD` mandan; si no están definidas se
  // aceptan las credenciales de demostración **solo fuera de producción**.
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envEmail && envPassword) {
    return email === envEmail && password === envPassword
      ? { id: "u-admin", name: "Administrador", email, role: "admin" }
      : null;
  }
  if (!demoLoginAllowed()) return null;

  const user = findUserByCredentials(email, password);
  return user && user.role === "admin"
    ? { id: user.id, name: user.name, email: user.email, role: "admin" }
    : null;
}

/**
 * Clientes.
 *
 * En producción las contraseñas viven en `pintao_clients` con el mismo formato
 * PBKDF2 que los administradores (migración `202610120001_clients_credentials`),
 * denegado a `anon`/`authenticated` en RLS. Sin BD sigue mandando
 * `demoLoginAllowed()`: usuarios de demostración sólo fuera de producción o con
 * `PINTAO_ALLOW_DEMO_LOGIN=true`.
 */
async function authenticateCustomer(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const db = getDb();

  if (db) {
    const { data, error } = await db
      .from("pintao_clients")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error || !data) return null;
    const valid = verifyPassword(
      password,
      String(data.password_salt ?? ""),
      String(data.password_hash ?? ""),
      Number(data.password_iterations ?? PBKDF2_ITERATIONS),
    );
    if (!valid) return null;
    return {
      id: String(data.email ?? email),
      name: String(data.name ?? data.email ?? email),
      email,
      role: "customer",
    };
  }

  if (!demoLoginAllowed()) return null;
  const user = findUserByCredentials(email, password);
  return user && user.role === "customer"
    ? { id: user.id, name: user.name, email: user.email, role: "customer" }
    : null;
}

/** Crea la sesión (Supabase o memoria) para un usuario ya autenticado. */
async function issueSession(
  user: SessionUser,
): Promise<{ ok: boolean; error?: string; token?: string }> {
  const db = getDb();
  if (db) {
    const token = randomToken();
    const { error } = await db.from("pintao_sessions").insert({
      token_hash: sha256(token),
      role: user.role,
      // Las sesiones de administrador no se atan a un usuario de la tabla.
      user_id: null,
      email: user.email,
      expires_at: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
    });
    if (error) return { ok: false, error: "No pudimos iniciar sesión. Intenta de nuevo." };
    return { ok: true, token };
  }
  return { ok: true, token: createMemorySession(user) };
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const cleanPassword = String(password ?? "");
  if (!cleanEmail || !cleanPassword) {
    return { ok: false, error: "Correo y contraseña son obligatorios." };
  }

  const admin = await authenticateAdmin(cleanEmail, cleanPassword);
  const user = admin ?? (await authenticateCustomer(cleanEmail, cleanPassword));
  if (!user) return { ok: false, error: "Correo o contraseña incorrectos." };

  const session = await issueSession(user);
  if (!session.ok) return { ok: false, error: session.error ?? "No pudimos iniciar sesión." };
  return { ok: true, user, token: session.token };
}

export interface SignUpInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export type SignUpErrorCode = "email_taken" | "unavailable" | "error";

export interface SignUpResult {
  ok: boolean;
  code?: SignUpErrorCode;
  error?: string;
  user?: SessionUser;
  token?: string;
}

/**
 * El alta sin BD sólo se permite fuera de producción, o con el opt-in explícito
 * `PINTAO_ALLOW_DEMO_LOGIN=true` **fuera de Vercel**. En un despliegue real sin
 * BD la cuenta viviría sólo en la memoria de una función serverless y desaparecería
 * en la siguiente invocación, así que en Vercel no se crea ninguna cuenta efímera.
 */
function memorySignUpAllowed(): boolean {
  if (!isProduction()) return true;
  if (process.env.VERCEL) return false;
  return process.env.PINTAO_ALLOW_DEMO_LOGIN === "true";
}

/**
 * Alta de cliente.
 *
 * Con Supabase se escribe en `pintao_clients` (RLS denegado a `anon`, sólo
 * `service_role`); sin BD sólo se acepta cuando `memorySignUpAllowed()` lo
 * permite, es decir: desarrollo local o demo con el opt-in explícito.
 */
export async function signUpCustomer(input: SignUpInput): Promise<SignUpResult> {
  const name = String(input.name ?? "").trim().slice(0, 80);
  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? "").replace(/\D/g, "").slice(0, 20);
  const password = String(input.password ?? "");
  if (name.length < 2 || !email || password.length < 8) {
    return {
      ok: false,
      code: "error",
      error: "Revisa los campos: nombre, correo y contraseña de al menos 8 caracteres.",
    };
  }

  const db = getDb();
  let user: SessionUser;

  if (db) {
    const { data: existing } = await db
      .from("pintao_clients")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return { ok: false, code: "email_taken", error: "Ese correo ya tiene una cuenta." };
    }

    const hashed = hashPassword(password);
    const { error } = await db.from("pintao_clients").insert({
      email,
      name,
      phone: phone || null,
      password_salt: hashed.salt,
      password_hash: hashed.hash,
      password_iterations: hashed.iterations,
    });
    if (error) {
      // 23505 = unique_violation: otra petición ganó la carrera por el mismo correo.
      if (error.code === "23505") {
        return { ok: false, code: "email_taken", error: "Ese correo ya tiene una cuenta." };
      }
      return { ok: false, code: "error", error: "No pudimos crear la cuenta. Intenta de nuevo." };
    }
    user = { id: email, name, email, role: "customer" };
  } else {
    if (!memorySignUpAllowed()) {
      return {
        ok: false,
        code: "unavailable",
        error: "El alta de cuentas no está disponible ahora mismo. Escríbenos por WhatsApp.",
      };
    }
    const created = registerDemoCustomer({ name, email, password });
    if (!created) {
      return { ok: false, code: "email_taken", error: "Ese correo ya tiene una cuenta." };
    }
    user = created;
  }

  const session = await issueSession(user);
  if (!session.ok) {
    return { ok: false, code: "error", error: session.error ?? "No pudimos crear la cuenta." };
  }
  return { ok: true, user, token: session.token };
}

/** Fija la cookie HttpOnly de sesión desde una ruta de API. */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const db = getDb();

  if (!db) {
    const user = getMemorySession(token);
    return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
  }

  const { data, error } = await db
    .from("pintao_sessions")
    .select("*")
    .eq("token_hash", sha256(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;

  // Renovación deslizante de la sesión.
  await db
    .from("pintao_sessions")
    .update({ expires_at: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString() })
    .eq("token_hash", sha256(token));

  const email = String(data.email ?? "");
  const role: SessionRole = data.role === "admin" ? "admin" : "customer";
  let name = email || "Cliente";
  if (role === "customer" && email) {
    // El nombre que se muestra en `/cuenta`: sólo una fila por PK, y sólo
    // cuando la sesión es de cliente (el admin no tiene fila en la tabla).
    const { data: client } = await db
      .from("pintao_clients")
      .select("name")
      .eq("email", email)
      .maybeSingle();
    if (client?.name) name = String(client.name);
  }
  return {
    id: String(data.user_id ?? email),
    name,
    email,
    role,
  };
}

/** Sesión del usuario actual a partir de la cookie. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return getSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function destroySession(token: string | undefined): Promise<{ ok: boolean }> {
  if (!token) return { ok: true };
  const db = getDb();
  if (!db) {
    destroyMemorySession(token);
    return { ok: true };
  }
  const { error } = await db.from("pintao_sessions").delete().eq("token_hash", sha256(token));
  return { ok: !error };
}

export async function getCurrentUserId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  return (await getSessionUser())?.email ?? null;
}
