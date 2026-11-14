import type { ReactNode } from "react";

export type TipoInsignia =
  | "nuevo"
  | "lanzamiento"
  | "rebajada"
  | "ultima"
  | "quedan"
  | "agotado"
  | "player"
  | "fan";

const ESTILOS: Record<TipoInsignia, string> = {
  nuevo: "bg-celeste text-noche",
  lanzamiento: "bg-tiza text-noche",
  rebajada: "bg-bengala text-black",
  ultima: "bg-black/75 text-bengala ring-1 ring-inset ring-bengala/70",
  quedan: "bg-black/75 text-tiza ring-1 ring-inset ring-white/30",
  agotado: "bg-black/75 text-niebla ring-1 ring-inset ring-white/15",
  player: "bg-acento text-acento-tinta",
  fan: "bg-marino-2 text-tiza",
};

/** Las etiquetas de producto. El texto lo pone quien la usa ("Quedan 2"). */
export function Insignia({
  tipo,
  children,
  className = "",
}: {
  tipo: TipoInsignia;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`corte inline-flex h-[22px] items-center px-3 font-titulo text-[13px] font-extrabold
                  uppercase italic leading-none tracking-[0.06em] ${ESTILOS[tipo]} ${className}`}
    >
      {children}
    </span>
  );
}
