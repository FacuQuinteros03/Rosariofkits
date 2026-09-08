"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Images, MessageCircle, Shirt } from "lucide-react";
import { conStock, type Producto } from "@/lib/types";
import { linkWhatsApp, linkWhatsAppEncargue, precio } from "@/lib/whatsapp";

export function ProductCard({ producto, prioridad = false }: { producto: Producto; prioridad?: boolean }) {
  const disponibles = producto.variantes.filter(conStock);
  const agotado = disponibles.length === 0;

  const [talle, setTalle] = useState(disponibles[0]?.talle ?? "");
  const ultima = producto.total === 1;

  /*
    Frente y dorso. En escritorio el dorso aparece al pasar el mouse; en el
    celular, donde no hay hover, se toca la pastilla del contador.

    La segunda foto no se monta hasta el primer hover: si se dejara puesta en
    opacity 0 igual la descargaría, y serían el doble de imágenes en la grilla
    para algo que la mayoría no va a mirar.
  */
  const fotos = producto.fotos.length ? producto.fotos : producto.foto ? [producto.foto] : [];
  const varias = fotos.length > 1;
  const [indice, setIndice] = useState(0);
  const [preparada, setPreparada] = useState(false);
  const siguiente = varias ? fotos[(indice + 1) % fotos.length] : null;

  const apagado = agotado ? "opacity-45 saturate-[0.35]" : "";

  return (
    <motion.article
      layout
      /* sin entrada animada: el contenido no puede depender de rAF, que el
         navegador pausa en pestañas de fondo. Motion queda para el hover. */
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface
                 shadow-lg shadow-black/20 transition-colors hover:border-navy-2"
    >
      {/* ---------- foto ---------- */}
      <div
        className="relative aspect-square overflow-hidden bg-navy"
        onMouseEnter={() => setPreparada(true)}
      >
        {fotos.length ? (
          <>
            <Image
              src={fotos[indice]}
              alt={producto.nombre}
              fill
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
              priority={prioridad}
              className={[
                "object-cover transition-transform duration-500 group-hover:scale-[1.05]",
                /* el agotado se apaga, pero se sigue viendo: es la prueba de que
                   ese modelo se vendió, y lo que dispara el pedido por encargue */
                apagado,
              ].join(" ")}
            />
            {siguiente && preparada && (
              <Image
                src={siguiente}
                alt=""
                fill
                sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
                className={[
                  "object-cover opacity-0 transition-all duration-300",
                  "group-hover:scale-[1.05] group-hover:opacity-100",
                  apagado,
                ].join(" ")}
              />
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center text-navy-2">
            <Shirt className="h-12 w-12" strokeWidth={1.25} aria-hidden />
          </div>
        )}

        {varias && (
          <button
            type="button"
            onClick={() => setIndice((i) => (i + 1) % fotos.length)}
            aria-label={`Ver la otra foto de ${producto.nombre}`}
            className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full
                       bg-black/55 px-2 py-1 text-[10px] font-bold tabular-nums text-white/85
                       backdrop-blur-sm transition-colors hover:bg-black/75
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <Images className="h-3 w-3" strokeWidth={2.4} aria-hidden />
            {indice + 1}/{fotos.length}
          </button>
        )}

        {agotado ? (
          <span
            className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2.5 py-1
                       text-[10px] font-bold uppercase tracking-[0.11em] text-white/85
                       ring-1 ring-inset ring-white/20 backdrop-blur-sm"
          >
            Agotado
          </span>
        ) : (
          ultima && (
            <span
              className="absolute left-2.5 top-2.5 rounded-full bg-red-950/80 px-2.5 py-1
                         text-[10px] font-bold uppercase tracking-[0.11em] text-red-200
                         ring-1 ring-inset ring-red-400/40 backdrop-blur-sm"
            >
              Última unidad
            </span>
          )
        )}
      </div>

      {/* ---------- datos ---------- */}
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <h3 className="text-sm font-semibold leading-snug sm:text-[15px]">
          {/*
            Enlace estirado: el ::after cubre la tarjeta entera, así se puede
            hacer clic en cualquier lado sin anidar <a> dentro de <a>.
            Los controles de compra van con z-10 para quedar por encima.
          */}
          <Link
            href={`/producto/${producto.id}`}
            className={[
              "transition-colors after:absolute after:inset-0 after:z-[1]",
              "after:content-[''] hover:text-white focus-visible:underline",
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
          <p className="font-display text-3xl font-bold leading-none tabular-nums text-ink">
            {precio(producto.precio)}
          </p>
        )}

        {agotado ? (
          /*
            Sin chips: un talle clickeable en un producto agotado hace creer
            que hay stock. Va como texto, que es lo que es — información de
            qué talles hubo, para quien quiera encargarlo.
          */
          <p className="mt-auto text-[11.5px] leading-snug text-muted">
            Se agotó
            {producto.variantes.length > 0 && (
              <> · hubo {producto.variantes.map((v) => v.talle).join(", ")}</>
            )}
          </p>
        ) : (
          <div className="relative z-10 mt-auto flex flex-wrap gap-1.5" role="group" aria-label="Talles disponibles">
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
                    "min-w-[38px] rounded-lg border px-2.5 py-1.5 text-xs font-bold tabular-nums transition-colors",
                    activo
                      ? "border-white/60 bg-white/10 text-white"
                      : "border-line text-muted hover:border-muted hover:text-ink",
                  ].join(" ")}
                >
                  {v.talle}
                </button>
              );
            })}
          </div>
        )}

        {agotado ? (
          /* el verde lleno queda para lo que se puede comprar hoy: así el
             encargue se ofrece sin competirle a una venta real */
          <a
            href={linkWhatsAppEncargue(producto.nombre, producto.categoria)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 flex items-center justify-center gap-2 rounded-xl border border-wa/45
                       px-3 py-2.5 text-[13px] font-bold text-wa transition-colors
                       hover:border-wa hover:bg-wa/10
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-wa"
          >
            <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
            Pedilo por encargue
          </a>
        ) : (
          <a
            href={linkWhatsApp(producto.nombre, talle, producto.categoria)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 flex items-center justify-center gap-2 rounded-xl bg-wa px-3 py-2.5
                       text-[13px] font-bold text-black/85 transition-colors hover:bg-wa-dark
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-wa"
          >
            <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
            Pedir por WhatsApp
          </a>
        )}
      </div>
    </motion.article>
  );
}
