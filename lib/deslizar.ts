"use client";

import { useRef } from "react";

/**
 * Pasar de foto deslizando el dedo.
 *
 * Lo usan la tarjeta del catálogo y el visor de la ficha, que son los dos
 * lugares donde hay varias fotos. Vive acá y no adentro de cada uno porque las
 * tres decisiones finas que tiene son fáciles de olvidar al reescribirlo:
 *
 *  1. **Sólo cuenta si fue claramente horizontal.** Si no, se come el scroll
 *     vertical de la página, que es el gesto que más usa la gente.
 *  2. **Tiene un mínimo.** Un dedo nunca se apoya perfectamente quieto, y sin
 *     umbral cada toque movería la foto.
 *  3. **Deslizar no es hacer clic.** El navegador manda el `click` igual cuando
 *     el dedo se movió poco, así que se corta en captura antes de que llegue al
 *     enlace o al botón de abajo.
 */

/** Cuánto hay que arrastrar para que cuente, en píxeles. */
const MINIMO = 40;

export function useDeslizar(mover: (paso: number) => void, activo = true) {
  const arranque = useRef<{ x: number; y: number } | null>(null);
  const arrastro = useRef(false);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      arranque.current = { x: t.clientX, y: t.clientY };
      arrastro.current = false;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!arranque.current || !activo) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - arranque.current.x;
      const dy = t.clientY - arranque.current.y;
      arranque.current = null;
      if (Math.abs(dx) < MINIMO || Math.abs(dx) <= Math.abs(dy)) return;
      arrastro.current = true;
      mover(dx < 0 ? 1 : -1);
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!arrastro.current) return;
      e.preventDefault();
      e.stopPropagation();
      arrastro.current = false;
    },
  };
}
