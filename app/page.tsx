import { Catalogo } from "@/components/Catalogo";
import { CyberCinta } from "@/components/CyberCinta";
import { CyberMonday } from "@/components/CyberMonday";
import { Hero } from "@/components/Hero";
import { PieDePagina } from "@/components/PieDePagina";
import { RecienLlegadas } from "@/components/RecienLlegadas";
import { Resenas } from "@/components/Resenas";
import { TrustBar } from "@/components/TrustBar";
import { BarraAnuncios } from "@/components/ui/BarraAnuncios";
import { getCatalogo } from "@/lib/sheets";

/**
 * ISR: la página se sirve cacheada y se refresca sola cada minuto.
 * Tiene que ser un literal: Next lee esta config de forma estática y no
 * resuelve constantes importadas.
 */
export const revalidate = 60;

export default async function Page() {
  const productos = await getCatalogo();
  /* el contador de arriba habla de lo que se puede comprar hoy: los agotados
     tienen su propio bloque al final del catálogo */
  const enStock = productos.filter((p) => p.total > 0);
  const unidades = enStock.reduce((s, p) => s + p.total, 0);

  return (
    <>
      <CyberCinta />
      <BarraAnuncios />
      <Hero />

      <main className="mx-auto max-w-[1360px] px-4 pb-20">
        <div className="mt-8">
          <TrustBar />
        </div>

        <CyberMonday productos={productos} />

        <RecienLlegadas productos={productos} />

        <Resenas />

        <section id="catalogo" className="mt-12 scroll-mt-4">
          <h2 className="font-display text-3xl font-extrabold uppercase leading-none text-ink sm:text-4xl">
            Stock disponible
          </h2>
          <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">
            {enStock.length} modelos · {unidades} unidades en mano
          </p>

          <div className="mt-5">
            <Catalogo productos={productos} />
          </div>
        </section>

        <PieDePagina />
      </main>
    </>
  );
}
