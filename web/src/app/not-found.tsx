import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display-title mt-2 text-6xl">No está el parche.</h1>
      <p className="mt-4 max-w-sm text-sm text-sand">
        Esta página no existe o la prenda salió del drop. Todo el catálogo sigue en la tienda.
      </p>
      <Link href="/tienda" className="btn-solid mt-6">VER EL DROP</Link>
    </div>
  );
}
