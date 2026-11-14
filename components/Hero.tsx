import { ArrowDown, MessageCircle } from "lucide-react";
import { HeroFotos } from "./HeroFotos";
import { IconoInstagram } from "./IconoInstagram";
import { Boton } from "./ui/Boton";
import { Logo } from "./ui/Logo";
import { INSTAGRAM } from "@/lib/site";
import { linkWhatsAppGeneral } from "@/lib/whatsapp";

/**
 * Portada: fotos propias que rotan y, al lado, el mensaje y las dos salidas
 * (ver el stock o escribir).
 *
 * En celular las fotos van arriba y el texto abajo, sobre blanco: así el texto
 * se lee siempre, sin depender de qué foto haya detrás. En escritorio, texto
 * a la izquierda y foto a la derecha con el corte diagonal del logo.
 *
 * El texto es de servidor: se ve aunque el JavaScript tarde o falle. Lo único
 * que hidrata es el carrusel (HeroFotos).
 */
export function Hero() {
  const marca = (
    <>
      <span className="font-titulo text-xl font-extrabold uppercase tracking-wide">Rosario F Kits</span>
      <a
        href={INSTAGRAM}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Seguinos en Instagram"
        className="ml-auto grid h-10 w-10 lg:ml-3 place-items-center rounded-full bg-current/10 transition-colors hover:bg-current/20"
      >
        <IconoInstagram className="h-[18px] w-[18px]" />
      </a>
    </>
  );

  return (
    <section
      aria-label="Portada"
      className="relative bg-ground lg:grid lg:min-h-[min(calc(100svh-36px),860px)] lg:grid-cols-[1.02fr_0.98fr]"
    >
      <div className="relative h-[40svh] min-h-[250px] lg:order-2 lg:h-auto lg:[clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)]">
        <HeroFotos />
        {/* marca sobre la foto, solo en celular */}
        <div className="absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/55 to-transparent px-4 pb-8 pt-3 text-white lg:hidden">
          <Logo className="h-9 w-9 bg-white" />
          {marca}
        </div>
      </div>

      <div className="resplandor-lg relative flex flex-col px-4 pb-7 pt-5 text-marino lg:order-1 lg:px-12 lg:py-8 xl:px-20">
        <div className="hidden items-center gap-3 lg:flex">
          <Logo className="h-10 w-10 bg-marino" />
          {marca}
        </div>

        <div className="lg:my-auto">
          <h1 className="aparece font-titulo text-[clamp(2.9rem,13.5vw,6rem)] font-black uppercase leading-[0.86] tracking-[-0.01em] xl:text-[6.6rem]">
            Bienvenido a
            <br />
            <span className="text-azul">Rosario F Kits</span>
          </h1>
          <p className="mt-2.5 font-titulo text-[21px] font-bold uppercase leading-tight tracking-[0.06em] text-marino-2 lg:mt-4 lg:text-[28px]">
            Indumentaria de fútbol importada
          </p>
          <p className="mt-2.5 max-w-md text-[15.5px] leading-relaxed text-tinta/80 lg:mt-3 lg:text-[17px]">
            Stock real, talle por talle. Entrega en mano en Rosario y envíos a todo el país.
          </p>
          <div className="mt-4 flex gap-2.5 sm:gap-3 lg:mt-7">
            <Boton tamano="lg" href="#catalogo" className="flex-1 !px-4 sm:flex-none sm:!px-8">
              Ver el stock
              <ArrowDown className="h-5 w-5" strokeWidth={2.8} aria-hidden />
            </Boton>
            <Boton
              tamano="lg"
              variante="whatsapp"
              href={linkWhatsAppGeneral()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 !px-4 sm:flex-none sm:!px-8"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              Escribinos
            </Boton>
          </div>
        </div>
      </div>
    </section>
  );
}
