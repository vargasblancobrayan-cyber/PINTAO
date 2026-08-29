import crypto from "crypto";
import { getDb } from "./db";
import {
  createSession as memCreateSession,
  getSession as memGetSession,
  destroySession as memDestroySession,
  findUserByCredentials as memFindUserByCredentials,
} from "./server-store";
import type { User } from "./types";

/**
 * Auth con persistencia real.
 *
 * - Con Supabase: sesiones en `pintao_sessions` y admin validado contra
 *   `pintao_admin_users` con PBKDF2-SHA256 (210k iteraciones), igual que
 *   la migración de seed y `supabase/functions/store-api`.
 * - Sin Supabase (dev/demo): el store en memoria existente.

 * Los clientes demo (`cliente@pintao.local`) siguen viniendo de memoria
 * incluso en producción (solo el admin se valida contra la BD).
 */

const SESSION_TTL_MS = 1000 * 60 * 60 * 10; // 10 h

function sha256hex(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function pbkdf2(password: string, saltHex: string, iterations: number): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, Buffer.from(saltHex, "hex"), iterations, 32, "sha256", (err, key) => {
      if (err) return reject(err);
      resolve(key.toString("hex"));
    });
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

async function findAdminInDb(email: string, password: string): Promise<User | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from("pintao_admin_users")
    .select("email, password_salt, password_hash, password_iterations")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error || !data) return null;

  const hash = await pbkdf2(password, data.password_salt, data.password_iterations ?? 210_000);
  if (!timingSafeEqual(hash, data.password_hash)) return null;

  return { id: "u-admin", name: "Administrador", email: data.email, role: "admin" };
}

export async function createSession(user: User): Promise<string> {
  const db = getDb();
  if (!db) return memCreateSession(user);

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await db.from("pintao_sessions").upsert(
    {
      token_hash: sha256hex(token),
      role: user.role,
      user_id: user.id,
      email: user.email.toLowerCase().trim(),
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    },
    { onConflict: "token_hash" },
  );

  return token;
}

export async function getSession(token: string | undefined): Promise<User | null> {
  const db = getDb();
  if (!db) return memGetSession(token);
  if (!token) return null;

  const tokenHash = sha256hex(token);
  const { data, error } = await db
    .from("pintao_sessions")
    .select("user_id, email, role, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await db.from("pintao_sessions").delete().eq("token_hash", tokenHash);
    return null;
  }

  return {
    id: data.user_id ?? ("u-" + data.role),
    name: data.role === "admin" ? "Administrador" : "Cliente",
    email: data.email,
    role: data.role,
  };
}

export async function destroySession(token: string | undefined): Promise<void> {
  const db = getDb();
  if (!db) {
    memDestroySession(token);
    return;
  }
  if (!token) return;
  await db.from("pintao_sessions").delete().eq("token_hash", sha256hex(token));
}

/** Busca usuario por credenciales: admin en BD, clientes demo en memoria. */
export async function findUserByCredentials(email: string, password: string): Promise<User | null> {
  const db = getDb();
  const normalized = email.toLowerCase().trim();

  if (db) {
    const admin = await findAdminInDb(normalized, password);
    if (admin) return admin;
  }

  // Clientes demo (memoria) siempre disponibles (dev y prod).
  return memFindUserByCredentials(normalized, password);
}