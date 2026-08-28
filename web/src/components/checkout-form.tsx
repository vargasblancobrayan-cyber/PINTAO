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
  { id: "envio", label: "Envío nacional", desc: "Coordinadora / Interrap dismo", eta: "3-5 días" },
  { id: "expreso", label: "Envío exprés prioritario", desc: "Despacho el mismo día hábil", eta: "24-48 h" },
];

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; desc: string }[] = [
  { id: "Transferencia", label: "Transferencia bancaria", desc: "Recibes los datos por WhatsApp" },
  { id: "Enlace de pago", label: "Enlace de pago", desc: "Tarjeta o PSE (Wompi/Placetopay)" },
  { id: "PSE", label: "PSE", desc: "Débito desde tu banco colombiano" },
  { id: "Contraentrega", label: "Contraentrega", desc: "Pagas al recibir (aplica recargo)" },
];

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

export function CheckoutForm() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { items, clear } = useCart();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);
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
        .filter(Boolean) as Array<{ productId: number; size: string; qty: number; product: (typeof products)[number]; unit: number }>,
    [items, totalQty],
  );

  const subtotal = summary.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const pricing = computePricing({ subtotal, totalQty, couponCode: appliedCoupon, shippingMethod });
  const total = pricing.total;

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (COUPONS[code]) setAppliedCoupon(code);
    else setAppliedCoupon(undefined);
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (shippingMethod !== "recoge") {
      if (!form.get("address") || !form.get("city") || !form.get("region")) {
        setError("Completa la dirección para el envío.");
        return;
      }
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: {
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
        },
        paymentMethod,
        shippingMethod,
        address: shippingMethod === "recoge" ? undefined : {
          line1: form.get("address"),
          line2: form.get("address2") || undefined,
          city: form.get("city"),
          region: form.get("region"),
          postalCode: form.get("postal") || undefined,
        },
        items: summary.map((l) => ({
          productId: l.productId,
          size: l.size,
          qty: l.qty,
        })),
        coupon: appliedCoupon,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No pudimos registrar tu pedido");
      return;
    }
    const { id } = await res.json();
    clear();
    setDone(id);
  }

  if (done) {
    return (
      <div className="card-surface mx-auto max-w-md p-10 text-center">
        <p className="eyebrow mb-3">PEDIDO RECIBIDO</p>
        <p className="font-display text-6xl text-accent">✓</p>
        <h1 className="display-title mt-4 text-3xl">Gracias.</h1>
        <p className="mt-3 text-sm text-sand">
          Tu solicitud <strong className="text-cream">#{done}</strong> quedó pendiente de confirmación.
          El equipo valida inventario y pago antes de despachar.
        </p>
        <button onClick={() => router.push("/tienda")} className="btn-solid mt-6">SEGUIR EXPLORANDO</button>
      </div>
    );
  }

  if (summary.length === 0) {
    return (
      <div className="card-surface p-10 text-center">
        <p className="font-display text-xl uppercase">Tu carrito está vacío</p>
        <p className="mt-2 text-sm text-sand">Arma tu pinta antes de pasar al checkout.</p>
        <Link href="/tienda" className="btn-solid mt-5">IR A LA TIENDA</Link>
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
                <span className={`font-display text-[11px] tracking-[0.2em] ${s.n === step ? "text-cream" : "text-mute"}`}>
                  {s.label}
                </span>
              </button>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={step}
            onSubmit={submit}
            initial={reduce ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="card-surface space-y-5 p-8"
          >
            {step === 1 ? (
              <>
                <h2 className="display-title text-2xl">1. Tus datos.</h2>
                <p className="text-xs text-sand">Te contactamos solo para coordinar la entrega.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="eyebrow mb-2 block">NOMBRE O EMPRESA *</label>
                    <input id="name" name="name" required className="field" autoComplete="name" placeholder="Nombre de quien recibe" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="eyebrow mb-2 block">WHATSAPP *</label>
                    <input id="phone" name="phone" required className="field" autoComplete="tel" placeholder="+57 300 000 0000" />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="eyebrow mb-2 block">CORREO *</label>
                  <input id="email" name="email" type="email" required className="field" autoComplete="email" placeholder="tu@correo.com" />
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
                            active
                              ? "border-accent bg-accent/[0.08]"
                              : "border-line hover:border-accent/40"
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
                          <label htmlFor="address" className="eyebrow mb-2 block">DIRECCIÓN *</label>
                          <input id="address" name="address" required className="field" autoComplete="street-address" placeholder="Calle 10 # 20-30" />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="address2" className="eyebrow mb-2 block">APTO / REFERENCIA</label>
                          <input id="address2" name="address2" className="field" autoComplete="address-line2" placeholder="Opcional" />
                        </div>
                        <div>
                          <label htmlFor="city" className="eyebrow mb-2 block">CIUDAD *</label>
                          <input id="city" name="city" required className="field" autoComplete="address-level2" placeholder="Bogotá" />
                        </div>
                        <div>
                          <label htmlFor="region" className="eyebrow mb-2 block">DEPARTAMENTO *</label>
                          <input id="region" name="region" required className="field" autoComplete="address-level1" placeholder="Cundinamarca" />
                        </div>
                        <div>
                          <label htmlFor="postal" className="eyebrow mb-2 block">CÓDIGO POSTAL</label>
                          <input id="postal" name="postal" className="field" placeholder="Opcional" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-solid w-full"
                >
                  CONTINUAR AL PAGO →
                </button>
              </>
            ) : (
              <>
                <h2 className="display-title text-2xl">2. Pago y confirmación.</h2>
                <p className="text-xs text-sand">Registramos tu solicitud; el asesor confirma disponibilidad por WhatsApp.</p>

                <div>
                  <h3 className="display-title text-xl">Medio de pago.</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Medio de pago">
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
                            active
                              ? "border-accent bg-accent/[0.08]"
                              : "border-line hover:border-accent/40"
                          }`}
                        >
                          <p className="font-display text-sm uppercase tracking-wider">{opt.label}</p>
                          <p className="mt-1 text-xs text-sand">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-danger" role="alert">{error}</p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-ghost flex-1"
                  >
                    ← VOLVER
                  </button>
                  <button type="submit" disabled={loading} className="btn-solid flex-1 disabled:opacity-50">
                    {loading ? "REGISTRANDO…" : "CONFIRMAR PEDIDO"}
                  </button>
                </div>
              </>
            )}
          </motion.form>
        </AnimatePresence>

        {/* Resumen */}
        <aside className="card-surface h-fit p-6 lg:sticky lg:top-24">
          <p className="eyebrow mb-4">TU PEDIDO</p>
          <div className="space-y-4">
            {summary.map((l) => (
              <div key={`${l.productId}-${l.size}`} className="flex gap-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ash">
                  <Image src={l.product.img} alt={l.product.name} fill className="object-cover" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-display uppercase leading-tight">{l.product.name}</p>
                  <p className="text-xs text-sand">Talla {l.size} × {l.qty}</p>
                </div>
                <p className="font-display text-xs text-accent">{formatCOP(l.unit * l.qty)}</p>
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="mt-5 flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
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
            {pricing.couponDiscount >	 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-sand">Cupón {appliedCoupon}</span>
                <span className="font-semibold text-accent">−{formatCOP(pricing.couponDiscount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between">
              <span className="text-sand">Envío ({shippingMethod})</span>
              <span className={pricing.shipping === 0 ? "font-semibold text-accent" : ""}>
                {pricing.shipping === 0 ? "GRATIS" : formatCOP(pricing.shipping)}
              </span>
            </div>
            {pricing.shipping >	0 && (
              <p className="mt-2 text-xs text-mute">
                {shippingMethod === "expreso"
                  ? "Exprés gratis desde " + formatCOP(FREE_SHIPPING_THRESHOLD *	2) + "."
                  : "Envío gratis desde " + formatCOP(FREE_SHIPPING_THRESHOLD) + "."}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="eyebrow">TOTAL</span>
              <span className="font-display text-xl text-accent">{formatCOP(total)}</span>
            </div>
            <p className="mt-3 text-xs text-mute">
              El checkout registra la solicitud de pedido; un asesor confirma inventario y pago antes de despachar.

            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}