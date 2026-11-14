"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { CarruselFotos } from "./CarruselFotos";
import { conStock, esLanzamiento, type Producto } from "@/lib/types";
import { linkWhatsApp, linkWhatsAppEncargue } from "@/lib/whatsapp";
import { Precio } from "./Precio";
import { AgregarAlCarrito } from "./AgregarAlCarrito";
import { EtiquetaCyber } from "./EtiquetaCyber";
import { GuiaTalles } from "./GuiaTalles";
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
    if (ultima) etiquetas.push({ tipo: "ultima", texto: "Última unidad" });
    else if (producto.total <= 3) etiquetas.push({ tipo: "quedan", texto: `Quedan ${producto.total}` });
  }

  return (
    <motion.article
      layout
      /* sin entrada animada: el contenido no puede depender de rAF, que el
         navegador pausa en pestañas de fondo. Motion queda para el hover. */
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface
                 shadow-[0_1px_2px_rgb(15_35_64/0.06)] transition-shadow duration-300
                 hover:shadow-[0_14px_34px_-12px_rgb(15_35_64/0.28)]"
    >
      {/* ---------- foto ---------- */}
      <CarruselFotos
        fotos={fotos}
        alt={producto.nombre}
        href={`/producto/${producto.id}`}
        prioridad={prioridad}
        apagado={apagado}
      >
        <div className="absolute left-0 top-3 z-10 flex flex-col items-start gap-1.5">
          {producto.cyber && !agotado && <EtiquetaCyber tipo={producto.cyber} className="ml-2.5" />}
          {etiquetas.map((e) => (
            <Insignia
              key={e.texto}
              tipo={e.tipo}
              className="shadow-sm [clip-path:polygon(0_0,100%_0,calc(100%-0.7em)_100%,0_100%)]"
            >
              {e.texto}
            </Insignia>
          ))}
        </div>
      </CarruselFotos>

      {/* ---------- datos ---------- */}
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4 lg:gap-3.5">
        <h3 className="text-[14px] font-semibold leading-snug lg:text-[16px]">
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
          <p className="text-[12.5px] font-semibold text-muted">Precio a confirmar</p>
        ) : (
          <p>
            <Precio producto={producto} tamano="text-[32px] lg:text-[40px]" />
          </p>
        )}

        {agotado ? (
          /*
            Sin chips: un talle clickeable en un producto agotado hace creer
            que hay stock. Va como texto, que es lo que es — información de
            qué talles hubo, para quien quiera encargarlo.
          */
          <p className="mt-auto text-[12px] leading-snug text-muted">
            Se agotó
            {producto.variantes.length > 0 && (
              <> · hubo {producto.variantes.map((v) => v.talle).join(", ")}</>
            )}
          </p>
        ) : (
          <div className="relative z-10 mt-auto">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Talles disponibles">
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
                      "min-h-9 min-w-10 rounded-md border px-2 text-[13px] font-bold tabular-nums transition-colors",
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
            className="corte relative z-10 flex min-h-11 items-center justify-center gap-2 whitespace-nowrap
                       bg-celeste-suave px-3 font-titulo text-[15px] font-extrabold uppercase leading-none
                       tracking-[0.04em] text-marino transition-colors hover:bg-[#d3e6f9] lg:text-[17px]"
          >
            <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
            <span>
              Pedila<span className="max-sm:sr-only"> por encargue</span>
            </span>
          </a>
        ) : (
          <div className="flex flex-col gap-2">
            <a
              href={linkWhatsApp(producto.nombre, talle, producto.categoria)}
              target="_blank"
              rel="noopener noreferrer"
              className="corte relative z-10 flex min-h-11 items-center justify-center gap-2 whitespace-nowrap bg-wa
                         px-3 font-titulo text-[15px] font-extrabold uppercase leading-none tracking-[0.04em]
                         text-white transition-colors hover:bg-wa-dark lg:min-h-12 lg:text-[17px]"
            >
              <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} aria-hidden />
              <span>
                Pedir<span className="max-sm:sr-only"> por WhatsApp</span>
              </span>
            </a>
            <AgregarAlCarrito producto={producto} talle={talle} compacto />
          </div>
        )}
      </div>
    </motion.article>
  );
}
