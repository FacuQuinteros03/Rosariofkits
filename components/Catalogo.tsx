"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { CATEGORIAS, pesoTalle, type Categoria, type Producto } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { PromoBanner } from "./PromoBanner";

/** Marcas de acento, para comparar "japon" con "Japón". */
const SIN_TILDES = new RegExp("[" + "\u0300-\u036f" + "]", "g");

/** Quita acentos y pasa a minusculas, para que "japon" encuentre "Japón". */
function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(SIN_TILDES, "");
}

/**
 * ¿Este modelo entra en el filtro de talle?
 *
 * Con stock tiene que haber unidades de ese talle. Si está agotado alcanza con
 * que alguna vez lo haya tenido: quien busca su talle también quiere ver qué
 * modelos puede encargar en esa medida.
 */
function tieneTalle(p: Producto, talle: string) {
  return p.total === 0
    ? p.variantes.some((v) => v.talle === talle)
    : p.variantes.some((v) => v.talle === talle && v.disponible > 0);
}

const GRILLA =
  "grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5";

export function Catalogo({ productos }: { productos: Producto[] }) {
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Todas");
  const [talle, setTalle] = useState<string | null>(null);

  // el indice de busqueda se calcula una sola vez
  const indexados = useMemo(
    () => productos.map((p) => ({ p, buscar: normalizar(`${p.nombre} ${p.categoria}`) })),
    [productos]
  );

  const categoriasConStock = useMemo(() => {
    const usadas = new Set(productos.map((p) => p.categoria));
    return CATEGORIAS.filter((c) => c === "Todas" || usadas.has(c as never));
  }, [productos]);

  /* la categoría manda sobre qué talles tiene sentido ofrecer */
  const deCategoria = useMemo(
    () => (categoria === "Todas" ? productos : productos.filter((p) => p.categoria === categoria)),
    [productos, categoria]
  );

  const tallesChips = useMemo(() => {
    const usados = new Set<string>();
    for (const p of deCategoria) {
      for (const v of p.variantes) if (v.disponible > 0) usados.add(v.talle);
    }
    return [...usados].sort((a, b) => pesoTalle(a) - pesoTalle(b));
  }, [deCategoria]);

  /*
    Si al cambiar de categoría el talle elegido ya no existe, el filtro se
    ignora solo. Se guarda igual: si vuelve a esa categoría, vuelve a aplicar.
  */
  const talleActivo = talle && tallesChips.includes(talle) ? talle : null;

  const visibles = useMemo(() => {
    const q = normalizar(texto.trim());
    return indexados
      .filter(({ p, buscar }) => {
        if (categoria !== "Todas" && p.categoria !== categoria) return false;
        if (talleActivo && !tieneTalle(p, talleActivo)) return false;
        if (q && !buscar.includes(q)) return false;
        return true;
      })
      .map(({ p }) => p);
  }, [indexados, texto, categoria, talleActivo]);

  /*
    Los agotados van aparte y al final. Se muestran a propósito: son la prueba
    de que el modelo se vende, y desde ahí sale el pedido por encargue. Pero
    nunca se mezclan con lo que se puede comprar hoy.
  */
  const enStock = visibles.filter((p) => p.total > 0);
  const agotados = visibles.filter((p) => p.total === 0);
  const unidades = enStock.reduce((s, p) => s + p.total, 0);

  // dos productos reales, con stock, para ilustrar la promo
  const ejemploCamiseta = productos.find((p) => p.categoria !== "Shorts" && p.foto && p.total > 0);
  const ejemploShort = productos.find((p) => p.categoria === "Shorts" && p.foto && p.total > 0);

  return (
    <section aria-label="Catálogo">
      <div className="mb-4">
        <PromoBanner
          camiseta={ejemploCamiseta}
          short={ejemploShort}
          onVerShorts={() => setCategoria("Shorts")}
        />
      </div>

      {/* ---------- controles ---------- */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-ground/85 px-4 py-3 backdrop-blur-md">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar: Boca, River, Messi, Real Madrid, short…"
            aria-label="Buscar en el catálogo"
            className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-10
                       text-[15px] text-ink placeholder:text-muted
                       focus:border-navy-2 focus:outline-none focus:ring-2 focus:ring-navy-2/60"
          />
          {texto && (
            <button
              type="button"
              onClick={() => setTexto("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoriasConStock.map((c) => {
            const activo = categoria === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                aria-pressed={activo}
                className={[
                  "relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  activo ? "text-ground" : "border border-line text-muted hover:text-ink",
                ].join(" ")}
              >
                {activo && (
                  <motion.span
                    layoutId="chip-activo"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{c}</span>
              </button>
            );
          })}
        </div>

        {/*
          Filtro por talle. Casi todo el stock es una unidad por talle, así que
          "¿lo tenés en mi talle?" es LA pregunta: merece su propia fila y no
          quedar escondido al final del scroll horizontal de categorías.
        */}
        {tallesChips.length > 1 && (
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Talle
            </span>
            {tallesChips.map((t) => {
              const activo = talleActivo === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTalle(activo ? null : t)}
                  aria-pressed={activo}
                  className={[
                    "shrink-0 rounded-lg border px-2.5 py-1 text-[12px] font-bold tabular-nums transition-colors",
                    activo
                      ? "border-white/60 bg-white/10 text-white"
                      : "border-line text-muted hover:border-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
            {talleActivo && (
              <button
                type="button"
                onClick={() => setTalle(null)}
                className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-muted underline underline-offset-2 hover:text-ink"
              >
                Todos
              </button>
            )}
          </div>
        )}
      </div>

      <p className="flex items-center gap-2.5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        <span
          className="h-3 w-2.5 shrink-0 bg-navy-2"
          style={{ clipPath: "polygon(38% 0,100% 0,62% 100%,0 100%)" }}
          aria-hidden
        />
        {enStock.length} {enStock.length === 1 ? "modelo" : "modelos"} · {unidades}{" "}
        {unidades === 1 ? "unidad" : "unidades"}
        {talleActivo && <span className="text-muted/70">· talle {talleActivo}</span>}
        {agotados.length > 0 && (
          <span className="text-muted/70">
            · {agotados.length} {agotados.length === 1 ? "agotado" : "agotados"}
          </span>
        )}
      </p>

      {/* ---------- grilla ---------- */}
      {visibles.length === 0 ? (
        <p className="py-16 text-center text-sm leading-relaxed text-muted">
          {talleActivo ? (
            <>
              No nos queda nada en talle {talleActivo} con ese filtro.
              <br />
              Probá otro talle, o escribinos y lo conseguimos por encargue.
            </>
          ) : (
            <>
              No encontramos nada con esa búsqueda.
              <br />
              Probá con el nombre del club, o escribinos y lo conseguimos.
            </>
          )}
        </p>
      ) : (
        <>
          {enStock.length > 0 && (
            <motion.div layout className={`${GRILLA} ${agotados.length > 0 ? "pb-4" : "pb-16"}`}>
              <AnimatePresence mode="popLayout">
                {enStock.map((p, i) => (
                  <ProductCard key={p.id} producto={p} prioridad={i < 4} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {agotados.length > 0 && (
            <section className="mt-8 border-t border-line pt-7" aria-label="Modelos agotados">
              <h3 className="font-display text-xl font-extrabold uppercase leading-none text-ink sm:text-2xl">
                Se agotaron
              </h3>
              <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-muted">
                Estos ya volaron. Si te interesa alguno escribinos: lo conseguimos por encargue.
              </p>

              <motion.div layout className={`${GRILLA} mt-5 pb-16`}>
                <AnimatePresence mode="popLayout">
                  {agotados.map((p) => (
                    <ProductCard key={p.id} producto={p} />
                  ))}
                </AnimatePresence>
              </motion.div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
