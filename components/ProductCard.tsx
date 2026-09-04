"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { MessageCircle, Shirt } from "lucide-react";
import type { Producto } from "@/lib/types";
import { linkWhatsApp, precio } from "@/lib/whatsapp";

export function ProductCard({ producto, prioridad = false }: { producto: Producto; prioridad?: boolean }) {
  const [talle, setTalle] = useState(producto.variantes[0]?.talle ?? "");
  const ultima = producto.total === 1;

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
      <div className="relative aspect-square overflow-hidden bg-navy">
        {producto.foto ? (
          <Image
            src={producto.foto}
            alt={producto.nombre}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
            priority={prioridad}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="grid h-full place-items-center text-navy-2">
            <Shirt className="h-12 w-12" strokeWidth={1.25} aria-hidden />
          </div>
        )}

        {ultima && (
          <span
            className="absolute left-2.5 top-2.5 rounded-full bg-red-950/80 px-2.5 py-1
                       text-[10px] font-bold uppercase tracking-[0.11em] text-red-200
                       ring-1 ring-inset ring-red-400/40 backdrop-blur-sm"
          >
            Última unidad
          </span>
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
            className="text-ink transition-colors after:absolute after:inset-0
                       after:z-[1] after:content-[''] hover:text-white
                       focus-visible:underline"
          >
            {producto.nombre}
          </Link>
        </h3>

        <p className="font-display text-3xl font-bold leading-none tabular-nums text-ink">
          {precio(producto.precio)}
        </p>

        {/* selector de talle: solo los que tienen stock */}
        <div className="relative z-10 mt-auto flex flex-wrap gap-1.5" role="group" aria-label="Talles disponibles">
          {producto.variantes.map((v) => {
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
      </div>
    </motion.article>
  );
}
