"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "./providers";
import { products } from "@/lib/products";
import { formatCOP, unitPriceWithDiscount } from "@/lib/format";
import { computePricing, COUPONS, FREE_SHIPPING_THRESHOLD, SHIPPING_RATES } from "@/lib/pricing";
import type { PaymentMethod, ShippingMethod } from "@/lib/types";

const SHIPPING_OPTIONS: { id: ShippingMethod; label: string; desc: string; eta: string }[] = [
  { id: "recoge", label: "Recoger en tienda", desc: "Gratis — 24 h después de confirmar", eta: "24 h" },
  { id: "envio", label: "Envío nacional", desc: "Coordinadora / Interrapidísimo", eta: "3-5 días" },
  { id: "expreso", label: "Envío exprés prioritario", desc: "Despacho el mismo día hábil", eta: "24-48 h" },
];

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; desc: string }[] = [
  { id: "Transferencia", label: "Transferencia bancaria", desc: "Recibes los datos por WhatsApp" },
  { id: "Enlace de pago", label: "Enlace de pago", desc: "Tarjeta o PSE (Wompi)" },
  { id: "PSE", label: "PSE", desc: "Débito desde tu banco colombiano" },
  // Sin recargo: el motor de precios (`lib/pricing.ts`) no aplica ninguno, así que
  // el copy no puede prometerlo.
  { id: "Contraentrega", label: "Contraentrega", desc: "Pagas al recibir el pedido" },
];

/** Métodos que pueden resolverse con el enlace de pago de Wompi. */
const ONLINE_METHODS: PaymentMethod[] = ["Enlace de pago", "PSE"];

/**
 * Campos del paso 1.
 *
 * Viven en estado controlado de React: antes el formulario se remontaba al
 * cambiar de paso (`<motion.form key={step}>`) y el paso 2 leía `FormData` de un
 * formulario sin campos de cliente, así que **todo pedido fallaba** con
 * "Nombre requerido".
 */
