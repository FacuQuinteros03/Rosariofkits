import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { Catalogo } from "@/components/Catalogo";
import { IconoInstagram } from "@/components/IconoInstagram";
import { Hero } from "@/components/Hero";
import { PieDePagina } from "@/components/PieDePagina";
import { TrustBar } from "@/components/TrustBar";
import { getCatalogo } from "@/lib/sheets";
import { INSTAGRAM } from "@/lib/site";
import { linkWhatsAppGeneral } from "@/lib/whatsapp";

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
      {/* barra de marca, flotando sobre la portada */}
      <div className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-5 py-5 sm:px-8">
          <Image
            src="/logo.png"
            alt="Rosario F Kits"
            width={44}
            height={44}
            priority
            className="h-10 w-10"
          />
          <span className="font-display text-xl font-bold uppercase tracking-wide text-white">
            Rosario F Kits
          </span>
          {/* en el celular el botón de texto no entra: queda solo el ícono */}
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Seguinos en Instagram"
            className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-white/20
                       bg-white/5 text-white/85 backdrop-blur-sm transition-colors
                       hover:bg-white/15 sm:ml-auto"
          >
            <IconoInstagram className="h-[18px] w-[18px]" />
          </a>

          <a
            href={linkWhatsAppGeneral()}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full border border-white/20
                       bg-white/5 px-4 py-2 text-[13px] font-semibold text-white/85
                       backdrop-blur-sm transition-colors hover:bg-white/15 sm:flex"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            Escribinos
          </a>
        </div>
      </div>

      <Hero />

      <main className="mx-auto max-w-[1280px] px-4 pb-20">
        <div className="mt-8">
          <TrustBar />
        </div>

        <section id="catalogo" className="mt-10 scroll-mt-4">
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
