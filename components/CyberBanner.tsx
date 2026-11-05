import Image from "next/image";
import { Zap } from "lucide-react";
import type { Producto } from "@/lib/types";
import {
  CYBER_CIERRE,
  CYBER_HASTA,
  CYBER_PRECIO,
  CYBER_PRECIO_CLAVO,
} from "@/lib/cyber";
import { precio } from "@/lib/whatsapp";
import { CuentaRegresiva } from "./CuentaRegresiva";

/**
 * El cartel del Cyber Monday arriba del catálogo. Ocupa el lugar del
 * PromoBanner mientras dura: no son acumulables, y con todas a $45.000 el
 * 2x$100.000 dejaría de convenir (ver el comentario de HotSaleBanner).
 *
 * El cartel grande, con la franja, está en CyberMonday.tsx; este es el
 * recordatorio para el que bajó directo al catálogo.
 */
export function CyberBanner({
  fotos,
  hayClavos,
}: {
  fotos: Producto[];
  hayClavos: boolean;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-cyan-400/40
                 bg-gradient-to-br from-[#0b1d2e] via-[#0a0f20] to-[#1d0b26] p-4 text-left sm:p-5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-cyan-500/25 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-10 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl"
      />

      <div className="relative flex flex-wrap items-center gap-3 sm:gap-5">
        {fotos.length > 0 && (
          <div className="flex shrink-0 -space-x-4 sm:-space-x-5">
            {fotos.slice(0, 3).map((p) => (
              <span
                key={p.id}
                className="relative block h-16 w-14 overflow-hidden rounded-xl ring-2 ring-[#0a0f20] sm:h-20 sm:w-[4.5rem]"
              >
                <Image
                  src={p.foto!}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              </span>
            ))}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-cyan-300">
            <Zap
              className="h-3.5 w-3.5 fill-current"
              strokeWidth={2.5}
              aria-hidden
            />
            Cyber Monday
          </p>
          <p className="mt-1 text-[15px] font-bold leading-tight text-ink sm:text-lg">
            Todas las camisetas a{" "}
            <span className="font-display text-2xl leading-none tracking-tight text-white sm:text-3xl">
              {precio(CYBER_PRECIO)}
            </span>
            {hayClavos && (
              <>
                {" "}
                · seleccionadas a{" "}
                <span className="font-display text-2xl leading-none tracking-tight text-fuchsia-300 sm:text-3xl">
                  {precio(CYBER_PRECIO_CLAVO)}
                </span>
              </>
            )}
          </p>
          <p className="mt-1.5 text-[12px] leading-snug text-white/60 sm:text-[12.5px]">
            Hasta {CYBER_CIERRE}, mientras haya stock. No incluye las recién
            llegadas ni shorts. No acumulable.
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <CuentaRegresiva hasta={CYBER_HASTA} chico />
        </div>
      </div>
    </div>
  );
}
