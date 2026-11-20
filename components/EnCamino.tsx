"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageCircle, Shirt } from "lucide-react";
import type { Producto } from "@/lib/types";
import { linkWhatsAppReserva } from "@/lib/whatsapp";
import { FranjaDeslizable } from "./FranjaDeslizable";
import { Precio } from "./Precio";
import { BOTON_BASE, BOTON_VARIANTE } from "./ui/Boton";
import { Insignia } from "./ui/Insignia";

/**
 * "En camino": lo que ya está pedido al proveedor y todavía no llegó.
 *
 * La tarjeta es aparte de la del catálogo a propósito: no hay ficha, no se suma
 * al pedido ni se paga por transferencia, y el botón dice "Reservar". Todo para
 * que nadie crea que la camiseta está en mano. Sin foto, muestra el escudo; sin
 * escudo, una camiseta dibujada.
 */
export function EnCamino({ productos, llega }: { productos: Producto[]; llega: string }) {
  if (productos.length === 0) return null;
  const unidades = productos.reduce((s, p) => s + p.total, 0);

  return (
    <section aria-labelledby="en-camino" className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="en-camino" className="font-display text-3xl font-extrabold uppercase leading-none text-ink sm:text-4xl">
          En camino
        </h2>
        <span className="text-[13px] font-semibold text-muted">
          Llegan {llega} · {unidades} {unidades === 1 ? "prenda" : "prendas"} · reservá la tuya
        </span>
      </div>

      <FranjaDeslizable etiqueta="En camino">
        {productos.map((p) => (
          <TarjetaEnCamino key={p.id} producto={p} />
        ))}
      </FranjaDeslizable>
    </section>
  );
}

function TarjetaEnCamino({ producto: p }: { producto: Producto }) {
  const talles = p.variantes.filter((v) => v.disponible > 0);
  const [talle, setTalle] = useState(talles[0]?.talle ?? "");

  return (
    <article className="@container flex w-[66%] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-line bg-surface sm:w-[250px]">
      <div className="relative aspect-[4/5] overflow-hidden bg-panel-2">
        {p.foto ? (
          <Image src={p.foto} alt={p.nombre} fill sizes="(min-width: 640px) 250px, 66vw" className="object-cover" />
        ) : p.escudo ? (
          <Image
            src={p.escudo}
            alt=""
            fill
            sizes="250px"
            unoptimized={p.escudo.endsWith(".svg")}
            className="object-contain p-12"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <Shirt className="h-14 w-14" strokeWidth={1.25} aria-hidden />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Insignia tipo="nuevo">En camino</Insignia>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 @[230px]:p-4">
        <h3 className="line-clamp-3 text-[15px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
          {p.nombre}
        </h3>
        <p>
          <Precio producto={p} tamano="text-[28px] @[230px]:text-[32px]" />
        </p>

        <div className="mt-auto flex flex-wrap gap-2" role="group" aria-label="Talles que llegan">
          {talles.map((v) => {
            const activo = v.talle === talle;
            return (
              <button
                key={v.sku}
                type="button"
                onClick={() => setTalle(v.talle)}
                aria-pressed={activo}
                className={[
                  "min-h-11 min-w-11 rounded-lg border px-2 text-[14px] font-bold tabular-nums transition-colors",
                  activo ? "border-navy bg-navy text-white" : "border-line bg-surface text-muted hover:border-navy/50 hover:text-ink",
                ].join(" ")}
              >
                {v.talle}
              </button>
            );
          })}
        </div>

        <a
          href={linkWhatsAppReserva(p.nombre, p.categoria, talle)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Reservar por WhatsApp: ${p.nombre}, talle ${talle}`}
          className={`w-full ${BOTON_BASE} ${BOTON_VARIANTE.whatsapp}`}
        >
          <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} aria-hidden />
          <span aria-hidden>
            Reservar<span className="hidden @[230px]:inline"> por WhatsApp</span>
          </span>
        </a>
      </div>
    </article>
  );
}
