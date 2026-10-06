"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Fila horizontal que se desliza con el dedo, con flechas en escritorio.
 *
 * El deslizamiento es CSS puro (overflow + scroll-snap), así que en el celular
 * no depende de que el JavaScript cargue. Las flechas son solo para el mouse:
 * sin ellas, en una PC sin trackpad no hay forma cómoda de ver lo que quedó a
 * la derecha. Cada flecha desaparece cuando ya no hay nada de ese lado.
 */
export function FranjaDeslizable({
  children,
  etiqueta,
}: {
  children: ReactNode;
  /** nombre para lectores de pantalla, ej. "Recién llegadas" */
  etiqueta: string;
}) {
  const fila = useRef<HTMLDivElement>(null);
  const [hayIzq, setHayIzq] = useState(false);
  const [hayDer, setHayDer] = useState(false);

  useEffect(() => {
    const el = fila.current;
    if (!el) return;
    const medir = () => {
      setHayIzq(el.scrollLeft > 4);
      setHayDer(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      ro.disconnect();
    };
  }, []);

  /* avanza casi una pantalla, dejando a la vista un pedazo de lo anterior */
  const mover = (sentido: 1 | -1) => {
    const el = fila.current;
    if (el) el.scrollBy({ left: sentido * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const flecha =
    "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full " +
    "border border-white/20 bg-ground/85 text-ink shadow-lg shadow-black/40 backdrop-blur-sm " +
    "transition-colors hover:bg-surface sm:grid";

  return (
    <div className="relative">
      <div
        ref={fila}
        role="region"
        aria-label={etiqueta}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1
                   [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {hayIzq && (
        <button type="button" onClick={() => mover(-1)} aria-label="Anteriores" className={`${flecha} -left-2`}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      )}
      {hayDer && (
        <button type="button" onClick={() => mover(1)} aria-label="Siguientes" className={`${flecha} -right-2`}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
