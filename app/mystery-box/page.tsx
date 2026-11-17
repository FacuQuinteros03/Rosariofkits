import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ConfiguradorBox } from "@/components/ConfiguradorBox";
import { PieDePagina } from "@/components/PieDePagina";
import { PreguntasFrecuentes } from "@/components/PreguntasFrecuentes";
import { BOX, PRECIO_BOX, tallesBox, TIPOS_BOX, type TipoBox } from "@/lib/box";
import { jsonLdPreguntas, type Pregunta } from "@/lib/faq";
import { jsonLdSeguro } from "@/lib/seo";
import { getCatalogo } from "@/lib/sheets";
import { NEGOCIO, SITIO } from "@/lib/site";
import { precio } from "@/lib/whatsapp";

/** Mismo ISR que el catálogo: los talles disponibles salen del stock. Tiene que ser literal. */
export const revalidate = 60;

const DESCRIPCION = `Camiseta de fútbol sorpresa en tu talle. Vos elegís versión, tipo y qué equipos no querés; nosotros, la camiseta. Fan ${precio(PRECIO_BOX.fan)}, Player ${precio(PRECIO_BOX.player)}.`;

export const metadata: Metadata = {
  title: `${BOX.nombre} · camiseta sorpresa`,
  description: DESCRIPCION,
  alternates: { canonical: `${SITIO}${BOX.ruta}` },
  openGraph: {
    locale: "es_AR",
    siteName: NEGOCIO.nombre,
    type: "website",
    url: `${SITIO}${BOX.ruta}`,
    title: `${BOX.nombre} · desde ${precio(PRECIO_BOX.fan)}`,
    description: DESCRIPCION,
    images: [{ url: BOX.foto, alt: BOX.nombre }],
  },
};

const PREGUNTAS: Pregunta[] = [
  {
    pregunta: "¿Qué camiseta me toca?",
    respuesta:
      "Una de las que tenemos en mano, en tu talle y del tipo que elegiste. La elegimos a mano, mirando lo que nos pediste.",
  },
  {
    pregunta: "¿Puedo pedir un equipo?",
    respuesta:
      "Podés decirnos cuál te gustaría y lo tenemos en cuenta si hay en tu talle, pero no lo garantizamos: si no, no sería sorpresa. Los equipos que no querés, en cambio, los respetamos.",
  },
  {
    pregunta: "¿Cuál es la diferencia entre Fan y Player?",
    respuesta:
      "La Fan tiene calce suelto, como una remera. La Player es la de los jugadores: calce al cuerpo y tela más liviana. Las retro van siempre como Player.",
  },
  {
    pregunta: "¿Cómo la pago?",
    respuesta:
      "Como cualquier camiseta de la web: por transferencia, subiendo el comprobante en el pedido, o escribiéndonos por WhatsApp. Cuando confirmamos el pago elegimos tu camiseta y coordinamos el envío.",
  },
];

export default async function MysteryBoxPage() {
  const productos = await getCatalogo();
  const tallesPorTipo = Object.fromEntries(
    TIPOS_BOX.map((t) => [t.id, tallesBox(productos, t.id)])
  ) as Record<TipoBox, string[]>;
  const hayStock = tallesPorTipo.cualquiera.length > 0;

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(jsonLdPreguntas(PREGUNTAS)) }}
      />

      <nav aria-label="Migas de pan" className="py-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver al catálogo
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-marino md:sticky md:top-4 md:self-start">
          <Image
            src={BOX.foto}
            alt="Mystery Box de Rosario F Kits: una camiseta sorpresa"
            fill
            preload
            fetchPriority="high"
            sizes="(min-width: 768px) 520px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-6 md:pt-4">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Camiseta sorpresa</p>
            <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none text-ink">
              {BOX.nombre}
            </h1>
            <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-ink">
              Vos elegís la versión, el tipo y tu talle, y nos contás qué equipos no querés. Nosotros elegimos la
              camiseta. La ves recién cuando la abrís.
            </p>
          </div>

          {hayStock ? (
            <ConfiguradorBox tallesPorTipo={tallesPorTipo} />
          ) : (
            <p className="rounded-xl border border-line px-4 py-3.5 text-[15px] text-muted">
              Ahora no nos quedan camisetas para armar boxes. Vuelve apenas entre stock nuevo.
            </p>
          )}

          <p className="text-[13px] leading-relaxed text-muted">
            Entrega en mano en {NEGOCIO.ciudad} y envíos a todo el país. Efectivo o transferencia, sin recargo.
          </p>
        </div>
      </div>

      <PreguntasFrecuentes preguntas={PREGUNTAS} />

      <PieDePagina />
    </main>
  );
}
