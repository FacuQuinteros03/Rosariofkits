import Image from "next/image";
import Link from "next/link";
import { IconoInstagram } from "./IconoInstagram";
import { INSTAGRAM, NEGOCIO, USUARIO_IG } from "@/lib/site";

/**
 * Pie del sitio.
 *
 * Va en la portada y también en cada página de producto: la de producto es la
 * que se comparte por WhatsApp y la que indexa Google, así que es la primera
 * (y muchas veces la única) que alguien ve. Sin esto, el que llega de un
 * reenvío no tiene forma de volver a encontrarnos cuando cierra la pestaña.
 *
 * El botón fuerte acá es Instagram, no WhatsApp: para escribir ya hay un botón
 * en cada tarjeta y en el detalle. Lo que falta en el pie es el "seguime para
 * no olvidarte", que es una acción distinta a comprar hoy.
 */
export function PieDePagina() {
  return (
    <footer className="mt-14 border-t border-line pt-8 text-center">
      <Link
        href="/"
        className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8" />
        <span className="font-display text-lg font-bold uppercase tracking-wide text-ink">
          Rosario F Kits
        </span>
      </Link>

      <p className="mt-4 text-[13px] leading-relaxed text-muted">
        Todos los días subimos lo que entra y lo que queda.
      </p>

      <a
        href={INSTAGRAM}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3.5 inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5
                   text-[13.5px] font-bold text-ink transition-colors hover:border-muted
                   hover:bg-surface focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <IconoInstagram className="h-4 w-4 shrink-0 text-gold" />
        Seguinos en Instagram
        <span className="font-semibold text-muted">{USUARIO_IG}</span>
      </a>

      <p className="mt-7 text-[12px] leading-relaxed text-muted">
        {NEGOCIO.nombre} · Indumentaria deportiva
        <br />
        Entrega en mano en {NEGOCIO.ciudad} · Envíos a todo el país
      </p>
    </footer>
  );
}
