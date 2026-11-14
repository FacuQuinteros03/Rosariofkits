"use client";

import { Check, ShoppingBag } from "lucide-react";
import { agregar, useCarrito } from "@/lib/carrito";
import type { Producto } from "@/lib/types";
import { EVENTO_AGREGADO } from "./Carrito";

/**
 * Suma el talle elegido al pedido. Va al lado de "Pedir por WhatsApp", no en su
 * lugar: el que quiere una sola camiseta sigue escribiendo directo, que es lo
 * que hoy funciona; el carrito es para el que arma un pedido de varias (y la
 * promo de 2).
 *
 * `compacto` es la versión chica, para la tarjeta del catálogo.
 */
export function AgregarAlCarrito({
  producto,
  talle,
  compacto = false,
}: {
  producto: Producto;
  talle: string;
  compacto?: boolean;
}) {
  const items = useCarrito();
  const variante = producto.variantes.find((v) => v.talle === talle && v.disponible > 0);
  if (!variante) return null;

  const enCarrito = items.find((i) => i.sku === variante.sku)?.cantidad ?? 0;
  const lleno = enCarrito >= variante.disponible;
  const corto = producto.nombre.replace(/^(camisetas?|shorts?)\s+/i, "");
  const etiqueta = lleno ? "Ya está en tu pedido" : "Agregar al pedido";

  function sumar() {
    if (!variante || lleno) return;
    agregar(producto, variante);
    const conTalle = talle !== "ÚNICO" ? ` (${talle})` : "";
    window.dispatchEvent(new CustomEvent(EVENTO_AGREGADO, { detail: `${corto}${conTalle}` }));
  }

  const Icono = lleno ? Check : ShoppingBag;

  if (compacto) {
    return (
      <button
        type="button"
        onClick={sumar}
        disabled={lleno}
        aria-label={`${etiqueta}: ${producto.nombre}, talle ${talle}`}
        className="corte relative z-10 flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap
                   bg-celeste-suave px-3 font-titulo text-[15px] font-extrabold uppercase leading-none
                   tracking-[0.04em] text-marino transition-colors hover:bg-[#d3e6f9]
                   disabled:bg-panel-2 disabled:text-muted lg:min-h-12 lg:text-[17px]"
      >
        <Icono className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
        {lleno ? "En tu pedido" : "Al pedido"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={sumar}
      disabled={lleno}
      className="flex items-center justify-center gap-2.5 rounded-xl border border-wa/45 px-5 py-3.5
                 text-[15px] font-bold text-wa transition-colors hover:border-wa hover:bg-wa/10
                 disabled:border-line disabled:text-muted disabled:hover:bg-transparent
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                 focus-visible:outline-wa"
    >
      <Icono className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
      {etiqueta}
    </button>
  );
}
