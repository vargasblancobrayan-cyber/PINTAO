const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SECRET_KEYS = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
const API_KEY = SECRET_KEYS.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SESSION_SECONDS = 60 * 60 * 10;
const PBKDF2_ITERATIONS = 210_000;

type Store = {
  products: any[];
  users: any[];
  orders: any[];
  quotes: any[];
  newsletter: any[];
  settings: Record<string, any>;
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const encoder = new TextEncoder();

function clean(value: unknown, max = 160) {
  return String(value ?? '').trim().slice(0, max);
}

function hex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string) {
  const bytes = new Uint8Array(Math.floor(value.length / 2));
  for (let index = 0; index < bytes.length; index++) bytes[index] = parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

async function sha256(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

async function passwordHash(password: string, saltHex: string, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations }, key, 256);
  return hex(new Uint8Array(bits));
}

function secureEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index++) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

function randomHex(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

function baseHeaders(req?: Request) {
  const origin = req?.headers.get('origin');
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    ...(origin ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', vary: 'Origin' } : {}),
  };
}

function json(req: Request, status: number, data: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...baseHeaders(req), ...extra } });
}

async function parseBody(req: Request) {
  const length = Number(req.headers.get('content-length') || 0);
  if (length > 1_000_000) throw new HttpError(413, 'Solicitud demasiado grande');
  const raw = await req.text();
  if (raw.length > 1_000_000) throw new HttpError(413, 'Solicitud demasiado grande');
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, 'JSON inválido');
  }
}

async function db(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !API_KEY) throw new Error('Configuración de datos incompleta');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: API_KEY,
      'content-type': 'application/json',
      ...((init.headers as Record<string, string>) || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Database request failed', response.status, detail.slice(0, 500));
    throw new Error('No fue posible acceder a los datos');
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function getState(): Promise<{ data: Store; version: number }> {
  const rows = await db('pintao_store?id=eq.1&select=data,version');
  if (!rows?.[0]) throw new Error('La tienda no está inicializada');
  return rows[0];
}

async function mutateState<T>(change: (store: Store) => T | Promise<T>): Promise<T> {
  for (let retry = 0; retry < 7; retry++) {
    const current = await getState();
    const next = structuredClone(current.data);
    const result = await change(next);
    const rows = await db(`pintao_store?id=eq.1&version=eq.${current.version}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ data: next, version: current.version + 1, updated_at: new Date().toISOString() }),
    });
    if (rows?.length) return result;
  }
  throw new HttpError(409, 'La tienda recibió otra actualización. Intenta nuevamente.');
}

function cookies(req: Request) {
  return Object.fromEntries((req.headers.get('cookie') || '').split(';').map((item) => item.trim()).filter(Boolean).map((item) => {
    const separator = item.indexOf('=');
    return [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))];
  }));
}

function cookieName(role: 'admin' | 'customer') {
  return role === 'admin' ? 'pu_admin' : 'pu_customer';
}

function sessionCookie(role: 'admin' | 'customer', token: string, clear = false) {
  return `${cookieName(role)}=${clear ? '' : token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_SECONDS}`;
}

async function createSession(role: 'admin' | 'customer', data: { userId?: string; email?: string }) {
  const token = randomHex();
  await db('pintao_sessions', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      token_hash: await sha256(token),
      role,
      user_id: data.userId || null,
      email: data.email || null,
      expires_at: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
    }),
  });
  return token;
}

async function getSession(req: Request, role: 'admin' | 'customer') {
  const token = cookies(req)[cookieName(role)];
  if (!token) return null;
  const tokenHash = await sha256(token);
  const rows = await db(`pintao_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}&role=eq.${role}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=*`);
  const entry = rows?.[0] || null;
  if (entry) {
    await db(`pintao_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ expires_at: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString() }),
    });
  }
  return entry;
}

async function clearSession(req: Request, role: 'admin' | 'customer') {
  const token = cookies(req)[cookieName(role)];
  if (token) await db(`pintao_sessions?token_hash=eq.${encodeURIComponent(await sha256(token))}`, { method: 'DELETE' });
}

function safeUser(user: any) {
  return { id: user.id, name: user.name, email: user.email, type: user.type, createdAt: user.createdAt };
}

