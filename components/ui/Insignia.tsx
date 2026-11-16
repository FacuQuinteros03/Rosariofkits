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
  nuevo: "bg-azul text-white",
  lanzamiento: "bg-celeste text-marino",
  rebajada: "bg-bengala text-white",
  ultima: "bg-white text-bengala",
  quedan: "bg-white text-marino",
  agotado: "bg-panel-2 text-niebla",
  player: "bg-marino text-white",
  fan: "bg-celeste-suave text-marino",
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
      className={`inline-flex h-6 items-center rounded-md px-2 text-[13px] font-bold leading-none
                  ${ESTILOS[tipo]} ${className}`}
    >
      {children}
    </span>
  );
}
