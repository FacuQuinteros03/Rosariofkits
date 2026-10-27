import Image from "next/image";
import { Flame } from "lucide-react";
import type { Producto } from "@/lib/types";
import { precio } from "@/lib/whatsapp";

/**
 * Hot Sale del 27 al 31 de octubre de 2026: la versión jugador de $52.500
 * pasa a $45.000. Ocupa el lugar del PromoBanner mientras dura.
 *
 * **No acumulable, y no es un detalle legal.** A $45.000 dos sueltas salen
 * $90.000: la promo 2x$100.000 dejaría de convenir, así que mostrar las dos a
 * la vez ofrecería algo más caro que el precio de lista.
 *
 * Los precios viven en el Sheet (Precio Venta 45000, Precio Antes 52500); acá
 * solo se anuncia. Cómo volverlos atrás: posts/hot-sale-2026-10-respaldo.md.
 */
export function HotSaleBanner({
  fotos,
  hasta,
  antes = 52500,
  ahora = 45000,
}: {
  fotos: Producto[];
  /** texto del cierre, "el sábado 31 de octubre" */
  hasta: string;
  antes?: number;
  ahora?: number;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-orange-500/40
                 bg-gradient-to-br from-[#3a1a12] via-navy to-navy p-4 text-left sm:p-5"
    >
      {/* brasa en la esquina, como en la story */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-orange-500/25 blur-3xl"
      />

      <div className="relative flex items-center gap-3 sm:gap-5">
        {fotos.length > 0 && (
          <div className="flex shrink-0 -space-x-4 sm:-space-x-5">
            {fotos.slice(0, 3).map((p) => (
              <span
                key={p.id}
                className="relative block h-16 w-14 overflow-hidden rounded-xl ring-2 ring-navy sm:h-20 sm:w-[4.5rem]"
              >
                <Image src={p.foto!} alt="" fill sizes="72px" className="object-cover" />
              </span>
            ))}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange-400">
            <Flame className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            Hot Sale
          </p>
          <p className="mt-1 text-[15px] font-bold leading-tight text-ink sm:text-lg">
            Versión jugador a{" "}
            <span className="font-display text-2xl leading-none tracking-tight text-white sm:text-3xl">
              {precio(ahora)}
            </span>{" "}
            <s className="text-[13px] font-semibold text-muted decoration-orange-400/80 decoration-2 sm:text-sm">
              {precio(antes)}
            </s>
          </p>
          <p className="mt-1.5 text-[12px] leading-snug text-on-navy-muted sm:text-[12.5px]">
            Solo hasta {hasta}, mientras haya stock. No acumulable con otras promociones.
          </p>
        </div>
      </div>
    </div>
  );
}
