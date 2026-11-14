"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { FOTOS_PORTADA, PORTADA_INTERVALO } from "@/lib/portada";

/**
 * Las fotos de la portada, que se van turnando con un fundido.
 *
 * La primera sale del servidor con prioridad (es el LCP). Las demás se montan
 * de a una, recién cuando les va a tocar: nadie descarga seis fotos para ver
 * una. Una foto recién reemplaza a la anterior cuando terminó de bajar: con
 * conexión lenta se queda la que estaba, nunca un hueco. Con movimiento reducido no rota sola; se puede pasar a mano con los
 * puntos. Hay botón de pausa porque algo que se mueve solo tiene que poder
 * frenarse.
 */
export function HeroFotos() {
  const total = FOTOS_PORTADA.length;
  const [actual, setActual] = useState(0);
  /** hasta qué foto se montó: crece de a una, nunca baja */
  const [montadas, setMontadas] = useState(1);
  const [pausa, setPausa] = useState(false);
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
    if (pausa) return;
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
  }, [actual, pausa, total]);

  return (
    <div className="absolute inset-0" role="group" aria-roledescription="carrusel" aria-label="Fotos de camisetas">
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

      {/* controles: nombre del equipo, puntos y pausa */}
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10 lg:px-6 lg:pb-5">
        <p className="font-titulo text-[17px] font-extrabold uppercase italic leading-none tracking-wide text-white" aria-live="off">
          {FOTOS_PORTADA[actual].equipo}
        </p>
        <div className="ml-auto flex items-center">
          {FOTOS_PORTADA.map((f, i) => (
            <button
              key={f.src}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ver foto ${i + 1} de ${total}: ${f.equipo}`}
              aria-current={i === actual}
              className="grid h-9 w-6 place-items-center"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === actual ? "w-5 bg-white" : "w-1.5 bg-white/55"
                }`}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPausa((p) => !p)}
            aria-label={pausa ? "Reanudar el cambio de fotos" : "Pausar el cambio de fotos"}
            className="ml-1 grid h-9 w-9 place-items-center rounded-full text-white/90 hover:bg-white/15"
          >
            {pausa ? <Play className="h-4 w-4 fill-current" aria-hidden /> : <Pause className="h-4 w-4 fill-current" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}
