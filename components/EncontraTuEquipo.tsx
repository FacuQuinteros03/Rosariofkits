"use client";

import Image from "next/image";
import type { Producto } from "@/lib/types";
import { FranjaDeslizable } from "./FranjaDeslizable";

export interface Equipo {
  nombre: string;
  /** foto de una camiseta propia con stock */
  foto: string;
  /** el escudo, si hay archivo en /public/escudos; le gana a la foto */
  escudo: string | null;
  modelos: number;
}

/**
 * Los equipos con algo para comprar hoy, de más a menos unidades. El hincha
 * busca su club, no una categoría: es el atajo más corto a lo suyo.
 */
export function equiposConStock(productos: Producto[]): Equipo[] {
  const porEquipo = new Map<
    string,
    { foto: string | null; escudo: string | null; deShort: boolean; modelos: number; unidades: number }
  >();
  for (const p of productos) {
    if (!p.equipo || p.total === 0) continue;
    const e = porEquipo.get(p.equipo) ?? {
      foto: null,
      escudo: null,
      deShort: false,
      modelos: 0,
      unidades: 0,
    };
    e.escudo ??= p.escudo;
    e.modelos += 1;
    e.unidades += p.total;
    /* la foto de una camiseta le gana a la de un short: es la que identifica al equipo */
    const esShort = p.categoria === "Shorts";
    if (p.foto && (!e.foto || (e.deShort && !esShort))) {
      e.foto = p.foto;
      e.deShort = esShort;
    }
    porEquipo.set(p.equipo, e);
  }
  return [...porEquipo.entries()]
    .filter(([, e]) => e.foto)
    .sort(([a, x], [b, y]) => y.unidades - x.unidades || a.localeCompare(b, "es"))
    .map(([nombre, e]) => ({ nombre, foto: e.foto!, escudo: e.escudo, modelos: e.modelos }));
}

export function EncontraTuEquipo({
  equipos,
  activo,
  onElegir,
}: {
  equipos: Equipo[];
  activo: string | null;
  onElegir: (equipo: string | null) => void;
}) {
  if (equipos.length < 2) return null;

  return (
    <section aria-labelledby="encontra-tu-equipo">
      <h3
        id="encontra-tu-equipo"
        className="mb-3 font-display text-xl font-extrabold uppercase leading-none text-ink sm:text-2xl"
      >
        Encontrá tu equipo
      </h3>

      <FranjaDeslizable etiqueta="Equipos">
        {equipos.map((e) => {
          const elegido = activo === e.nombre;
          return (
            <button
              key={e.nombre}
              type="button"
              onClick={() => onElegir(elegido ? null : e.nombre)}
              aria-pressed={elegido}
              className={[
                "group relative aspect-[3/4] w-[104px] shrink-0 snap-start overflow-hidden rounded-xl",
                "border text-left transition-colors sm:w-[124px]",
                elegido ? "border-white ring-2 ring-white/70" : "border-line hover:border-navy-2",
              ].join(" ")}
            >
              {e.escudo ? (
                /*
                  Con escudo: el escudo centrado sobre el fondo de la marca,
                  con aire alrededor para que ninguno se vea apretado. El SVG
                  va sin optimizar: next/image no los procesa.
                */
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,var(--color-navy-2),var(--color-surface)_70%)]">
                  <Image
                    src={e.escudo}
                    alt=""
                    fill
                    sizes="124px"
                    unoptimized={e.escudo.endsWith(".svg")}
                    className={[
                      "object-contain px-5 pb-12 pt-5 drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]",
                      "transition duration-500 group-hover:scale-[1.08]",
                      activo && !elegido ? "opacity-40 saturate-50" : "",
                    ].join(" ")}
                  />
                </span>
              ) : (
                <>
                  <Image
                    src={e.foto}
                    alt=""
                    fill
                    sizes="124px"
                    className={[
                      "object-cover transition duration-500 group-hover:scale-[1.06]",
                      activo && !elegido ? "opacity-50 saturate-50" : "",
                    ].join(" ")}
                  />
                  {/* degradé para que el nombre se lea sobre cualquier camiseta */}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                </>
              )}
              <span className="absolute inset-x-2 bottom-2">
                <span className="block font-display text-[17px] font-extrabold uppercase leading-[0.95] text-white">
                  {e.nombre}
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/65">
                  {e.modelos} {e.modelos === 1 ? "modelo" : "modelos"}
                </span>
              </span>
            </button>
          );
        })}
      </FranjaDeslizable>
    </section>
  );
}
