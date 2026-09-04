"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Producto } from "@/lib/types";
import { linkWhatsApp } from "@/lib/whatsapp";

/** Talles + botón de pedido, en tamaño grande para la página de detalle. */
export function SelectorTalle({ producto }: { producto: Producto }) {
  const [talle, setTalle] = useState(producto.variantes[0]?.talle ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Talles disponibles
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Talles disponibles">
          {producto.variantes.map((v) => {
            const activo = v.talle === talle;
            return (
              <button
                key={v.sku}
                type="button"
                onClick={() => setTalle(v.talle)}
                aria-pressed={activo}
                className={[
                  "min-w-[52px] rounded-xl border px-4 py-2.5 text-sm font-bold tabular-nums transition-colors",
                  activo
                    ? "border-white/60 bg-white/10 text-white"
                    : "border-line text-muted hover:border-muted hover:text-ink",
                ].join(" ")}
              >
                {v.talle}
                <span className="ml-1.5 text-[10px] font-semibold opacity-60">{v.disponible}</span>
              </button>
            );
          })}
        </div>
      </div>

      <a
        href={linkWhatsApp(producto.nombre, talle, producto.categoria)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 rounded-xl bg-wa px-5 py-3.5
                   text-[15px] font-bold text-black/85 transition-colors hover:bg-wa-dark
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-wa"
      >
        <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
        Pedir por WhatsApp
      </a>
    </div>
  );
}
