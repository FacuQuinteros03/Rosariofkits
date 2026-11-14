"use client";

import { useRef, useState } from "react";
import { Ruler, X } from "lucide-react";
import { TABLA_TALLES, VERSIONES, type Version } from "@/lib/talles";
import { linkWhatsAppGeneral } from "@/lib/whatsapp";

/**
 * El botón "Guía de talles" y la ventana con la tabla.
 *
 * Es un <dialog> nativo: trae gratis el foco atrapado, el cierre con Escape y
 * el fondo. `versionInicial` abre la pestaña que corresponde al producto.
 */
export function GuiaTalles({
  versionInicial = "fan",
  className = "",
}: {
  versionInicial?: Version;
  className?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [version, setVersion] = useState<Version>(versionInicial);
  const info = VERSIONES.find((v) => v.id === version)!;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        className={`inline-flex min-h-9 items-center gap-1.5 text-[12.5px] font-semibold text-azul underline-offset-4 hover:underline ${className}`}
      >
        <Ruler className="h-4 w-4" strokeWidth={2} aria-hidden />
        Guía de talles
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby="guia-titulo"
        onClick={(e) => e.target === dialogo.current && dialogo.current?.close()}
        className="m-auto w-[min(92vw,440px)] rounded-xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-navy/60"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id="guia-titulo" className="font-titulo text-3xl font-extrabold uppercase leading-none text-navy">
              Guía de talles
            </h2>
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              aria-label="Cerrar la guía de talles"
              className="-mr-1.5 -mt-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-navy/5 hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-panel-2 p-1" role="group" aria-label="Versión">
            {VERSIONES.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={v.id === version}
                onClick={() => setVersion(v.id)}
                className={`min-h-10 rounded-md text-[14px] font-bold ${
                  v.id === version ? "bg-navy text-white" : "text-muted hover:text-ink"
                }`}
              >
                {v.nombre}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-ink/85">{info.calce}</p>

          <table className="mt-3 w-full text-[14.5px] tabular-nums">
            <caption className="sr-only">Medidas en centímetros, versión {info.nombre}</caption>
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-[0.08em] text-muted">
                <th scope="col" className="py-2 font-semibold">Talle</th>
                <th scope="col" className="py-2 text-right font-semibold">Ancho</th>
                <th scope="col" className="py-2 text-right font-semibold">Largo</th>
              </tr>
            </thead>
            <tbody>
              {TABLA_TALLES[version].map((f) => (
                <tr key={f.talle} className="border-b border-line/70 last:border-0">
                  <th scope="row" className="py-2.5 text-left font-bold text-navy">{f.talle}</th>
                  <td className="py-2.5 text-right">{f.ancho} cm</td>
                  <td className="py-2.5 text-right">{f.largo} cm</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-[12.5px] leading-snug text-muted">
            Medidas con la prenda apoyada plana: ancho de axila a axila, largo desde el hombro.
            Pueden variar 1 o 2 cm. Compará con una remera tuya que te quede bien.
          </p>
          <a
            href={linkWhatsAppGeneral()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[13.5px] font-semibold text-azul underline underline-offset-4"
          >
            ¿Dudás entre dos talles? Escribinos
          </a>
        </div>
      </dialog>
    </>
  );
}