function enrichProduct(product: any) {
  return { ...product, keywords: [product.name, product.category, product.color, product.description, ...(product.sizes || [])].join(' ').toLowerCase() };
}

function buildVariants(id: number, sizes: string[], color: string, stock: number) {
  const base = Math.floor(stock / sizes.length);
  const extra = stock % sizes.length;
  return sizes.map((size, index) => ({ size, color, stock: base + (index < extra ? 1 : 0), sku: `PNT-${id}-${String(size).replace(/\s/g, '')}` }));
}

function rate(count: number) {
  return count >= 48 ? .25 : count >= 24 ? .18 : count >= 12 ? .10 : 0;
}

function stats(store: Store) {
  return {
    products: store.products.length,
    orders: store.orders.length,
    customers: store.users.length,
    revenue: store.orders.filter((order) => ['Pagado', 'Enviado', 'Completado'].includes(order.status)).reduce((sum, order) => sum + order.total, 0),
    lowStock: store.products.filter((product) => product.stock < 10).length,
    recentOrders: store.orders.slice(-8).reverse(),
  };
}

function requestPath(req: Request) {
  const pathname = new URL(req.url).pathname;
  const marker = '/store-api';
  const offset = pathname.indexOf(marker);
  const path = offset >= 0 ? pathname.slice(offset + marker.length) : pathname;
  return path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;
}

function validMutationOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const forwarded = (req.headers.get('x-forwarded-host') || '').split(',')[0].trim().toLowerCase();
    const storefrontHosts = new Set([
      'pintao-store.vercel.app',
      'pintao-store-vargasblancobrayan-9578s-projects.vercel.app',
    ]);
    return Boolean((forwarded && forwarded === originHost) || storefrontHosts.has(originHost));
  } catch {
    return false;
  }
}

async function attemptBlocked(key: string) {
  const attemptKey = await sha256(key);
  const rows = await db(`pintao_login_attempts?attempt_key=eq.${attemptKey}&select=*`);
  const row = rows?.[0];
  if (!row) return false;
  const age = Date.now() - new Date(row.window_started).getTime();
  return age < 10 * 60 * 1000 && row.attempt_count >= 5;
}

async function recordAttempt(key: string, success: boolean) {
  const attemptKey = await sha256(key);
  if (success) {
    await db(`pintao_login_attempts?attempt_key=eq.${attemptKey}`, { method: 'DELETE' });
    return;
  }
  const rows = await db(`pintao_login_attempts?attempt_key=eq.${attemptKey}&select=*`);
  const row = rows?.[0];
  const expired = !row || Date.now() - new Date(row.window_started).getTime() >= 10 * 60 * 1000;
  await db('pintao_login_attempts?on_conflict=attempt_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ attempt_key: attemptKey, attempt_count: expired ? 1 : row.attempt_count + 1, window_started: expired ? new Date().toISOString() : row.window_started }),
  });
}

async function requireAdmin(req: Request) {
  if (!await getSession(req, 'admin')) throw new HttpError(401, 'Inicia sesión como administrador');
}

