import { Star } from "lucide-react";
import { RESENAS } from "@/lib/resenas";

/**
 * Mensajes de clientes, entre "Recién llegadas" y el catálogo: es el empujón
 * de confianza justo antes de elegir. Fila que se desliza en el celular para
 * no empujar el catálogo tres tarjetas más abajo.
 *
 * Cada tarjeta lleva cinco estrellas porque los tres mensajes son de clientes
 * conformes. No hay promedio ni cantidad de opiniones: eso recién tiene sentido
 * cuando el cliente cargue su reseña y elija él el puntaje.
 * Sin ninguno cargado, la sección no aparece.
 */
export function Resenas() {
  if (RESENAS.length === 0) return null;

  return (
    <section aria-labelledby="titulo-resenas" className="mt-10">
      <h2
        id="titulo-resenas"
        className="font-display text-3xl font-extrabold uppercase leading-none text-ink sm:text-4xl"
      >
        Lo que dicen los que ya compraron
      </h2>
      <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">
        Mensajes de clientes, tal cual llegaron
      </p>

      <ul
        className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]
                   sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0"
      >
        {RESENAS.map((r) => (
          <li
            key={r.texto}
            className="flex w-[78%] shrink-0 snap-start flex-col rounded-2xl border border-line
                       bg-surface p-5 sm:w-auto"
          >
            <div className="flex gap-0.5 text-amber-500" role="img" aria-label="5 de 5 estrellas">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-current" strokeWidth={0} aria-hidden />
              ))}
            </div>
            <blockquote className="mt-3 text-[15px] leading-relaxed text-ink">{r.texto}</blockquote>
            {(r.nombre || r.camiseta) && (
              <p className="mt-auto pt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
                {[r.nombre, r.camiseta].filter(Boolean).join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