interface FormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  address2: string;
  city: string;
  region: string;
  postal: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  address2: "",
  city: "",
  region: "",
  postal: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function validateCustomer(form: FormState, needsAddress: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (form.name.trim().length < 2) errors.name = "Escribe el nombre de quien recibe.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Escribe un correo válido.";
  const digits = form.phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 20) {
    errors.phone = "Escribe un WhatsApp válido (7 a 20 dígitos).";
  }
  if (needsAddress) {
    if (form.address.trim().length < 4) errors.address = "La dirección es obligatoria para envíos.";
    if (form.city.trim().length < 2) errors.city = "Indica la ciudad.";
    if (form.region.trim().length < 2) errors.region = "Indica el departamento.";
  }
  return errors;
}

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-display text-xs transition-colors ${
        done
          ? "border-accent bg-accent text-noir"
          : active
            ? "border-accent bg-accent/10 text-accent"
            : "border-line text-mute"
      }`}
    >
      {done ? "✓" : n}
    </span>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-danger">
      {message}
    </p>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { items, clear, coupon, setCoupon } = useCart();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("envio");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Transferencia");

  const totalQty = items.reduce((n, i) => n + i.qty, 0);
  const summary = useMemo(
    () =>
      items
        .map((item) => {
          const product = products.find((p) => p.id === item.productId);
          if (!product) return null;
          return { ...item, product, unit: unitPriceWithDiscount(product.price, totalQty) };
        })
        .filter(Boolean) as Array<{
        productId: number;
        size: string;
        qty: number;
        product: (typeof products)[number];
        unit: number;
      }>,
    [items, totalQty],
  );

  const subtotal = summary.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const pricing = computePricing({ subtotal, totalQty, couponCode: coupon, shippingMethod });
  const total = pricing.total;

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponMsg({ ok: false, text: "Escribe un código para aplicar." });
      return;
    }
    if (COUPONS[code]) {
      setCoupon(code);
      setCouponMsg({ ok: true, text: `✓ Cupón ${code} aplicado (-${COUPONS[code] * 100}%).` });
    } else {
      setCoupon(undefined);
      setCouponMsg({ ok: false, text: `"${code}" no es válido. Prueba PINTAO10 o DROP01.` });
    }
  }

  /** Valida el paso 1; si falla se queda en él con los campos marcados. */
  function goToPayment() {
    const errors = validateCustomer(form, shippingMethod !== "recoge");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Revisa los campos marcados para continuar.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateCustomer(form, shippingMethod !== "recoge");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Revisa los campos marcados para continuar.");
      setStep(1);
      return;
    }
    setLoading(true);
    setError(null);
    setPaymentNote(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: form.name, email: form.email, phone: form.phone },
          paymentMethod,
          shippingMethod,
          address:
            shippingMethod === "recoge"
              ? undefined
              : {
                  line1: form.address,
                  line2: form.address2 || undefined,
                  city: form.city,
                  region: form.region,
                  postalCode: form.postal || undefined,
                },
          items: summary.map((l) => ({ productId: l.productId, size: l.size, qty: l.qty })),
          coupon,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No pudimos registrar tu pedido. Intenta de nuevo.");
        return;
      }

      const orderId: string = data.id;
      clear();
      setDone(orderId);

      // Si el medio elegido es en línea pedimos el enlace de pago real.
      // El pedido ya quedó registrado, así que un fallo aquí no pierde la compra.
      if (ONLINE_METHODS.includes(paymentMethod)) {
        const payRes = await fetch("/api/payments/wompi/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const pay = await payRes.json().catch(() => ({}));
        if (payRes.ok && pay.paymentUrl) {
          setPaymentUrl(pay.paymentUrl);
        } else {
          setPaymentNote(
            pay.error ??
              "El pago en línea no está disponible en este momento. Te escribimos por WhatsApp para coordinarlo.",
          );
        }
      }
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card-surface mx-auto max-w-md p-10 text-center">
        <motion.p
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 220 }}
          className="font-display text-6xl text-accent"
        >
          ✓
        </motion.p>
        <p className="eyebrow mt-3">PEDIDO RECIBIDO</p>
        <h1 className="display-title mt-2 text-3xl">Gracias.</h1>
        <p className="mt-3 text-sm text-sand">
          Tu solicitud <strong className="text-cream">#{done}</strong> quedó pendiente de
          confirmación. El equipo valida inventario y pago antes de despachar.
        </p>
        {paymentUrl && (
          <a
            href={paymentUrl}
            className="btn-solid mt-6 w-full"
            rel="noreferrer noopener"
            target="_blank"
          >
            PAGAR AHORA EN WOMPI →
          </a>
        )}
        {paymentNote && (
          <p className="mt-5 rounded-xl border border-line bg-ash/60 p-3 text-xs text-sand">
            {paymentNote}
          </p>
        )}
        <button onClick={() => router.push("/cuenta")} className="btn-ghost mt-4 w-full">
          VER MIS PEDIDOS
        </button>
        <button
          onClick={() => router.push("/tienda")}
          className="mt-4 text-[11px] tracking-[0.25em] text-mute transition hover:text-cream"
        >
          SEGUIR EXPLORANDO
        </button>
      </div>
    );
  }

  if (summary.length === 0) {
    return (
      <div className="card-surface p-10 text-center">
        <p className="font-display text-xl uppercase">Tu carrito está vacío</p>
        <p className="mt-2 text-sm text-sand">Arma tu pinta antes de pasar al checkout.</p>
        <Link href="/tienda" className="btn-solid mt-5">
          IR A LA TIENDA
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <div className="flex items-center gap-3" aria-label="Progreso del checkout">
          {[
            { n: 1, label: "Datos y envío" },
            { n: 2, label: "Pago y confirmación" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              {i > 0 && <span className="h-px w-8 bg-line sm:w-12" />}
              <button
                onClick={() => s.n < step && setStep(s.n)}
                className={`flex items-center gap-2 ${s.n < step ? "cursor-pointer" : "cursor-default"}`}
                aria-current={s.n === step ? "step" : undefined}
              >
                <StepBadge n={s.n} active={s.n === step} done={s.n < step} />
                <span
                  className={`font-display text-[11px] tracking-[0.2em] ${s.n === step ? "text-cream" : "text-mute"}`}
                >
                  {s.label}
                </span>
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="card-surface space-y-5 p-8" noValidate>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {step === 1 ? (
                <>
                  <h2 className="display-title text-2xl">1. Tus datos.</h2>
                  <p className="text-xs text-sand">Te contactamos solo para coordinar la entrega.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="eyebrow mb-2 block">
                        NOMBRE O EMPRESA *
                      </label>
                      <input
                        id="name"
                        name="name"
                        className="field"
                        autoComplete="name"
                        placeholder="Nombre de quien recibe"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.name)}
                        aria-describedby={fieldErrors.name ? "name-error" : undefined}
                      />
                      <FieldError id="name-error" message={fieldErrors.name} />
                    </div>
                    <div>
                      <label htmlFor="phone" className="eyebrow mb-2 block">
                        WHATSAPP *
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        inputMode="tel"
                        className="field"
                        autoComplete="tel"
                        placeholder="+57 300 000 0000"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.phone)}
                        aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                      />
                      <FieldError id="phone-error" message={fieldErrors.phone} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="eyebrow mb-2 block">
                      CORREO *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="field"
                      autoComplete="email"
                      placeholder="tu@correo.com"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    />
                    <FieldError id="email-error" message={fieldErrors.email} />
                  </div>

                  <div>
                    <h3 className="display-title text-xl">Método de entrega.</h3>
                    <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Método de entrega">
                      {SHIPPING_OPTIONS.map((opt) => {
                        const active = shippingMethod === opt.id;
                        const rate = SHIPPING_RATES[opt.id];
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setShippingMethod(opt.id)}
                            aria-checked={active}
                            role="radio"
                            className={`rounded-2xl border p-4 text-left transition-colors ${
                              active ? "border-accent bg-accent/[0.08]" : "border-line hover:border-accent/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-accent" : "border-line"}`}
                              >
                                {active && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                              </span>
                              <div className="flex-1">
                                <p className="font-display text-sm uppercase tracking-wider">{opt.label}</p>
                                <p className="mt-0.5 text-xs text-sand">{opt.desc}</p>
                                <p className="mt-0.5 text-[10px] tracking-[0.18em] text-mute uppercase">
                                  {opt.eta}
                                </p>
                              </div>
                              <span className={`font-display text-sm ${rate === 0 ? "text-accent" : "text-cream"}`}>
                                {rate === 0 ? "GRATIS" : formatCOP(rate)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {shippingMethod !== "recoge" && (
                      <motion.div
                        initial={reduce ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={reduce ? undefined : { opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label htmlFor="address" className="eyebrow mb-2 block">
                              DIRECCIÓN *
                            </label>
                            <input
                              id="address"
                              name="address"
                              className="field"
                              autoComplete="street-address"
                              placeholder="Calle 10 # 20-30"
                              value={form.address}
                              onChange={(e) => update("address", e.target.value)}
                              aria-required="true"
                              aria-invalid={Boolean(fieldErrors.address)}
                              aria-describedby={fieldErrors.address ? "address-error" : undefined}
                            />
                            <FieldError id="address-error" message={fieldErrors.address} />
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor="address2" className="eyebrow mb-2 block">
                              APTO / REFERENCIA
                            </label>
                            <input
                              id="address2"
                              name="address2"
                              className="field"
                              autoComplete="address-line2"
                              placeholder="Opcional"
                              value={form.address2}
                              onChange={(e) => update("address2", e.target.value)}
                            />
                          </div>
                          <div>
                            <label htmlFor="city" className="eyebrow mb-2 block">
                              CIUDAD *
                            </label>
                            <input
                              id="city"
                              name="city"
                              className="field"
                              autoComplete="address-level2"
                              placeholder="Bogotá"
                              value={form.city}
                              onChange={(e) => update("city", e.target.value)}
                              aria-required="true"
                              aria-invalid={Boolean(fieldErrors.city)}
                              aria-describedby={fieldErrors.city ? "city-error" : undefined}
                            />
                            <FieldError id="city-error" message={fieldErrors.city} />
                          </div>
                          <div>
                            <label htmlFor="region" className="eyebrow mb-2 block">
                              DEPARTAMENTO *
                            </label>
                            <input
                              id="region"
                              name="region"
                              className="field"
                              autoComplete="address-level1"
                              placeholder="Cundinamarca"
                              value={form.region}
                              onChange={(e) => update("region", e.target.value)}
                              aria-required="true"
                              aria-invalid={Boolean(fieldErrors.region)}
                              aria-describedby={fieldErrors.region ? "region-error" : undefined}
                            />
                            <FieldError id="region-error" message={fieldErrors.region} />
                          </div>
                          <div>
                            <label htmlFor="postal" className="eyebrow mb-2 block">
                              CÓDIGO POSTAL
                            </label>
                            <input
                              id="postal"
                              name="postal"
                              className="field"
                              placeholder="Opcional"
                              value={form.postal}
                              onChange={(e) => update("postal", e.target.value)}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <p className="text-sm text-danger" role="alert">
                      {error}
                    </p>
                  )}

                  <button type="button" onClick={goToPayment} className="btn-solid w-full">
                    CONTINUAR AL PAGO →
                  </button>
                </>
              ) : (
                <>
                  <h2 className="display-title text-2xl">2. Pago y confirmación.</h2>
                  <p className="text-xs text-sand">
                    Registramos tu solicitud; el asesor confirma disponibilidad por WhatsApp.
                  </p>

                  <div>
                    <h3 className="display-title text-xl">Medio de pago.</h3>
                    <div
                      className="mt-4 grid gap-3 sm:grid-cols-2"
                      role="radiogroup"
                      aria-label="Medio de pago"
                    >
                      {PAYMENT_OPTIONS.map((opt) => {
                        const active = paymentMethod === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPaymentMethod(opt.id)}
                            aria-checked={active}
                            role="radio"
                            className={`rounded-2xl border p-4 text-left transition-colors ${
                              active ? "border-accent bg-accent/[0.08]" : "border-line hover:border-accent/40"
                            }`}
                          >
                            <p className="font-display text-sm uppercase tracking-wider">{opt.label}</p>
                            <p className="mt-1 text-xs text-sand">{opt.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                    {ONLINE_METHODS.includes(paymentMethod) && (
                      <p className="mt-3 text-xs text-mute">
                        Al confirmar generamos tu enlace de pago de Wompi. Si la pasarela no está
                        disponible, te contactamos por WhatsApp.
                      </p>
                    )}
                  </div>

                  {error && (
                    <p className="text-sm text-danger" role="alert">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1">
                      ← VOLVER
                    </button>
                    <button type="submit" disabled={loading} className="btn-solid flex-1 disabled:opacity-50">
                      {loading ? "REGISTRANDO…" : "CONFIRMAR PEDIDO"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </form>

        {/* Resumen */}
        <aside className="card-surface h-fit p-6 lg:sticky lg:top-24">
          <p className="eyebrow mb-4">TU PEDIDO</p>
          <div className="space-y-4">
            {summary.map((l) => (
              <div key={`${l.productId}-${l.size}`} className="flex gap-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ash">
                  <Image src={l.product.img} alt={l.product.name} fill sizes="56px" className="object-cover" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-display uppercase leading-tight">{l.product.name}</p>
                  <p className="text-xs text-sand">
                    Talla {l.size} × {l.qty}
                  </p>
                </div>
                <p className="font-display text-xs text-accent">{formatCOP(l.unit * l.qty)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCoupon();
                }
              }}
              placeholder="Cupón (PINTAO10 / DROP01)"
              aria-label="Código de cupón"
              className="field !py-2 text-xs uppercase tracking-wider placeholder:normal-case"
            />
            <button
              onClick={applyCoupon}
              type="button"
              className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 font-display text-[11px] tracking-widest text-accent transition hover:bg-accent hover:text-noir"
            >
              APLICAR
            </button>
          </div>
          {couponMsg && (
            <p
              className={`mt-3 text-xs ${couponMsg.ok ? "text-accent" : "text-danger"}`}
              role="status"
              aria-live="polite"
            >
              {couponMsg.text}
            </p>
          )}

          <div className="mt-6 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-sand">Subtotal</span>
              <span>{formatCOP(subtotal)}</span>
            </div>
            {pricing.volumeDiscount > 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-sand">Descuento por volumen</span>
                <span className="font-semibold text-accent">−{formatCOP(pricing.volumeDiscount)}</span>
              </div>
            )}
            {pricing.couponDiscount > 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-sand">Cupón {pricing.coupon?.code}</span>
                <span className="font-semibold text-accent">−{formatCOP(pricing.couponDiscount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between">
              <span className="text-sand">Envío</span>
              <span className={pricing.shipping === 0 ? "font-semibold text-accent" : ""}>
                {pricing.shipping === 0 ? "GRATIS" : formatCOP(pricing.shipping)}
              </span>
            </div>
            {pricing.shipping > 0 && (
              <p className="mt-2 text-xs text-mute">
                {shippingMethod === "expreso"
                  ? "Exprés gratis desde " + formatCOP(FREE_SHIPPING_THRESHOLD * 2) + "."
                  : "Envío gratis desde " + formatCOP(FREE_SHIPPING_THRESHOLD) + "."}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="eyebrow">TOTAL</span>
              <span className="font-display text-xl text-accent">{formatCOP(total)}</span>
            </div>
            <p className="mt-3 text-xs text-mute">
              El checkout registra la solicitud de pedido; un asesor confirma inventario y pago antes
              de despachar.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
