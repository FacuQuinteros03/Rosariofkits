"use client";

import { useEffect, useState } from "react";
import { VERSION_HERO } from "@/lib/hero";

/**
 * El clip de la portada, encima de la imagen fija.
 *
 * La imagen fija la pone Hero en el servidor y es lo que se ve primero (y lo
 * único, si esto no llega a correr). El video se decide recién en el navegador
 * porque depende de cosas que el servidor no sabe:
 *  - el ancho: en el celular va el clip vertical, que tiene al jugador arriba
 *    y deja libre la parte de abajo, donde va el texto;
 *  - "reducir movimiento" y el ahorro de datos: ahí no se baja nada.
 *
 * Aparece con una transición de CSS cuando ya está reproduciendo, así nunca
 * se ve un recuadro negro mientras carga.
 */
export function HeroVideo() {
  const [src, setSrc] = useState<string | null>(null);
  const [andando, setAndando] = useState(false);

  useEffect(() => {
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ahorro = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (quieto || ahorro) return;
    const clip = window.matchMedia("(max-width: 639px)").matches ? "port" : "land";
    setSrc(`/hero-golazo-${clip}-${VERSION_HERO}.mp4`);
  }, []);

  if (!src) return null;

  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      onPlaying={() => setAndando(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
        andando ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
