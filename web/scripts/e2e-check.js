/*
 * Verificación end-to-end de PINTAO.
 *
 * Recorre los flujos críticos contra un servidor ya levantado
 * (`npm run build && npm start`, o `npm run dev`) y devuelve un informe JSON.
 *
 * Uso (el archivo se evalúa como una única expresión, por eso empieza con la
 * función flecha y no con declaraciones):
 *   npx playwright-cli open            # abre una sesión de navegador
 *   npx playwright-cli run-code --filename=scripts/e2e-check.js
 *
 * No forma parte de un runner de test formal (Vitest/Playwright Test siguen
 * pendientes, ver TESTING.md): es la comprobación funcional reproducible que se
 * usó para validar esta iteración.
 */
async (page) => {
  // El runner evalúa este archivo sin acceso a `process`: URL fija y ajustable.
  const BASE = "http://127.0.0.1:3000";
  const results = [];
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

  const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail: String(detail) });

  const wait = (ms) => page.waitForTimeout(ms);

  /* ---------- 1. Home ---------- */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  check(
    "home: hidrata (React monta el árbol)",
    await page.evaluate(() => document.querySelectorAll("a[href^='/producto/']").length > 4),
  );
  check("home: cinta superior con animación", await page.locator(".ticker-track").count() === 1);
  check("home: enlace de salto al contenido", await page.locator("a[href='#contenido']").count() === 1);

  /* ---------- 2. Tienda: filtros ---------- */
  await page.goto(`${BASE}/tienda`, { waitUntil: "networkidle" });
  const before = await page.locator("article").count();
  await page.fill("#d-q", "oversize");
  await wait(250);
  const after = await page.locator("article").count();
  check("tienda: la búsqueda filtra al instante", after > 0 && after < before, `${before} → ${after}`);
  check("tienda: la URL refleja el filtro", page.url().includes("q=oversize"), page.url());
  await page.fill("#d-q", "");
  await wait(200);

  const btn = page.locator("button", { hasText: "FILTROS" });
  check("tienda: botón de filtros móvil existe", (await btn.count()) === 1);

  /* ---------- 3. Carrito ---------- */
  await page.locator("button", { hasText: "Agregar rápido" }).first().click();
  await wait(600);
  const drawer = page.locator("[role=dialog][aria-label='Carrito de compras']");
  check("carrito: el drawer se abre al agregar", await drawer.isVisible());
  check("carrito: muestra progreso de descuento por volumen", (await drawer.locator("text=OFF").count()) > 0);

  await drawer.locator("input[aria-label='Código de cupón']").fill("PINTAO10");
  await drawer.locator("button", { hasText: "APLICAR" }).click();
  await wait(300);
  check("carrito: cupón válido se aplica", (await drawer.locator("text=PINTAO10").count()) > 0);

  // "FINALIZAR COMPRA" es un <Link> (anchor), no un botón.
  await drawer.locator("a", { hasText: "FINALIZAR COMPRA" }).click();
  await page.waitForURL("**/checkout", { timeout: 10000 });
  await wait(800);

  const checkoutCoupon = await page
    .locator("aside")
    .filter({ hasText: "TU PEDIDO" })
    .first()
    .innerText();
  check(
    "carrito → checkout: el cupón se conserva",
    checkoutCoupon.includes("PINTAO10"),
    checkoutCoupon.match(/Cupón[^\n]*/)?.[0] ?? "sin cupón",
  );

  /* ---------- 3b. Comprar ahora desde la ficha ---------- */
  await page.goto(`${BASE}/producto/3`, { waitUntil: 'networkidle' });
  await page.locator('a', { hasText: 'COMPRAR AHORA' }).click();
  await page.waitForURL('**/checkout', { timeout: 10000 });
  await wait(1000);
  // El drawer del carrito no debe quedar abierto tapando el checkout.
  check(
    'comprar ahora: navega al checkout sin abrir el carrito encima',
    (await page.locator("[role=dialog][aria-label='Carrito de compras']").count()) === 0,
  );

  /* ---------- 4. Checkout ---------- */
  await page.fill("#name", "Cliente E2E");
  await page.fill("#phone", "3001234567");
  // El pedido se registra con el correo de la cuenta demo para poder verlo luego
  // en `/cuenta` (el historial filtra por el correo de la sesión).
  await page.fill("#email", "cliente@pintao.local");
  await page.fill("#address", "Calle 100 # 20-30");
  await page.fill("#city", "Bogotá");
  await page.fill("#region", "Cundinamarca");
  await page.locator("button", { hasText: "CONTINUAR AL PAGO" }).click();
  await wait(700);

  // El formulario del newsletter vive en el footer: hay que acotar el locator.
  // Ojo: el título se muestra en mayúsculas vía CSS (`text-transform`), así que
  // la comparación es insensible a mayúsculas.
  const step2 = await page.locator("form").filter({ hasText: "Pago y confirmación" }).innerText();
  check(
    "checkout: avanza al paso 2 sin errores",
    /pago y confirmaci[oó]n/i.test(step2) && !/revisa los campos/i.test(step2),
    step2.split("\n")[0],
  );

  // Volver al paso 1 y comprobar que los datos siguen ahí (bug crítico corregido).
  await page.locator("button", { hasText: "VOLVER" }).click();
  await wait(600);  check(
    "checkout: los datos del cliente sobreviven al cambiar de paso",
    (await page.inputValue("#name")) === "Cliente E2E" &&
      (await page.inputValue("#email")) === "cliente@pintao.local",
    await page.inputValue("#name"),
  );

  // Validación por campo: borrar el correo y comprobar el mensaje.
  await page.fill("#email", "no-es-correo");
  await page.locator("button", { hasText: "CONTINUAR AL PAGO" }).click();
  await wait(400);
  check("checkout: valida el correo antes de avanzar", (await page.locator("#email-error").count()) === 1);
  await page.fill("#email", "cliente@pintao.local");
  await page.locator("button", { hasText: "CONTINUAR AL PAGO" }).click();
  await wait(600);

  await page.locator("button", { hasText: "CONFIRMAR PEDIDO" }).click();
  await page.waitForSelector("text=PEDIDO RECIBIDO", { timeout: 15000 });
  const confirmation = await page.locator("body").innerText();
  const orderId = confirmation.match(/#(PNT-[A-Z0-9]+)/)?.[1] ?? "";
  check("checkout: el pedido se registra", Boolean(orderId), orderId);

  /* ---------- 5. Cuenta del cliente ---------- */
  await page.goto(`${BASE}/acceso`, { waitUntil: "networkidle" });
  await page.fill("#email", "cliente@pintao.local");
  await page.fill("#password", "Cliente2026!");
  await page.locator("button", { hasText: "ENTRAR" }).click();
  await page.waitForURL("**/cuenta", { timeout: 10000 });
  await wait(1200);
  const account = await page.locator("body").innerText();
  check("cuenta: sesión de cliente activa", account.includes("cliente@pintao.local"));
  check("cuenta: el pedido aparece en el historial", account.includes("PNT-"), account.match(/HISTORIAL DE PEDIDOS[^\n]*/)?.[0] ?? "");

  /* ---------- 5b. Registro de cliente ---------- */
  const nuevoEmail = `e2e-${Date.now()}@pintao.local`;
  await page.goto(`${BASE}/acceso`, { waitUntil: "networkidle" });
  await page.locator("button", { hasText: "Créala aquí" }).click();
  await wait(400);
  await page.fill("#name", "Cliente Nuevo E2E");
  await page.fill("#email", nuevoEmail);
  await page.fill("#phone", "3009876543");
  await page.fill("#password", "NuevaClave2026!");
  await page.locator("button", { hasText: "CREAR CUENTA" }).click();
  await page.waitForURL("**/cuenta", { timeout: 15000 });
  await wait(1200);
  const cuentaNueva = await page.locator("body").innerText();
  check("registro: el alta crea la sesión y abre /cuenta", cuentaNueva.includes(nuevoEmail), nuevoEmail);
  // El nombre se pinta con `text-transform: uppercase`, así que `innerText`
  // devuelve mayúsculas: se compara sin distinguir mayúsculas de minúsculas.
  check(
    "registro: muestra el nombre registrado",
    cuentaNueva.toUpperCase().includes("CLIENTE NUEVO E2E"),
    cuentaNueva.match(/BIENVENIDO[^\n]*\n?[^\n]*/)?.[0].replace(/\s+/g, " ") ?? "",
  );

  // Correo duplicado: debe quedarse en /acceso avisando del conflicto.
  await page.goto(`${BASE}/acceso`, { waitUntil: "networkidle" });
  await page.locator("button", { hasText: "Créala aquí" }).click();
  await wait(400);
  await page.fill("#name", "Otra Persona");
  await page.fill("#email", nuevoEmail);
  await page.fill("#password", "OtraClave2026!");
  await page.locator("button", { hasText: "CREAR CUENTA" }).click();
  await wait(1000);
  const dupBody = await page.locator("body").innerText();
  check(
    "registro: un correo duplicado se rechaza (409)",
    page.url().includes("/acceso") && dupBody.includes("ya tiene una cuenta"),
    dupBody.match(/ya tiene una cuenta[^\n]*/)?.[0] ?? "sin aviso",
  );

  // Volver a entrar con la cuenta recién creada.
  await page.locator("button", { hasText: "Inicia sesión" }).click();
  await wait(300);
  await page.fill("#email", nuevoEmail);
  await page.fill("#password", "NuevaClave2026!");
  await page.locator("button", { hasText: "ENTRAR" }).click();
  await page.waitForURL("**/cuenta", { timeout: 15000 });
  await wait(1000);
  check(
    "registro: se puede entrar con la cuenta nueva",
    (await page.locator("body").innerText()).includes(nuevoEmail),
  );

  /* ---------- 6. Panel admin ---------- */
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "admin@pintao.local");
  await page.fill("#password", "Pintao2026!");
  await page.locator("button", { hasText: "ENTRAR" }).click();
  await page.waitForURL("**/admin", { timeout: 10000 });
  await wait(1500);
  const admin = await page.locator("body").innerText();
  check("admin: el dashboard carga con sesión", admin.includes("PRODUCTOS") || admin.includes("Pedidos"), admin.slice(0, 80));

  await page.locator("button", { hasText: "PRODUCTOS" }).first().click();
  await wait(1200);
  const inventario = await page.locator("body").innerText();
  check("admin: inventario real (no el stub anterior)", inventario.includes("INVENTARIO") && inventario.includes("STOCK"));
  check("admin: inventario lista referencias", await page.locator("text=Ver ficha").count() > 3);

  // Cambiar el estado de un pedido: el control existía pero devolvía 400
  // ("action desconocido") porque la ruta no entendía el cuerpo que envía la UI.
  await page.locator("button", { hasText: "PEDIDOS" }).first().click();
  await wait(1200);
  const hasOrders = (await page.locator("button", { hasText: "VER DETALLE" }).count()) > 0;
  check("admin: la vista de pedidos lista los pedidos", hasOrders);

  await page.locator("button", { hasText: "Enviado" }).first().click();
  await wait(1600);
  const statuses = await page.evaluate(async () => {
    const res = await fetch("/api/admin/orders", { headers: { accept: "application/json" } });
    const data = await res.json();
    return (data.orders || []).map((o) => o.status);
  });
  check(
    "admin: cambiar el estado de un pedido se persiste",
    statuses.includes("Enviado"),
    statuses.join(", ") || "sin pedidos",
  );

  /* ---------- 7. Newsletter ---------- */
  await page.goto(`${BASE}/informacion`, { waitUntil: "networkidle" });
  await page.fill("input[aria-label='Correo electrónico']", "correo-invalido");
  await page.locator("button[aria-label='Suscribirse']").click();
  await wait(900);
  const newsletterBody = await page.locator("body").innerText();
  check(
    "newsletter: un correo inválido NO reporta éxito",
    !newsletterBody.includes("✓ Suscrito"),
    newsletterBody.includes("correo válido") ? "muestra error" : "sin mensaje",
  );
  await page.fill("input[aria-label='Correo electrónico']", "nuevo@pintao.local");
  await page.locator("button[aria-label='Suscribirse']").click();
  await wait(900);
  check("newsletter: un correo válido confirma", (await page.locator("body").innerText()).includes("✓ Suscrito"));

  /* ---------- 8. Móvil ---------- */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/tienda`, { waitUntil: "networkidle" });
  await wait(500);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("móvil: sin desbordamiento horizontal", overflow <= 1, `overflow=${overflow}px`);
  const quickAdd = page.locator("button", { hasText: "Agregar rápido" }).first();
  check("móvil: 'agregar rápido' visible sin hover", await quickAdd.isVisible());
  await page.locator("button", { hasText: "FILTROS" }).click();
  await wait(500);
  check("móvil: el panel de filtros se despliega", await page.locator("#panel-filtros").isVisible());

  /* ---------- 9. Imágenes y contraste ---------- */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/tienda`, { waitUntil: "networkidle" });
  await wait(1500);
  const broken = await page.evaluate(() =>
    Array.from(document.querySelectorAll("article img"))
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.getAttribute("src") || ""),
  );
  check("imágenes: ninguna rota en el catálogo", broken.length === 0, broken.join(", ").slice(0, 120));

  // Contraste del texto más apagado (usa `--color-mute` sobre el fondo negro).
  const contrast = await page.evaluate(() => {
    const lum = (hex) => {
      const m = hex.match(/\d+/g).map(Number);
      const [r, g, b] = m.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const node =
      document.querySelector(".text-mute") ||
      document.querySelector("p.eyebrow") ||
      document.body;
    if (!node) return { ratio: 0, note: "sin nodos" };
    const fg = getComputedStyle(node).color;
    const bg = getComputedStyle(document.body).backgroundColor;
    const L1 = lum(fg);
    const L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    return { ratio, fg, bg };
  });
  check("accesibilidad: contraste AA del texto apagado", contrast.ratio >= 4.5, `${contrast.ratio.toFixed(2)}:1 (${contrast.fg} sobre ${contrast.bg})`);

  /* ---------- 10. Producto inexistente ---------- */
  const resp = await page.goto(`${BASE}/producto/9999`, { waitUntil: "networkidle" });
  const notFoundHtml = await page.content();
  const status = resp?.status() ?? 0;
  check(
    "404: producto inexistente no queda indexable",
    status === 404 || /name="robots"[^>]*noindex/i.test(notFoundHtml),
    `status=${status} noindex=${/name="robots"[^>]*noindex/i.test(notFoundHtml)}`,
  );
  check("404: muestra la página de no encontrado", notFoundHtml.includes("No está el parche"));

  await page.setViewportSize({ width: 1280, height: 900 });

  const failed = results.filter((r) => !r.ok);
  const lines = [
    `PINTAO E2E · ${results.length - failed.length}/${results.length} OK`,
    ...results.map((r) =>
      `${r.ok ? "PASS" : "FAIL"} · ${r.name}${r.detail ? ` — ${r.detail.replace(/\s+/g, " ").slice(0, 90)}` : ""}`,
    ),
    `errores de consola (${consoleErrors.length}): ${consoleErrors.join(" || ").slice(0, 400) || "ninguno"}`,
  ];
  return lines.join("\n");
}