async function api(req: Request) {
  const path = requestPath(req);
  if (['POST', 'PATCH', 'DELETE'].includes(req.method) && !validMutationOrigin(req)) throw new HttpError(403, 'Origen no permitido');

  if (req.method === 'GET' && path === '/api/health') {
    const { data } = await getState();
    return json(req, 200, { ok: true, products: data.products.length, orders: data.orders.length });
  }
  if (req.method === 'GET' && path === '/api/settings') return json(req, 200, (await getState()).data.settings);
  if (req.method === 'GET' && path === '/api/products') return json(req, 200, (await getState()).data.products.filter((product) => product.active).map(enrichProduct));
  if (req.method === 'GET' && /^\/api\/products\/\d+$/.test(path)) {
    const product = (await getState()).data.products.find((item) => item.id === Number(path.split('/').pop()) && item.active);
    return product ? json(req, 200, enrichProduct(product)) : json(req, 404, { error: 'Producto no encontrado' });
  }

  if (req.method === 'POST' && path === '/api/admin/login') {
    const body = await parseBody(req);
    const email = clean(body.email).toLowerCase();
    const client = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0];
    const attemptKey = `admin:${client}:${email}`;
    if (await attemptBlocked(attemptKey)) throw new HttpError(429, 'Espera unos minutos antes de intentarlo de nuevo');
    const rows = await db(`pintao_admin_users?email=eq.${encodeURIComponent(email)}&select=*`);
    const admin = rows?.[0];
    const candidate = admin ? await passwordHash(String(body.password || ''), admin.password_salt, admin.password_iterations) : '';
    if (!admin || !secureEqual(candidate, admin.password_hash)) {
      await recordAttempt(attemptKey, false);
      throw new HttpError(401, 'Credenciales administrativas incorrectas');
    }
    await recordAttempt(attemptKey, true);
    const token = await createSession('admin', { email });
    return json(req, 200, { ok: true, user: { name: 'Administrador', email } }, { 'set-cookie': sessionCookie('admin', token) });
  }
  if (req.method === 'GET' && path === '/api/admin/session') {
    const admin = await getSession(req, 'admin');
    return admin ? json(req, 200, { authenticated: true, user: { name: 'Administrador', email: admin.email } }) : json(req, 401, { authenticated: false });
  }
  if (req.method === 'POST' && path === '/api/admin/logout') {
    await clearSession(req, 'admin');
    return json(req, 200, { ok: true }, { 'set-cookie': sessionCookie('admin', '', true) });
  }

  if (path.startsWith('/api/admin/')) await requireAdmin(req);
  if ((path === '/api/products' || /^\/api\/products\/\d+$/.test(path)) && ['POST', 'PATCH', 'DELETE'].includes(req.method)) await requireAdmin(req);

  if (req.method === 'GET' && path === '/api/admin/stats') return json(req, 200, stats((await getState()).data));
  if (req.method === 'GET' && path === '/api/admin/orders') return json(req, 200, (await getState()).data.orders.slice().reverse());
  if (req.method === 'GET' && path === '/api/admin/quotes') return json(req, 200, (await getState()).data.quotes.slice().reverse());
  if (req.method === 'GET' && path === '/api/admin/customers') return json(req, 200, (await getState()).data.users.map(safeUser));

  if (req.method === 'PATCH' && path === '/api/admin/settings') {
    const body = await parseBody(req);
    const settings = await mutateState((store) => {
      store.settings = {
        ...store.settings,
        brand: clean(body.brand, 80) || store.settings.brand,
        whatsapp: clean(body.whatsapp, 30).replace(/\D/g, ''),
        minOrder: Math.max(1, Number(body.minOrder || store.settings.minOrder)),
        freeShipping: Math.max(0, Number(body.freeShipping || store.settings.freeShipping)),
      };
      return store.settings;
    });
    return json(req, 200, settings);
  }

  if (req.method === 'POST' && path === '/api/products') {
    const body = await parseBody(req);
    const name = clean(body.name);
    const price = Number(body.price);
    if (!name || !Number.isFinite(price) || price <= 0) throw new HttpError(400, 'Nombre y precio válidos son obligatorios');
    const product = await mutateState((store) => {
      const sizes = Array.isArray(body.sizes) && body.sizes.length ? body.sizes.map((size: unknown) => clean(size, 20)) : ['ÚNICA'];
      const stock = Math.max(0, Number(body.stock || 0));
      const id = Date.now();
      const image = clean(body.img, 500) || store.products[0]?.img || '';
      const item = {
        id, name, price, category: clean(body.category) || 'Camisetas', color: clean(body.color) || 'Negro', sizes, stock,
        img: image, gallery: [image], description: clean(body.description, 500) || 'Referencia disponible para compra mayorista.',
        composition: clean(body.composition, 300), care: clean(body.care, 300),
        variants: buildVariants(id, sizes, clean(body.color) || 'Negro', stock), tag: clean(body.tag, 30) || 'NUEVO', active: true,
      };
      store.products.push(item);
      return enrichProduct(item);
    });
    return json(req, 201, product);
  }

  if (req.method === 'PATCH' && /^\/api\/products\/\d+$/.test(path)) {
    const id = Number(path.split('/').pop());
    const body = await parseBody(req);
    const product = await mutateState((store) => {
      const item = store.products.find((candidate) => candidate.id === id);
      if (!item) throw new HttpError(404, 'Producto no encontrado');
      for (const key of ['name', 'category', 'color', 'img', 'description', 'composition', 'care', 'tag']) if (body[key] !== undefined) item[key] = clean(body[key], 500);
      if (body.price !== undefined) item.price = Math.max(1, Number(body.price));
      if (body.active !== undefined) item.active = Boolean(body.active);
      if (Array.isArray(body.sizes) && body.sizes.length) {
        item.sizes = body.sizes.map((size: unknown) => clean(size, 20));
        item.variants = buildVariants(item.id, item.sizes, item.color, Number(body.stock ?? item.stock));
      } else if (body.stock !== undefined) item.variants = buildVariants(item.id, item.sizes, item.color, Math.max(0, Number(body.stock)));
      item.stock = item.variants.reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0);
      item.gallery = [item.img];
      return enrichProduct(item);
    });
    return json(req, 200, product);
  }

  if (req.method === 'DELETE' && /^\/api\/products\/\d+$/.test(path)) {
    const id = Number(path.split('/').pop());
    await mutateState((store) => {
      const product = store.products.find((candidate) => candidate.id === id);
      if (!product) throw new HttpError(404, 'Producto no encontrado');
      product.active = false;
      return null;
    });
    return json(req, 200, { ok: true });
  }

  if (req.method === 'PATCH' && /^\/api\/admin\/orders\/.+/.test(path)) {
    const id = decodeURIComponent(path.split('/').pop() || '');
    const body = await parseBody(req);
    const allowed = ['Pendiente de confirmación', 'Pagado', 'Enviado', 'Completado', 'Cancelado'];
    if (!allowed.includes(body.status)) throw new HttpError(400, 'Estado no válido');
    const order = await mutateState((store) => {
      const item = store.orders.find((candidate) => candidate.id === id);
      if (!item) throw new HttpError(404, 'Pedido no encontrado');
      if (body.status === 'Cancelado' && !item.stockReleased) {
        for (const orderItem of item.items) {
          const product = store.products.find((candidate) => candidate.id === orderItem.productId);
          const variant = product?.variants?.find((candidate: any) => candidate.size === orderItem.size);
          if (variant) { variant.stock += orderItem.qty; product.stock += orderItem.qty; }
        }
        item.stockReleased = true;
      }
      item.status = body.status;
      return item;
    });
    return json(req, 200, order);
  }

  if (req.method === 'POST' && path === '/api/register') {
    const body = await parseBody(req);
    const email = clean(body.email).toLowerCase();
    const password = String(body.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) throw new HttpError(400, 'Correo válido y contraseña de 8 caracteres requeridos');
    const salt = randomHex(16);
    const user = await mutateState(async (store) => {
      if (store.users.some((candidate) => candidate.email === email)) throw new HttpError(409, 'El correo ya está registrado');
      const item = { id: crypto.randomUUID(), name: clean(body.name) || 'Cliente mayorista', email, type: clean(body.type) || 'Persona natural', salt, hash: await passwordHash(password, salt), hashAlgorithm: 'pbkdf2-sha256', hashIterations: PBKDF2_ITERATIONS, createdAt: new Date().toISOString() };
      store.users.push(item);
      return item;
    });
    const token = await createSession('customer', { userId: user.id });
    return json(req, 201, { user: safeUser(user) }, { 'set-cookie': sessionCookie('customer', token) });
  }

  if (req.method === 'POST' && path === '/api/login') {
    const body = await parseBody(req);
    const email = clean(body.email).toLowerCase();
    const user = (await getState()).data.users.find((candidate) => candidate.email === email);
    const candidate = user ? await passwordHash(String(body.password || ''), user.salt, user.hashIterations || PBKDF2_ITERATIONS) : '';
    if (!user || user.hashAlgorithm !== 'pbkdf2-sha256' || !secureEqual(candidate, user.hash)) throw new HttpError(401, 'Credenciales incorrectas');
    const token = await createSession('customer', { userId: user.id });
    return json(req, 200, { user: safeUser(user) }, { 'set-cookie': sessionCookie('customer', token) });
  }

  if (req.method === 'POST' && path === '/api/logout') {
    await clearSession(req, 'customer');
    return json(req, 200, { ok: true }, { 'set-cookie': sessionCookie('customer', '', true) });
  }

  if (req.method === 'GET' && path === '/api/account') {
    const entry = await getSession(req, 'customer');
    if (!entry) throw new HttpError(401, 'Inicia sesión');
    const store = (await getState()).data;
    const user = store.users.find((candidate) => candidate.id === entry.user_id);
    if (!user) throw new HttpError(401, 'Sesión inválida');
    return json(req, 200, { user: safeUser(user), orders: store.orders.filter((order) => order.customer?.email === user.email).slice().reverse() });
  }

  if (req.method === 'POST' && path === '/api/orders') {
    const body = await parseBody(req);
    if (!Array.isArray(body.items) || !body.items.length) throw new HttpError(400, 'El pedido está vacío');
    const customer = {
      name: clean(body.customer?.name), email: clean(body.customer?.email).toLowerCase(), phone: clean(body.customer?.phone, 30),
      document: clean(body.customer?.document, 40), city: clean(body.customer?.city, 80), address: clean(body.customer?.address, 180),
      type: clean(body.customer?.type) || 'Persona natural',
    };
    if (!customer.name || !/^\S+@\S+\.\S+$/.test(customer.email) || !customer.phone || !customer.address) throw new HttpError(400, 'Completa correctamente los datos de entrega');
    const order = await mutateState((store) => {
      let base = 0;
      let count = 0;
      const items = [];
      for (const requested of body.items) {
        const product = store.products.find((candidate) => candidate.id === Number(requested.id) && candidate.active);
        const qty = Math.max(1, Math.min(99, Number(requested.qty || 1)));
        const variant = product?.variants?.find((candidate: any) => candidate.size === clean(requested.size, 20));
        if (!product || !variant || variant.stock < qty) throw new HttpError(409, `Inventario insuficiente para ${product?.name || 'el producto seleccionado'}`);
        base += product.price * qty;
        count += qty;
        items.push({ productId: product.id, name: product.name, price: product.price, qty, size: variant.size, img: product.img });
      }
      if (count < Number(store.settings.minOrder || 1)) throw new HttpError(400, `El pedido mínimo es de ${store.settings.minOrder} unidades combinadas`);
      for (const item of items) {
        const product = store.products.find((candidate) => candidate.id === item.productId);
        const variant = product.variants.find((candidate: any) => candidate.size === item.size);
        variant.stock -= item.qty;
        product.stock -= item.qty;
      }
      const discount = rate(count);
      const coupon = String(body.coupon || '').toUpperCase() === 'PINTAO10' ? .10 : 0;
      const item = {
        id: `PNT-${Date.now().toString().slice(-8)}`, items, base, discount, coupon,
        total: Math.round(base * (1 - discount) * (1 - coupon)), status: 'Pendiente de confirmación', customer,
        payment: ['Transferencia bancaria', 'Enlace de pago'].includes(body.payment) ? body.payment : 'Enlace de pago',
        createdAt: new Date().toISOString(), stockReleased: false,
      };
      store.orders.push(item);
      return item;
    });
    return json(req, 201, order);
  }

  if (req.method === 'POST' && path === '/api/quotes') {
    const body = await parseBody(req);
    const quote = { id: `COT-${Date.now().toString().slice(-6)}`, name: clean(body.name), phone: clean(body.phone, 30), quantity: clean(body.quantity, 60), message: clean(body.message, 800), status: 'Nueva', createdAt: new Date().toISOString() };
    if (!quote.name || !quote.phone) throw new HttpError(400, 'Nombre y WhatsApp son obligatorios');
    await mutateState((store) => { store.quotes.push(quote); return null; });
    return json(req, 201, quote);
  }

  if (req.method === 'POST' && path === '/api/newsletter') {
    const body = await parseBody(req);
    const email = clean(body.email).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Escribe un correo válido');
    await mutateState((store) => {
      if (!store.newsletter.some((entry) => entry.email === email)) store.newsletter.push({ email, createdAt: new Date().toISOString() });
      return null;
    });
    return json(req, 201, { ok: true });
  }

  return json(req, 404, { error: 'Ruta no encontrada' });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin') || '*';
    return new Response('ok', { headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, authorization, apikey', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS', vary: 'Origin' } });
  }
  try {
    return await api(req);
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) return json(req, error.status, { error: error.message });
    return json(req, 500, { error: 'Error interno' });
  }
});
