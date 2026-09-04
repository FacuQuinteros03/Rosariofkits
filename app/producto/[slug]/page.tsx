import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FotoProducto } from "@/components/FotoProducto";
import { ProductCard } from "@/components/ProductCard";
import { SelectorTalle } from "@/components/SelectorTalle";
import { getCatalogo, getProducto, getRelacionados } from "@/lib/sheets";
import { NEGOCIO, SITIO } from "@/lib/site";
import { precio } from "@/lib/whatsapp";

/** Mismo ISR que el catálogo. Tiene que ser literal. */
export const revalidate = 60;

/**
 * Prerenderiza una página por producto en el build.
 * `dynamicParams` queda en true (el default): si mañana entra un modelo nuevo
 * al Sheet, su página se genera en la primera visita en vez de dar 404.
 */
export async function generateStaticParams() {
  const productos = await getCatalogo();
  return productos.map((p) => ({ slug: p.id }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProducto(slug);
  if (!p) return { title: "Producto no encontrado" };

  const talles = p.variantes.map((v) => v.talle).join(", ");
  const descripcion = `${p.nombre} en ${precio(p.precio)}. Talles disponibles: ${talles}. Stock real en Rosario, entrega en mano y envíos a todo el país.`;
  const url = `${SITIO}/producto/${p.id}`;

  return {
    title: p.nombre,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${p.nombre} · ${precio(p.precio)}`,
      description: descripcion,
      images: [p.foto ?? "/og.png"],
    },
  };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProducto(slug);
  if (!p) notFound();

  const relacionados = await getRelacionados(p);
  const url = `${SITIO}/producto/${p.id}`;

  /**
   * JSON-LD. Una oferta por talle, cada una con su SKU real: así Google puede
   * mostrar precio y disponibilidad, y el día que un talle se agote la oferta
   * desaparece sola porque el Sheet ya no la devuelve.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: `${p.nombre} — indumentaria deportiva en Rosario.`,
    image: p.fotos.length ? p.fotos.map((f) => `${SITIO}${f}`) : [`${SITIO}/og.png`],
    category: p.categoria,
    brand: { "@type": "Brand", name: NEGOCIO.nombre },
    offers: p.variantes.map((v) => ({
      "@type": "Offer",
      "@id": `${url}#${v.sku}`,
      sku: v.sku,
      name: `Talle ${v.talle}`,
      price: p.precio,
      priceCurrency: "ARS",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url,
      seller: { "@type": "Organization", name: NEGOCIO.nombre },
      areaServed: { "@type": "City", name: NEGOCIO.ciudad },
    })),
  };

  const migas = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Catálogo", item: SITIO },
      { "@type": "ListItem", position: 2, name: p.nombre, item: url },
    ],
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(migas) }}
      />

      <nav aria-label="Migas de pan" className="py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver al catálogo
        </Link>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        {/* ---------- foto: contenida, y ampliable a pantalla completa ---------- */}
        <FotoProducto producto={p} />

        {/* ---------- datos y compra ---------- */}
        <div className="flex flex-col gap-5 md:pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {p.categoria}
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-ink sm:text-3xl">
              {p.nombre}
            </h1>
          </div>

          <p className="font-display text-5xl font-bold leading-none tabular-nums text-ink">
            {precio(p.precio)}
          </p>

          <SelectorTalle producto={p} />

          <p className="text-[13px] leading-relaxed text-muted">
            {p.total === 1 ? "Queda una sola unidad." : `Quedan ${p.total} unidades.`} Entrega en
            mano en {NEGOCIO.ciudad} y envíos a todo el país. Efectivo o transferencia, sin
            recargo.
          </p>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Más de {p.categoria}
          </h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-5">
            {relacionados.map((r) => (
              <ProductCard key={r.id} producto={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
