"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { conStock, type Producto } from "@/lib/types";
import { linkWhatsApp, linkWhatsAppEncargue } from "@/lib/whatsapp";

/**
 * Talles + botón de pedido, en tamaño grande para la página de detalle.
 *
 * Si el modelo está agotado no desaparece: los talles pasan a ser "¿cuál
 * buscás?" y el botón abre un pedido por encargue con ese talle ya escrito.
 */
export function SelectorTalle({ producto }: { producto: Producto }) {
  const disponibles = producto.variantes.filter(conStock);
  const agotado = disponibles.length === 0;

  /* agotado: se ofrecen todos los talles que alguna vez tuvo, para encargar */
  const opciones = agotado ? producto.variantes : disponibles;
  const [talle, setTalle] = useState(opciones[0]?.talle ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {agotado ? "¿Qué talle buscás?" : "Talles disponibles"}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Talles">
          {opciones.map((v) => {
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
                {!agotado && (
                  <span className="ml-1.5 text-[10px] font-semibold opacity-60">{v.disponible}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {agotado ? (
        <a
          href={linkWhatsAppEncargue(producto.nombre, producto.categoria, talle)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 rounded-xl border border-wa/45 px-5 py-3.5
                     text-[15px] font-bold text-wa transition-colors hover:border-wa hover:bg-wa/10
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-wa"
        >
          <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
          Pedilo por encargue
        </a>
      ) : (
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
      )}
    </div>
  );
}
