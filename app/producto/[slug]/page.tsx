import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FotoProducto } from "@/components/FotoProducto";
import { PieDePagina } from "@/components/PieDePagina";
import { ProductCard } from "@/components/ProductCard";
import { SelectorTalle } from "@/components/SelectorTalle";
import { getCatalogo, getProducto, getRelacionados } from "@/lib/sheets";
import { conStock } from "@/lib/types";
import { INSTAGRAM, NEGOCIO, SITIO } from "@/lib/site";
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

  const disponibles = p.variantes.filter(conStock);
  const talles = disponibles.map((v) => v.talle).join(", ");
  const descripcion = disponibles.length
    ? `${p.nombre} en ${precio(p.precio)}. Talles disponibles: ${talles}. Stock real en Rosario, entrega en mano y envíos a todo el país.`
    : `${p.nombre}: agotado por ahora. Lo conseguimos por encargue — escribinos y te pasamos plazo y precio. Rosario, entrega en mano y envíos a todo el país.`;
  const url = `${SITIO}/producto/${p.id}`;

  return {
    title: p.nombre,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: disponibles.length ? `${p.nombre} · ${precio(p.precio)}` : `${p.nombre} · Agotado`,
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
   * JSON-LD. Una oferta por talle, cada una con su SKU real, y cada una con su
   * disponibilidad: los talles agotados siguen declarados como OutOfStock en
   * vez de desaparecer. Google entiende que el producto existe y está sin
   * stock, que es justamente lo que queremos que se sepa.
   *
   * Si el modelo está agotado entero no se declara ninguna oferta: publicar un
   * precio que todavía no confirmamos con el proveedor es prometer de más.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: `${p.nombre} — indumentaria deportiva en Rosario.`,
    image: p.fotos.length ? p.fotos.map((f) => `${SITIO}${f}`) : [`${SITIO}/og.png`],
    category: p.categoria,
    /* sameAs le dice a Google que esta marca y esa cuenta de Instagram son lo mismo */
    brand: { "@type": "Brand", name: NEGOCIO.nombre, sameAs: [INSTAGRAM] },
    offers: (p.total === 0 ? [] : p.variantes).map((v) => ({
      "@type": "Offer",
      "@id": `${url}#${v.sku}`,
      sku: v.sku,
      name: `Talle ${v.talle}`,
      price: p.precio,
      priceCurrency: "ARS",
      availability:
        v.disponible > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
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
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {p.categoria}
              {p.total === 0 && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] tracking-[0.11em] text-white/80">
                  Agotado
                </span>
              )}
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-ink sm:text-3xl">
              {p.nombre}
            </h1>
          </div>

          {/* ver la nota del JSON-LD: el agotado no muestra precio */}
          {p.total === 0 ? (
            <p className="text-[15px] font-semibold text-muted">
              Precio a confirmar al hacer el encargue
            </p>
          ) : (
            <p className="font-display text-5xl font-bold leading-none tabular-nums text-ink">
              {precio(p.precio)}
            </p>
          )}

          <SelectorTalle producto={p} />

          <p className="text-[13px] leading-relaxed text-muted">
            {p.total === 0
              ? "Se agotó, pero lo conseguimos por encargue: escribinos y te pasamos plazo y precio."
              : p.total === 1
                ? "Queda una sola unidad."
                : `Quedan ${p.total} unidades.`}{" "}
            Entrega en mano en {NEGOCIO.ciudad} y envíos a todo el país. Efectivo o transferencia,
            sin recargo.
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

      <PieDePagina />
    </main>
  );
}
