"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "./providers";
import { products } from "@/lib/products";
import { formatCOP, unitPriceWithDiscount } from "@/lib/format";

export function CheckoutForm() {
  const router = useRouter();
  const { items, clear } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

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

  const total = summary.reduce((sum, l) => sum + l.unit * l.qty, 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
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
        paymentMethod: form.get("paymentMethod"),
        items: summary.map((l) => ({
          productId: l.productId,
          size: l.size,
          qty: l.qty,
          name: l.product.name,
          unitPrice: l.unit,
        })),
        total,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "No pudimos registrar tu pedido");
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
        <p className="font-display text-5xl text-accent">✓</p>
        <h1 className="display-title mt-4 text-3xl">Gracias.</h1>
        <p className="mt-3 text-sm text-sand">
          Tu solicitud #{done} quedó pendiente de confirmación. El equipo valida inventario y
          pagos antes de despachar.
        </p>
        <button onClick={() => router.push("/tienda")} className="btn-solid mt-6">SEGUIR EXPLORANDO</button>
      </div>
    );
  }

  if (summary.length === 0) {
    return (
      <div className="card-surface p-10 text-center">
        <p className="text-sm text-sand">Tu carrito está vacío.</p>
        <button onClick={() => router.push("/tienda")} className="btn-solid mt-4">IR A LA TIENDA</button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="card-surface space-y-5 p-8">
        <h2 className="display-title text-2xl">Datos del pedido.</h2>
        <div>
          <label htmlFor="name" className="eyebrow mb-2 block">NOMBRE O EMPRESA</label>
          <input id="name" name="name" required className="field" autoComplete="name" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="eyebrow mb-2 block">CORREO</label>
            <input id="email" name="email" type="email" required className="field" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="phone" className="eyebrow mb-2 block">WHATSAPP</label>
            <input id="phone" name="phone" required className="field" autoComplete="tel" />
          </div>
        </div>
        <div>
          <label htmlFor="paymentMethod" className="eyebrow mb-2 block">MEDIO DE PAGO</label>
          <select id="paymentMethod" name="paymentMethod" required className="field">
            <option value="Transferencia">Transferencia bancaria</option>
            <option value="Enlace de pago">Enlace de pago</option>
          </select>
        </div>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn-solid w-full disabled:opacity-50">
          {loading ? "REGISTRANDO…" : "CONFIRMAR PEDIDO"}
        </button>
      </form>

      <aside className="card-surface h-fit p-6">
        <p className="eyebrow mb-4">TU PEDIDO</p>
        <div className="space-y-4">
          {summary.map((l) => (
            <div key={`${l.productId}-${l.size}`} className="flex gap-3">
              <div className="relative h-16 w-14 overflow-hidden rounded-lg bg-ash">
                <Image src={l.product.img} alt={l.product.name} fill className="object-cover" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-display uppercase">{l.product.name}</p>
                <p className="text-xs text-sand">Talla {l.size} × {l.qty}</p>
              </div>
              <p className="font-display text-xs text-accent">{formatCOP(l.unit * l.qty)}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-line pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-sand">Total ({totalQty} und.)</span>
            <span className="font-display text-lg text-accent">{formatCOP(total)}</span>
          </div>
          <p className="mt-2 text-xs text-mute">
            El checkout registra una solicitud pendiente de confirmación; no simula un cobro.
          </p>
        </div>
      </aside>
    </div>
  );
}
