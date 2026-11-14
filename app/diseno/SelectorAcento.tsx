"use client";

import { useState } from "react";

const OPCIONES = [
  { id: "lima", nombre: "Lima reflector", color: "#d4ff3f", tinta: "#0c1400" },
  { id: "bengala", nombre: "Naranja bengala", color: "#ff7a1a", tinta: "#1a0a00" },
  { id: "celeste", nombre: "Celeste pleno", color: "#7ccbf7", tinta: "#04121f" },
] as const;

const FONDOS = [
  { id: "noche", nombre: "Todo de noche" },
  { id: "mixto", nombre: "Portada de noche + catálogo blanco" },
  { id: "blanco", nombre: "Todo blanco" },
] as const;

/** Solo para el preview: cambia el color de acento en vivo para compararlos. */
export function SelectorAcento({ children }: { children: React.ReactNode }) {
  const [i, setI] = useState(0);
  const [fondo, setFondo] = useState<(typeof FONDOS)[number]["id"]>("mixto");
  const o = OPCIONES[i];
  return (
    <div data-fondo={fondo} style={{ ["--color-acento" as string]: o.color, ["--color-acento-tinta" as string]: o.tinta }}>
      <div className="sticky top-0 z-40 border-b border-raya bg-noche/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-2 px-4 py-2.5">
          <span className="mr-1 text-[12px] font-semibold text-niebla">Acento (sobre fondo oscuro):</span>
          {OPCIONES.map((op, n) => (
            <button
              key={op.id}
              type="button"
              aria-pressed={n === i}
              onClick={() => setI(n)}
              className={`flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12.5px] font-semibold ${
                n === i ? "border-tiza text-tiza" : "border-raya text-niebla"
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: op.color }} />
              {op.nombre}
            </button>
          ))}
        </div>
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-2 px-4 pb-2.5">
          <span className="mr-1 text-[12px] font-semibold text-niebla">Fondo:</span>
          {FONDOS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={f.id === fondo}
              onClick={() => setFondo(f.id)}
              className={`min-h-9 rounded-full border px-3 text-[12.5px] font-semibold ${
                f.id === fondo ? "border-tiza text-tiza" : "border-raya text-niebla"
              }`}
            >
              {f.nombre}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
