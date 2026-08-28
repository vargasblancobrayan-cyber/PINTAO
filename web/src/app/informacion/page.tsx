import { Reveal } from "@/components/motion";

export const metadata = { title: "Información" };

const sections = [
  {
    id: "envios",
    title: "Envíos",
    body: "Despachamos a toda Colombia por transportadora certificada. El valor del envío se calcula según ciudad y volumen del pedido; desde $250.000 COP el envío es cortesía de la casa.",
  },
  {
    id: "cambios",
    title: "Cambios y devoluciones",
    body: "Aceptamos cambios por talla dentro de los 8 días siguientes a la entrega, siempre que la prenda conserve etiquetas y esté en condición nueva.",
  },
  {
    id: "privacidad",
    title: "Privacidad",
    body: "Solo usamos tus datos de contacto para gestionar pedidos y, si lo autorizas, compartir novedades del drop. No vendemos ni compartimos tu información con terceros.",
  },
];

export default function InformacionPage() {
  return (
    <div className="container-x max-w-3xl py-16">
      <Reveal>
        <p className="eyebrow mb-2">AYUDA</p>
        <h1 className="display-title mb-12 text-5xl sm:text-6xl">Información.</h1>
      </Reveal>
      <div className="space-y-10">
        {sections.map((s, i) => (
          <Reveal key={s.id} delay={i * 0.05}>
            <section id={s.id} className="card-surface p-8">
              <h2 className="display-title mb-3 text-2xl">{s.title}.</h2>
              <p className="text-cream/75">{s.body}</p>
            </section>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
