/**
 * Estado de carga de ruta (App Router).
 * Mantiene la identidad de PINTAO: barra ámbar + esqueletos con brillo.
 */
export default function Loading() {
  return (
    <div className="container-x py-16" role="status" aria-live="polite" aria-busy="true">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-ash">
        <div className="skeleton h-full w-1/2 rounded-full" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5] w-full rounded-2xl" />
            <div className="skeleton mt-3 h-3 w-1/3 rounded" />
            <div className="skeleton mt-2 h-4 w-3/4 rounded" />
            <div className="skeleton mt-2 h-3 w-1/4 rounded" />
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando contenido…</span>
    </div>
  );
}
