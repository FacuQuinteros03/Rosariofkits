"use client";

import Image from "next/image";
import { ArrowRight, Plus } from "lucide-react";
import type { Producto } from "@/lib/types";

/**
 * Promo vigente.
 *
 * Muestra dos productos reales del stock en vez de un ícono: el visitante ve
 * de qué se trata la combinación antes de leer una palabra. Y es un botón:
 * si le interesa el descuento, lo primero que necesita es ver los shorts.
 */
export function PromoBanner({
  camiseta,
  short,
  onVerShorts,
  descuento = 5000,
}: {
  camiseta?: Producto;
  short?: Producto;
  onVerShorts?: () => void;
  descuento?: number;
}) {
  const monto = `$${descuento.toLocaleString("es-AR")}`;

  const miniatura = (p: Producto | undefined, etiqueta: string) =>
    p?.foto ? (
      <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 sm:h-20 sm:w-20">
        <Image src={p.foto} alt="" fill sizes="80px" className="object-cover" />
      </span>
    ) : (
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white/5 text-[9px] font-bold uppercase tracking-wider text-muted ring-1 ring-white/10 sm:h-20 sm:w-20">
        {etiqueta}
      </span>
    );

  return (
    <button
      type="button"
      onClick={onVerShorts}
      className="group relative w-full overflow-hidden rounded-2xl border border-navy-2/70
                 bg-gradient-to-br from-navy-2 to-navy p-4 text-left transition-transform
                 hover:scale-[1.005] focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-gold sm:p-5"
    >
      {/* el corte diagonal del monograma, muy tenue, como textura de fondo */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 top-1/2 h-[190%] w-40 -translate-y-1/2 bg-white/[0.03]"
        style={{ clipPath: "polygon(38% 0,100% 0,62% 100%,0 100%)" }}
      />

      <div className="relative flex items-center gap-3 sm:gap-5">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {miniatura(camiseta, "Camiseta")}
          <Plus className="h-4 w-4 shrink-0 text-on-navy-muted sm:h-5 sm:w-5" strokeWidth={3} aria-hidden />
          {miniatura(short, "Short")}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
            Promo vigente
          </p>
          <p className="mt-1 text-[15px] font-bold leading-tight text-ink sm:text-lg">
            Llevás un short y te descontamos{" "}
            <span className="font-display text-2xl leading-none tracking-tight text-white sm:text-3xl">
              {monto}
            </span>
          </p>
          <p className="mt-1.5 hidden text-[12.5px] leading-snug text-on-navy-muted sm:block">
            Aplica a cualquier camiseta del catálogo, con cualquier short, mientras haya stock.
          </p>
        </div>

        <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-2 text-[12.5px] font-semibold text-ink transition-colors group-hover:border-gold group-hover:text-gold sm:flex">
          Ver shorts
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
        <ArrowRight
          className="ml-auto h-5 w-5 shrink-0 text-on-navy-muted sm:hidden"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </button>
  );
}
