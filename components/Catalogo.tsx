"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { CATEGORIAS, type Categoria, type Producto } from "@/lib/types";
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

export function Catalogo({ productos }: { productos: Producto[] }) {
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Todas");

  // el indice de busqueda se calcula una sola vez
  const indexados = useMemo(
    () => productos.map((p) => ({ p, buscar: normalizar(`${p.nombre} ${p.categoria}`) })),
    [productos]
  );

  const categoriasConStock = useMemo(() => {
    const usadas = new Set(productos.map((p) => p.categoria));
    return CATEGORIAS.filter((c) => c === "Todas" || usadas.has(c as never));
  }, [productos]);

  const visibles = useMemo(() => {
    const q = normalizar(texto.trim());
    return indexados
      .filter(({ p, buscar }) => {
        if (categoria !== "Todas" && p.categoria !== categoria) return false;
        if (q && !buscar.includes(q)) return false;
        return true;
      })
      .map(({ p }) => p);
  }, [indexados, texto, categoria]);

  const unidades = visibles.reduce((s, p) => s + p.total, 0);

  // dos productos reales para ilustrar la promo
  const ejemploCamiseta = productos.find((p) => p.categoria !== "Shorts" && p.foto);
  const ejemploShort = productos.find((p) => p.categoria === "Shorts" && p.foto);

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
      </div>

      <p className="flex items-center gap-2.5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        <span
          className="h-3 w-2.5 shrink-0 bg-navy-2"
          style={{ clipPath: "polygon(38% 0,100% 0,62% 100%,0 100%)" }}
          aria-hidden
        />
        {visibles.length} {visibles.length === 1 ? "modelo" : "modelos"} · {unidades}{" "}
        {unidades === 1 ? "unidad" : "unidades"}
      </p>

      {/* ---------- grilla ---------- */}
      {visibles.length === 0 ? (
        <p className="py-16 text-center text-sm leading-relaxed text-muted">
          No encontramos nada con esa búsqueda.
          <br />
          Probá con el nombre del club, o escribinos y lo conseguimos.
        </p>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 gap-3.5 pb-16 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5"
        >
          <AnimatePresence mode="popLayout">
            {visibles.map((p, i) => (
              <ProductCard key={p.id} producto={p} prioridad={i < 4} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
