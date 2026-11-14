"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { HERO_SECUENCIA as SEC } from "@/lib/hero-secuencia";

/**
 * El fondo de la portada: una secuencia de cuadros que avanza con el scroll.
 *
 * Es un <canvas> y no un <video> porque mover el tiempo de un video con el
 * scroll anda a los saltos en Safari de iPhone. Debajo del canvas queda el
 * primer cuadro como imagen común: es lo que se ve si el JS tarda, falla, o
 * si la persona pidió menos movimiento o está ahorrando datos. En esos casos
 * la secuencia ni se descarga.
 *
 * El avance se escribe en --avance y data-etapa del contenedor `.hero-scroll`
 * más cercano, para que el texto de la portada acompañe sin re-renderizar.
 */
export function HeroScroll({ alt }: { alt: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const seccion = canvas?.closest<HTMLElement>(".hero-scroll");
    if (!canvas || !seccion) return;

    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ahorro = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (quieto || ahorro) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { carpeta, cuadros: total } = matchMedia("(max-width: 1023px)").matches ? SEC.movil : SEC.escritorio;
    const cuadros: (HTMLImageElement | undefined)[] = new Array(total);
    let vivo = true;
    let buscado = 0;
    let dibujado = -1;
    let pendiente = 0;

    /** El cuadro pedido o, si todavía no bajó, el más cercano que sí. */
    const dibujar = () => {
      pendiente = 0;
      let i = buscado;
      for (let d = 0; d < total && !cuadros[i]; d++) {
        if (cuadros[buscado - d]) i = buscado - d;
        else if (cuadros[buscado + d]) i = buscado + d;
      }
      const img = cuadros[i];
      if (!img || i === dibujado) return;
      if (canvas.width !== img.naturalWidth) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      ctx.drawImage(img, 0, 0);
      dibujado = i;
      canvas.style.opacity = "1";
    };
    const pedirDibujo = () => {
      if (!pendiente) pendiente = requestAnimationFrame(dibujar);
    };

    const alScrollear = () => {
      const r = seccion.getBoundingClientRect();
      const recorrido = r.height - innerHeight;
      const avance = recorrido > 0 ? Math.min(1, Math.max(0, -r.top / recorrido)) : 0;
      seccion.style.setProperty("--avance", avance.toFixed(4));
      seccion.dataset.etapa = avance < 0.3 ? "1" : avance < 0.72 ? "2" : "3";
      buscado = Math.round(avance * (total - 1));
      pedirDibujo();
    };

    /* de a cuatro y en orden: lo primero que se ve es lo primero que baja */
    let proximo = 0;
    const bajar = () => {
      if (!vivo || proximo >= total) return;
      const i = proximo++;
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => {
        cuadros[i] = img;
        if (Math.abs(i - buscado) <= 1) pedirDibujo();
        bajar();
      };
      img.onerror = bajar;
      img.src = `${SEC.base}/${carpeta}/${String(i + 1).padStart(3, "0")}.webp`;
    };
    const arrancar = () => {
      for (let n = 0; n < 4; n++) bajar();
    };

    /* la secuencia espera a que la página termine de cargar: no le compite al
       primer pantallazo, que es lo que mide el LCP */
    if (document.readyState === "complete") arrancar();
    else addEventListener("load", arrancar, { once: true });

    addEventListener("scroll", alScrollear, { passive: true });
    addEventListener("resize", alScrollear);
    alScrollear();

    return () => {
      vivo = false;
      removeEventListener("load", arrancar);
      removeEventListener("scroll", alScrollear);
      removeEventListener("resize", alScrollear);
      if (pendiente) cancelAnimationFrame(pendiente);
    };
  }, []);

  return (
    <>
      <Image
        src={SEC.poster}
        alt={alt}
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
      <canvas
        ref={lienzo}
        aria-hidden
        width={SEC.ancho}
        height={SEC.alto}
        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300"
      />
    </>
  );
}
