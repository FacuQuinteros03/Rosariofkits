"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Shirt, X } from "lucide-react";
import type { Producto } from "@/lib/types";

/**
 * Fotos del producto, con vista ampliada.
 *
 * Soporta una o varias: si el modelo tiene más de una aparece la tira de
 * miniaturas y, dentro del visor, flechas y teclado. Para sumar fotos alcanza
 * con dejar `<SKU>-2.jpg` en /public/fotos — no hay que tocar este archivo.
 *
 * El visor se monta con createPortal en el <body>: así ningún ancestro con
 * transform o filter le rompe el `position: fixed`.
 */
export function FotoProducto({ producto }: { producto: Producto }) {
  const fotos = producto.fotos?.length ? producto.fotos : producto.foto ? [producto.foto] : [];
  const [actual, setActual] = useState(0);
  const [abierta, setAbierta] = useState(false);
  const [montado, setMontado] = useState(false);

  const cerrarRef = useRef<HTMLButtonElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMontado(true), []);

  const cerrar = useCallback(() => setAbierta(false), []);
  const mover = useCallback(
    (paso: number) => setActual((i) => (i + paso + fotos.length) % fotos.length),
    [fotos.length]
  );

  useEffect(() => {
    if (!abierta) return;

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    };
    document.addEventListener("keydown", alTeclear);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
      disparadorRef.current?.focus();
    };
  }, [abierta, cerrar, mover]);

  if (!fotos.length) {
    return (
      <div className="grid aspect-square place-items-center rounded-2xl border border-line bg-navy text-navy-2">
        <Shirt className="h-20 w-20" strokeWidth={1} aria-hidden />
      </div>
    );
  }

  const varias = fotos.length > 1;

  const visor = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={producto.nombre}
      onClick={cerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 sm:p-8"
    >
      <button
        ref={cerrarRef}
        type="button"
        onClick={cerrar}
        aria-label="Cerrar"
        className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full
                   bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-white
                   sm:right-6 sm:top-6"
      >
        <X className="h-5 w-5" strokeWidth={2.4} aria-hidden />
      </button>

      {varias && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={(e) => {
              e.stopPropagation();
              mover(-1);
            }}
            className="absolute left-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center
                       rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors
                       hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={(e) => {
              e.stopPropagation();
              mover(1);
            }}
            className="absolute right-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center
                       rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors
                       hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.2} aria-hidden />
          </button>
        </>
      )}

      {/* el clic sobre la foto no cierra: solo el fondo */}
      <div className="relative h-full w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <Image
          src={fotos[actual]}
          alt={`${producto.nombre}${varias ? ` — foto ${actual + 1} de ${fotos.length}` : ""}`}
          fill
          sizes="100vw"
          quality={90}
          className="object-contain"
        />
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[12.5px] text-white/60">
        {varias && (
          <span className="mr-2 font-semibold text-white/80 tabular-nums">
            {actual + 1} / {fotos.length}
          </span>
        )}
        Tocá fuera de la foto o apretá Esc para cerrar
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <button
        ref={disparadorRef}
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Ver ${producto.nombre} en pantalla completa`}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden
                   rounded-2xl border border-line bg-navy
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-gold"
      >
        <Image
          src={fotos[actual]}
          alt={producto.nombre}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          priority
          className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span
          className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5
                     rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-semibold
                     text-white/90 backdrop-blur-sm transition-opacity
                     sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Expand className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
          Ampliar
        </span>
      </button>

      {varias && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {fotos.map((f, i) => (
            <button
              key={f}
              type="button"
              onClick={() => setActual(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === actual}
              className={[
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border transition-colors sm:h-20 sm:w-20",
                i === actual ? "border-white/60" : "border-line hover:border-muted",
              ].join(" ")}
            >
              <Image src={f} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {montado && abierta && createPortal(visor, document.body)}
    </div>
  );
}
