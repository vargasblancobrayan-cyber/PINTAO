import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Acceso — PINTAO" };

export default function AccesoPage() {
  return (
    <div className="container-x flex flex-col items-center py-16 sm:py-24">
      <p className="eyebrow mb-3">ACCESO UNIFICADO</p>
      <p className="mb-8 max-w-md text-center text-sm text-sand">
        Clientes y administradores entran por la misma puerta. El sistema te lleva
        a tu panel según tu rol.
      </p>
      <AuthForm
        title="Entrar."
        hint="Demo: cliente@pintao.local / Cliente2026! · admin@pintao.local / Pintao2026!"
      />
      <Link href="/admin/login" className="mt-8 text-xs text-mute underline">
        Acceso administrativo dedicado →
      </Link>
    </div>
  );
}
