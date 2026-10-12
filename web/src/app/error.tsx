"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Frontera de error de ruta.
 * Sin esto, cualquier excepción en un componente de servidor mostraba la
 * pantalla de error por defecto de Next (fuera de la identidad del producto).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En producción esto alimentaría el colector de errores (pendiente: ver ROADMAP).
    console.error("[PINTAO] error de ruta:", error);
  }, [error]);

  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">ALGO SE ENREDÓ</p>
      <h1 className="display-title mt-2 text-5xl sm:text-6xl">Se nos fue la pinta.</h1>
      <p className="mt-4 max-w-md text-sm text-sand">
        No pudimos cargar esta sección. Puedes reintentar; si sigue fallando, el catálogo completo
        sigue disponible en la tienda.
      </p>
      {error.digest && <p className="mt-3 text-xs text-mute">Referencia: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-solid">
          REINTENTAR
        </button>
        <Link href="/tienda" className="btn-ghost">
          IR A LA TIENDA
        </Link>
      </div>
    </div>
  );
}
