import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { TituloHero } from "./TituloHero";

/**
 * Portada a sangre completa.
 *
 * Es Server Component y la entrada es CSS, no Framer Motion: el texto del hero
 * es el mensaje principal del sitio y no puede depender de que hidrate el JS.
 * Framer queda para lo interactivo, donde si falla es solo cosmético.
 *
 * Sobre la referencia que miramos:
 *  - el texto va sobre un velo degradado, así se lee siempre y no depende de
 *    qué parte de la foto quede detrás;
 *  - hay un CTA: una portada linda sin salida no lleva a nadie al catálogo.
 */
export function Hero() {
  return (
    <section className="relative isolate w-full overflow-hidden">
      {/*
        El nombre del archivo lleva versión a propósito: next/image cachea por
        URL, así que pisar hero.jpg con otra foto sigue sirviendo la vieja
        (en local y en el CDN). Foto nueva = nombre nuevo.
      */}
      <div className="relative h-[78svh] min-h-[440px] w-full sm:h-[70svh] lg:h-[76svh]">
        <Image
          src="/hero-messi-2400.jpg"
          alt="Lionel Messi con la camiseta de la Selección Argentina"
          fill
          priority
          sizes="100vw"
          quality={90}
          className="object-cover object-[52%_14%] sm:object-[center_18%]"
        />

        {/* velo: oscuro abajo y a la izquierda, que es donde va el texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-ground via-ground/55 to-ground/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ground/85 via-ground/25 to-transparent" />
      </div>

      <div className="absolute inset-0 flex items-end">
        <div className="mx-auto w-full max-w-[1280px] px-5 pb-12 sm:px-8 sm:pb-16 lg:pb-20">
          <div className="max-w-2xl">
            <p
              className="aparece mb-4 inline-flex items-center gap-2.5 rounded-full border
                         border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold
                         uppercase tracking-[0.18em] text-gold backdrop-blur-sm"
              style={{ animationDelay: "60ms" }}
            >
              <span className="font-display text-base leading-none">10</span>
              Gracias, Leo
            </p>

            <TituloHero />

            <p
              className="aparece mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg"
              style={{ animationDelay: "250ms" }}
            >
              En este espacio vas a tener la mejor camiseta para vos.
            </p>

            <div className="aparece mt-8" style={{ animationDelay: "350ms" }}>
              <a
                href="#catalogo"
                className="group inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3.5
                           text-[15px] font-bold text-ground transition-transform
                           hover:scale-[1.03] focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Ver el stock disponible
                <ArrowDown
                  className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
                  strokeWidth={2.6}
                  aria-hidden
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
