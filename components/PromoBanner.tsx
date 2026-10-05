"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import type { Producto } from "@/lib/types";

/**
 * Promo vigente: dos camisetas por un precio fijo.
 *
 * Muestra dos productos reales del stock en vez de un ícono: el visitante ve
 * de qué se trata la combinación antes de leer una palabra.
 *
 * **Por qué dice "versión jugador" y no "cualquier camiseta".**
 * A $100.000 las dos, la promo solo conviene sobre las de $52.500 para
 * arriba. Las FAN salen $34.999, o sea $69.998 las dos sueltas: anunciarlas
 * dentro de la promo seria ofrecer algo $30.000 mas caro que el precio de
 * lista, y el que saca la cuenta no vuelve.
 *
 * Si cambian los precios, esta linea hay que revisarla. La regla es que el
 * total de la promo tiene que ser MENOR que dos veces el precio mas barato
 * que entra.
 */
export function PromoBanner({
  primera,
  segunda,
  precio = 100000,
}: {
  primera?: Producto;
  segunda?: Producto;
  precio?: number;
}) {
  const monto = `$${precio.toLocaleString("es-AR")}`;

  const miniatura = (p: Producto | undefined) =>
    p?.foto ? (
      <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 sm:h-20 sm:w-20">
        <Image src={p.foto} alt="" fill sizes="80px" className="object-cover" />
      </span>
    ) : (
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white/5 text-[9px] font-bold uppercase tracking-wider text-muted ring-1 ring-white/10 sm:h-20 sm:w-20">
        Camiseta
      </span>
    );

  return (
    /*
      Ya no es un botón. Antes llevaba al filtro de shorts, que era la mitad de
      la promo vieja; esta no manda a ningún lado en particular — lo que hay
      que elegir ya está en la grilla de abajo.
    */
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-navy-2/70
                 bg-gradient-to-br from-navy-2 to-navy p-4 text-left sm:p-5"
    >
      {/* el corte diagonal del monograma, muy tenue, como textura de fondo */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 top-1/2 h-[190%] w-40 -translate-y-1/2 bg-white/[0.03]"
        style={{ clipPath: "polygon(38% 0,100% 0,62% 100%,0 100%)" }}
      />

      <div className="relative flex items-center gap-3 sm:gap-5">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {miniatura(primera)}
          <Plus className="h-4 w-4 shrink-0 text-on-navy-muted sm:h-5 sm:w-5" strokeWidth={3} aria-hidden />
          {miniatura(segunda)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
            Promo vigente
          </p>
          <p className="mt-1 text-[15px] font-bold leading-tight text-ink sm:text-lg">
            Llevate 2 camisetas a elección por{" "}
            <span className="font-display text-2xl leading-none tracking-tight text-white sm:text-3xl">
              {monto}
            </span>
          </p>
          <p className="mt-1.5 text-[12px] leading-snug text-on-navy-muted sm:text-[12.5px]">
            Sobre las camisetas versión jugador, con o sin dorsal, mientras haya stock.
          </p>
        </div>
      </div>
    </div>
  );
}
