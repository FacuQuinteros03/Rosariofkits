"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FOTOS_PORTADA, PORTADA_INTERVALO } from "@/lib/portada";

/**
 * Las fotos de la portada, que se van turnando con un fundido.
 *
 * La primera sale del servidor con prioridad (es el LCP). Las demás se montan
 * de a una, recién cuando les va a tocar: nadie descarga seis fotos para ver
 * una. Una foto recién reemplaza a la anterior cuando terminó de bajar: con
 * conexión lenta se queda la que estaba, nunca un hueco. Con movimiento
 * reducido no rota: queda fija la primera. No hay puntos ni pausa, a pedido:
 * la foto cambia sola y abajo solo va el nombre del equipo.
 */
export function HeroFotos() {
  const total = FOTOS_PORTADA.length;
  const [actual, setActual] = useState(0);
  /** hasta qué foto se montó: crece de a una, nunca baja */
  const [montadas, setMontadas] = useState(1);
  /** la que se ve de verdad: sigue a `actual` cuando esa foto ya bajó */
  const [visible, setVisible] = useState(0);
  const cargadas = useRef(new Set<number>());
  const pedida = useRef(0);

  const ir = (i: number) => {
    pedida.current = i;
    setMontadas((m) => Math.max(m, i + 1));
    setActual(i);
    if (cargadas.current.has(i)) setVisible(i);
  };

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* la siguiente se monta a mitad de camino, así ya bajó cuando le toca */
    const precarga = setTimeout(
      () => setMontadas((m) => Math.max(m, Math.min(total, ((actual + 1) % total) + 1))),
      PORTADA_INTERVALO / 2
    );
    const turno = setTimeout(() => {
      if (!document.hidden) ir((actual + 1) % total);
    }, PORTADA_INTERVALO);
    return () => {
      clearTimeout(precarga);
      clearTimeout(turno);
    };
  }, [actual, total]);

  return (
    <div className="absolute inset-0" aria-label="Fotos de camisetas">
      {FOTOS_PORTADA.slice(0, montadas).map((f, i) => (
        <Image
          key={f.src}
          src={f.src}
          alt={i === visible ? f.alt : ""}
          aria-hidden={i !== visible}
          onLoad={() => {
            cargadas.current.add(i);
            if (pedida.current === i) setVisible(i);
          }}
          fill
          priority={i === 0}
          quality={90}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className={`object-cover transition-opacity duration-700 ease-out ${i === visible ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      {/* de qué equipo es la foto que se está viendo */}
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10 lg:px-6 lg:pb-5">
        <p className="font-titulo text-[17px] font-extrabold uppercase italic leading-none tracking-wide text-white" aria-live="off">
          {FOTOS_PORTADA[actual].equipo}
        </p>
      </div>
    </div>
  );
}
