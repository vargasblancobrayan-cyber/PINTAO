import crypto from "crypto";
import type { Order, Quote, User } from "./types";

/**
 * Store en memoria para desarrollo/demo.
 * Fase de Supabase: esta capa se sustituye por el cliente de Postgres sin
 * cambiar las rutas API (misma interfaz).
 */
const DEMO_USERS: (User & { password: string })[] = [
  { id: "u-admin", name: "Administrador", email: "admin@pintao.local", password: "Pintao2026!", role: "admin" },
  { id: "u-client", name: "Cliente Demo PINTAO", email: "cliente@pintao.local", password: "Cliente2026!", role: "customer" },
];

interface SessionEntry {
  userId: string;
  role: "customer" | "admin";
  expires: number;
}

const SESSION_TTL = 1000 * 60 * 60 * 10; // 10 h
const sessions = new Map<string, SessionEntry>();
const orders: Order[] = [];
const quotes: Quote[] = [];
const newsletter = new Set<string>();

export function createSession(user: User) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, role: user.role, expires: Date.now() + SESSION_TTL });
  return token;
}

export function getSession(token: string | undefined): User | null {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s || s.expires < Date.now()) return null;
  const user = DEMO_USERS.find((u) => u.id === s.userId);
  return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
}

export function destroySession(token: string | undefined) {
  if (token) sessions.delete(token);
}

export function findUserByCredentials(email: string, password: string): User | null {
  const u = DEMO_USERS.find(
    (x) => x.email === email.toLowerCase().trim() && x.password === password,
  );
  return u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null;
}

export function addOrder(order: Order) {
  orders.push(order);
  return order;
}

export function addQuote(quote: Quote) {
  quotes.push(quote);
  return quote;
}

export function subscribeNewsletter(email: string) {
  newsletter.add(email.toLowerCase().trim());
}

export function getOrders(): Order[] {
  return orders.slice().reverse();
}

export function getQuotes(): Quote[] {
  return quotes.slice().reverse();
}

export function getCustomerOrders(email: string): Order[] {
  return orders.filter((o) => o.customer.email === email).slice().reverse();
}
