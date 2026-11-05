import Image from "next/image";
import Link from "next/link";
import { Zap } from "lucide-react";
import type { Producto } from "@/lib/types";
import {
  CYBER_CIERRE,
  CYBER_HASTA,
  CYBER_PRECIO,
  CYBER_PRECIO_CLAVO,
  enCyber,
} from "@/lib/cyber";
import { precio } from "@/lib/whatsapp";
import { CuentaRegresiva } from "./CuentaRegresiva";
import { FranjaDeslizable } from "./FranjaDeslizable";
import { Precio } from "./Precio";
import { EtiquetaCyber } from "./EtiquetaCyber";

/**
 * El bloque del Cyber Monday en la portada: el cartel grande con la cuenta
 * regresiva y una franja con las camisetas que entran, las de $40.000 primero.
 *
 * Solo lo que tiene stock y foto: es una vidriera, no el catálogo. Fuera de
 * fecha no se dibuja (ver lib/cyber.ts).
 */
export function CyberMonday({ productos }: { productos: Producto[] }) {
  if (!enCyber()) return null;

  const enOferta = productos
    .filter((p) => p.cyber && p.total > 0 && p.foto)
    .sort(
      (a, b) =>
        Number(b.cyber === "clavo") - Number(a.cyber === "clavo") ||
        b.total - a.total ||
        a.nombre.localeCompare(b.nombre, "es"),
    );
  const hayClavos = enOferta.some((p) => p.cyber === "clavo");
  const collage = enOferta.slice(0, 4);

  return (
    <section
      id="cyber"
      aria-labelledby="cyber-titulo"
      className="mt-10 scroll-mt-4"
    >
      {/* ---------- el cartel ---------- */}
      <div
        className="cyber-late relative isolate overflow-hidden rounded-3xl border border-cyan-400/40
                   bg-[#070b18] p-5 sm:p-8"
      >
        {/* luces de neón detrás */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-cyan-500/30 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -right-16 -z-10 h-80 w-80 rounded-full bg-fuchsia-600/30 blur-3xl"
        />
        {/* grilla de fondo, como una pantalla */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]
                     [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)]
                     [background-size:28px_28px]"
        />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-black">
              <Zap className="h-3.5 w-3.5 fill-current" aria-hidden />
              Solo hasta {CYBER_CIERRE}
            </p>

            <h2
              id="cyber-titulo"
              className="mt-3 font-display text-6xl font-extrabold uppercase leading-[0.85] tracking-tight sm:text-8xl"
            >
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-400 bg-clip-text text-transparent">
                Cyber
              </span>
              <br />
              <span className="text-white">Monday</span>
            </h2>

            <div className="mt-5 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-inset ring-cyan-300/30">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-200">
                  Todas las camisetas
                </p>
                <p className="mt-1 font-display text-4xl font-bold leading-none tabular-nums text-white sm:text-5xl">
                  {precio(CYBER_PRECIO)}
                </p>
              </div>
              <div className="rounded-2xl bg-fuchsia-500/15 p-3.5 ring-1 ring-inset ring-fuchsia-300/40">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fuchsia-200">
                  Seleccionadas
                </p>
                <p className="mt-1 font-display text-4xl font-bold leading-none tabular-nums text-white sm:text-5xl">
                  {precio(CYBER_PRECIO_CLAVO)}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                Termina en
              </p>
              <CuentaRegresiva hasta={CYBER_HASTA} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#catalogo"
                className="rounded-full bg-white px-5 py-2.5 text-[14px] font-extrabold uppercase tracking-wide text-black
                           transition-transform hover:scale-[1.03]"
              >
                Ver todas
              </a>
              <span className="text-[12px] leading-snug text-white/55">
                Mientras haya stock. No acumulable con otras promos.
                <br />
                No incluye las recién llegadas (Arsenal Terrace Icons y Retro
                1996) ni shorts.
              </span>
            </div>
          </div>

          {/* collage de camisetas reales, en abanico */}
          {collage.length > 0 && (
            <div className="relative mx-auto hidden h-72 w-80 shrink-0 sm:block lg:mx-0 lg:mr-8 lg:h-80 lg:w-[22rem]">
              {collage.map((p, i) => (
                <span
                  key={p.id}
                  className="absolute top-1/2 block h-56 w-44 overflow-hidden rounded-2xl ring-2 ring-white/15 shadow-2xl shadow-black/60 lg:h-64 lg:w-48"
                  style={{
                    left: `${i * 12}%`,
                    transform: `translateY(-50%) rotate(${(i - (collage.length - 1) / 2) * 7}deg)`,
                    zIndex: i,
                  }}
                >
                  <Image
                    src={p.foto!}
                    alt=""
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------- la franja ---------- */}
      {enOferta.length > 0 && (
        <div className="mt-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-2xl font-extrabold uppercase leading-none text-ink sm:text-3xl">
              {hayClavos
                ? `Desde ${precio(CYBER_PRECIO_CLAVO)}`
                : `Todas a ${precio(CYBER_PRECIO)}`}
            </h3>
            <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">
              {enOferta.length} {enOferta.length === 1 ? "modelo" : "modelos"}{" "}
              en el Cyber
            </span>
          </div>

          <FranjaDeslizable etiqueta="Camisetas del Cyber Monday">
            {enOferta.map((p) => {
              const talles = p.variantes
                .filter((v) => v.disponible > 0)
                .map((v) => v.talle);
              return (
                <Link
                  key={p.id}
                  href={`/producto/${p.id}`}
                  className="group w-[56%] shrink-0 snap-start overflow-hidden rounded-2xl border border-line
                             bg-surface transition-colors hover:border-cyan-400/60 sm:w-[230px]"
                >
                  <span className="relative block aspect-[4/5] overflow-hidden bg-black/30">
                    <Image
                      src={p.foto!}
                      alt={p.nombre}
                      fill
                      sizes="(min-width: 640px) 230px, 56vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <EtiquetaCyber
                      tipo={p.cyber!}
                      className="absolute left-2.5 top-2.5 z-[1]"
                    />
                  </span>
                  <span className="block p-3.5">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                      {p.nombre}
                    </span>
                    <span className="mt-2 flex items-end justify-between gap-2">
                      <Precio producto={p} tamano="text-2xl" />
                      <span className="text-[11px] font-bold tabular-nums text-muted">
                        {talles.join(" · ")}
                      </span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </FranjaDeslizable>
        </div>
      )}
    </section>
  );
}
