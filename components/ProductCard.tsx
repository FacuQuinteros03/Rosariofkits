"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CarruselFotos } from "./CarruselFotos";
import { conStock, esLanzamiento, type Producto } from "@/lib/types";
import { linkWhatsApp, linkWhatsAppEncargue } from "@/lib/whatsapp";
import { Precio } from "./Precio";
import { AgregarAlCarrito } from "./AgregarAlCarrito";
import { EtiquetaCyber } from "./EtiquetaCyber";
import { GuiaTalles } from "./GuiaTalles";
import { BOTON_BASE, BOTON_VARIANTE } from "./ui/Boton";
import { Insignia, type TipoInsignia } from "./ui/Insignia";
import { versionDe } from "@/lib/talles";

export function ProductCard({ producto, prioridad = false }: { producto: Producto; prioridad?: boolean }) {
  const disponibles = producto.variantes.filter(conStock);
  const agotado = disponibles.length === 0;

  const [talle, setTalle] = useState(disponibles[0]?.talle ?? "");
  const ultima = producto.total === 1;

  /* Las fotos y cómo se pasan viven en CarruselFotos: con 4 a 8 por modelo
     eso dejó de ser "la de frente y la de atrás" y se fue de una tarjeta. */
  const fotos = producto.fotos.length ? producto.fotos : producto.foto ? [producto.foto] : [];

  const apagado = agotado ? "opacity-50 saturate-[0.35]" : "";

  /* Etiquetas sobre la foto, de arriba hacia abajo: qué versión es, en qué
     estado está y cuánto queda. Como mucho tres, y casi siempre una o dos. */
  const version = versionDe(producto.nombre);
  const etiquetas: { tipo: TipoInsignia; texto: string }[] = [];
  if (agotado) {
    etiquetas.push({ tipo: "agotado", texto: "Agotado" });
  } else {
    if (version) etiquetas.push({ tipo: version, texto: version === "player" ? "Player" : "Fan" });
    if (!producto.cyber) {
      if (esLanzamiento(producto)) etiquetas.push({ tipo: "lanzamiento", texto: "Lanzamiento" });
      else if (producto.precioAntes) etiquetas.push({ tipo: "rebajada", texto: "Rebajada" });
      else if (producto.nuevo) etiquetas.push({ tipo: "nuevo", texto: "Nuevo" });
    }
    if (producto.llega) etiquetas.push({ tipo: "camino", texto: `Llega ${producto.llega}` });
    if (ultima) etiquetas.push({ tipo: "ultima", texto: "Última unidad" });
    else if (producto.total <= 3) etiquetas.push({ tipo: "quedan", texto: `Quedan ${producto.total}` });
  }

  return (
    <article
      /* El hover es solo CSS y solo mueve con transform: nada de animar sombras.
         @container: los textos de los botones se acomodan al ancho de la
         tarjeta, no al de la pantalla. */
      className="@container group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface
                 transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none"
    >
      {/* ---------- foto ---------- */}
      <CarruselFotos
        fotos={fotos}
        alt={producto.nombre}
        href={`/producto/${producto.id}`}
        prioridad={prioridad}
        apagado={apagado}
      >
        <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
          {producto.cyber && !agotado && <EtiquetaCyber tipo={producto.cyber} />}
          {etiquetas.map((e) => (
            <Insignia key={e.texto} tipo={e.tipo}>
              {e.texto}
            </Insignia>
          ))}
        </div>
      </CarruselFotos>

      {/* ---------- datos ---------- */}
      <div className="flex flex-1 flex-col gap-3 p-3 @[230px]:p-4">
        <h3 className="line-clamp-3 text-[15px] font-semibold leading-snug [overflow-wrap:anywhere] @[190px]:text-base">
          {/*
            Enlace estirado: el ::after cubre la tarjeta entera, así se puede
            hacer clic en cualquier lado sin anidar <a> dentro de <a>.
            Los controles de compra van con z-10 para quedar por encima.
          */}
          <Link
            href={`/producto/${producto.id}`}
            className={[
              "transition-colors after:absolute after:inset-0 after:z-[1]",
              "after:content-[''] hover:text-azul focus-visible:underline",
              agotado ? "text-muted" : "text-ink",
            ].join(" ")}
          >
            {producto.nombre}
          </Link>
        </h3>

        {/*
          El agotado no lleva precio. Entre que se agota y llega el encargue el
          proveedor puede haber aumentado, y un número viejo en pantalla es una
          promesa que no podemos sostener.
        */}
        {agotado ? (
          <p className="text-[13px] font-semibold text-muted">Precio a confirmar</p>
        ) : (
          <p>
            <Precio producto={producto} tamano="text-[28px] @[190px]:text-[32px] @[260px]:text-[38px]" />
          </p>
        )}

        {agotado ? (
          /*
            Sin chips: un talle clickeable en un producto agotado hace creer
            que hay stock. Va como texto, que es lo que es — información de
            qué talles hubo, para quien quiera encargarlo.
          */
          <p className="mt-auto text-[13px] leading-snug text-muted">
            Se agotó
            {producto.variantes.length > 0 && (
              <> · hubo {producto.variantes.map((v) => v.talle).join(", ")}</>
            )}
          </p>
        ) : (
          <div className="relative z-10 mt-auto">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Talles disponibles">
              {disponibles.map((v) => {
                const activo = v.talle === talle;
                return (
                  <button
                    key={v.sku}
                    type="button"
                    onClick={() => setTalle(v.talle)}
                    aria-pressed={activo}
                    title={`${v.disponible} ${v.disponible === 1 ? "disponible" : "disponibles"}`}
                    className={[
                      "min-h-11 min-w-11 rounded-lg border px-2 text-[14px] font-bold tabular-nums transition-colors",
                      activo
                        ? "border-navy bg-navy text-white"
                        : "border-line bg-surface text-muted hover:border-navy/50 hover:text-ink",
                    ].join(" ")}
                  >
                    {v.talle}
                  </button>
                );
              })}
            </div>
            {producto.categoria !== "Shorts" && (
              <GuiaTalles versionInicial={version ?? "fan"} className="mt-1" />
            )}
          </div>
        )}

        {agotado ? (
          /* el botón lleno queda para lo que se puede comprar hoy: así el
             encargue se ofrece sin competirle a una venta real */
          <a
            href={linkWhatsAppEncargue(producto.nombre, producto.categoria)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Encargar por WhatsApp: ${producto.nombre}`}
            className={`relative z-10 w-full ${BOTON_BASE} ${BOTON_VARIANTE.linea}`}
          >
            <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} aria-hidden />
            <span aria-hidden>
              Encargar<span className="hidden @[230px]:inline"> por WhatsApp</span>
            </span>
          </a>
        ) : (
          <div className="flex flex-col gap-2">
            <a
              href={linkWhatsApp(producto.nombre, talle, producto.categoria)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Pedir por WhatsApp: ${producto.nombre}, talle ${talle}`}
              className={`relative z-10 w-full ${BOTON_BASE} ${BOTON_VARIANTE.whatsapp}`}
            >
              <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} aria-hidden />
              <span aria-hidden>
                Pedir<span className="hidden @[230px]:inline"> por WhatsApp</span>
              </span>
            </a>
            <AgregarAlCarrito producto={producto} talle={talle} compacto />
          </div>
        )}
      </div>
    </article>
  );
}
