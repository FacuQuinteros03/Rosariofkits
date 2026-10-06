import Image from "next/image";
import Link from "next/link";
import type { Producto } from "@/lib/types";
import { precio } from "@/lib/whatsapp";
import { FranjaDeslizable } from "./FranjaDeslizable";

/**
 * "Recién llegadas": los modelos marcados en la columna Nuevo del Sheet.
 *
 * Solo lo que tiene stock y foto: una novedad agotada o sin imagen no le
 * muestra nada a nadie. Si no queda ninguna, la franja no aparece — un título
 * con una fila vacía abajo se ve peor que no tenerla.
 *
 * Cada tarjeta lleva a la ficha, no a WhatsApp: acá la persona todavía está
 * mirando, y en la ficha elige el talle antes de escribir.
 */
export function RecienLlegadas({ productos }: { productos: Producto[] }) {
  /* primero lo que más unidades tiene: es lo que aguanta que la franja lo
     muestre una semana sin agotarse */
  const nuevos = productos
    .filter((p) => p.nuevo && p.total > 0 && p.foto)
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
  if (nuevos.length === 0) return null;

  return (
    <section aria-labelledby="recien-llegadas" className="mt-10">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2
          id="recien-llegadas"
          className="font-display text-3xl font-extrabold uppercase leading-none text-ink sm:text-4xl"
        >
          Recién llegadas
        </h2>
        <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">
          {nuevos.length} {nuevos.length === 1 ? "modelo" : "modelos"}
        </span>
      </div>

      <FranjaDeslizable etiqueta="Recién llegadas">
        {nuevos.map((p, i) => {
          const talles = p.variantes.filter((v) => v.disponible > 0).map((v) => v.talle);
          return (
            <Link
              key={p.id}
              href={`/producto/${p.id}`}
              className="group w-[62%] shrink-0 snap-start overflow-hidden rounded-2xl border border-line
                         bg-surface transition-colors hover:border-navy-2 sm:w-[260px]"
            >
              <span className="relative block aspect-[4/5] overflow-hidden bg-black/30">
                <Image
                  src={p.foto!}
                  alt={p.nombre}
                  fill
                  sizes="(min-width: 640px) 260px, 62vw"
                  priority={i < 2}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {/*
                  Al pasar el mouse aparece la segunda foto (la espalda, con el
                  dorsal). En el celular no hay hover: ahí se ve la de frente y
                  las demás en la ficha. Tailwind v4 ya limita group-hover a
                  pantallas con mouse, así que un toque no la deja trabada.
                */}
                {p.fotos[1] && (
                  <Image
                    src={p.fotos[1]}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 260px, 62vw"
                    className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                )}
                <span
                  className="absolute left-2.5 top-2.5 z-[1] rounded-full bg-gold px-2.5 py-1 text-[10px]
                             font-extrabold uppercase tracking-[0.12em] text-black/85"
                >
                  Nuevo
                </span>
              </span>
              <span className="block p-3.5">
                <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{p.nombre}</span>
                <span className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-bold leading-none tabular-nums text-ink">
                    {precio(p.precio)}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-muted">{talles.join(" · ")}</span>
                </span>
              </span>
            </Link>
          );
        })}
      </FranjaDeslizable>
    </section>
  );
}
