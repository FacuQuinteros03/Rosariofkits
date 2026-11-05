import { Zap } from "lucide-react";
import type { TipoCyber } from "@/lib/cyber";

/** La etiqueta sobre la foto: "Cyber" o "Súper Cyber" (las de $40.000). */
export function EtiquetaCyber({
  tipo,
  className = "",
}: {
  tipo: TipoCyber;
  className?: string;
}) {
  return tipo === "clavo" ? (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-fuchsia-500 px-2.5 py-1 text-[10px] font-extrabold
                  uppercase tracking-[0.11em] text-white shadow-md shadow-black/30 ${className}`}
    >
      <Zap className="h-3 w-3 fill-current" aria-hidden />
      Súper Cyber
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-cyan-400 px-2.5 py-1 text-[10px] font-extrabold
                  uppercase tracking-[0.11em] text-black shadow-md shadow-black/30 ${className}`}
    >
      <Zap className="h-3 w-3 fill-current" aria-hidden />
      Cyber
    </span>
  );
}
