import { ChevronDown, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { plata } from "@/app/admin/_lib/formato";
import { Paginacion, paginar } from "@/app/admin/_componentes/Paginacion";

/**
 * Clientes con todo lo que compraron (camiseta y talle), para saber qué ofrecerle a
 * cada uno: su talle, los equipos que le gustan y cuándo compró por última vez.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

type Fila = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const POR_PAGINA = 20;
const FILTROS = ["Todos", "Volvieron a comprar", "Mayoristas", "Deben"];
const normal = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const fecha = (f: string | null) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(2, 4)}` : "—");

/** Los valores más repetidos, con cuántas veces aparecen. */
function masRepetidos(items: Fila[], clave: string, n = 3) {
  const m = new Map<string, number>();
  for (const i of items) if (i[clave]) m.set(i[clave], (m.get(i[clave]) ?? 0) + Number(i.cantidad));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string; p?: string }>;
}) {
  const { q = "", filtro = "Todos", p } = await searchParams;
  const supabase = await supabaseServidor();
  const [clientes, compras] = await Promise.all([
    supabase.from("v_clientes_metricas").select("*").order("ultima_compra", { ascending: false, nullsFirst: false }),
    supabase
      .from("v_hechos_venta")
      .select("cliente_id, venta_id, fecha, modelo, talle, equipo, linea, cantidad, facturado, estado")
      .neq("estado", "Cancelada")
      .order("fecha", { ascending: false }),
  ]);

  const porCliente = new Map<string, Fila[]>();
  for (const c of (compras.data ?? []) as Fila[]) porCliente.set(c.cliente_id, [...(porCliente.get(c.cliente_id) ?? []), c]);

  const palabras = normal(q.trim()).split(/\s+/).filter(Boolean);
  const lista = ((clientes.data ?? []) as Fila[]).filter((c) => {
    if (filtro === "Volvieron a comprar" && !c.recurrente) return false;
    if (filtro === "Mayoristas" && c.tipo !== "Mayorista") return false;
    if (filtro === "Deben" && Number(c.saldo) <= 0) return false;
    if (!palabras.length) return true;
    const texto = normal(
      `${c.nombre} ${c.telefono ?? ""} ${(porCliente.get(c.id) ?? []).map((i) => `${i.modelo} ${i.equipo ?? ""} talle ${i.talle}`).join(" ")}`,
    );
    return palabras.every((w) => texto.includes(w));
  });
  const { pagina, paginas, items } = paginar(lista, p, POR_PAGINA);

  const href = (cambio: Record<string, string | number>) => {
    const u = new URLSearchParams();
    const todo = { q, filtro, ...cambio };
    if (todo.q) u.set("q", String(todo.q));
    if (todo.filtro !== "Todos") u.set("filtro", String(todo.filtro));
    if ("p" in cambio && Number(cambio.p) > 1) u.set("p", String(cambio.p));
    const s = u.toString();
    return `/admin/clientes${s ? `?${s}` : ""}`;
  };

  return (
    <main className="flex flex-col gap-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{lista.length} clientes</p>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Clientes</h1>
        <p className="mt-2 text-sm text-muted">
          Qué compró cada uno y en qué talle. Buscá &quot;XL&quot; o &quot;boca&quot; para ver a quién ofrecerle algo.
        </p>
      </header>

      <form action="/admin/clientes" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 focus-within:border-gold">
        <Search className="h-4 w-4 text-muted" />
        <input name="q" defaultValue={q} placeholder="Nombre, teléfono, equipo o talle"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70" />
        {filtro !== "Todos" && <input type="hidden" name="filtro" value={filtro} />}
      </form>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTROS.map((f) => (
          <Link key={f} href={href({ filtro: f })}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm
              ${filtro === f ? "border-gold bg-gold/15 font-semibold text-gold" : "border-line text-muted hover:text-ink"}`}>
            {f}
          </Link>
        ))}
      </nav>

      {lista.length === 0 && <p className="py-10 text-center text-sm text-muted">No hay clientes con eso.</p>}

      <ul className="flex flex-col gap-2">
        {items.map((c) => {
          const suyas = porCliente.get(c.id) ?? [];
          const talles = masRepetidos(suyas, "talle");
          const equipos = masRepetidos(suyas, "equipo");
          return (
            <li key={c.id}>
              <details className="group rounded-2xl border border-line bg-surface open:border-muted/50">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 sm:p-4 [&::-webkit-details-marker]:hidden">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-2 font-display text-lg font-extrabold">
                    {c.nombre.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate font-semibold">{c.nombre}</span>
                      {c.tipo === "Mayorista" && <span className="shrink-0 rounded-full bg-violet-400/15 px-2 py-0.5 text-[11px] text-violet-300">Mayorista</span>}
                      {c.recurrente && <span className="shrink-0 rounded-full bg-wa/15 px-2 py-0.5 text-[11px] text-wa">Volvió</span>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {talles.length > 0 && <>Talle {talles.map(([t]) => t).join("/")} · </>}
                      {equipos.map(([e]) => e).join(", ") || "sin compras"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{plata(c.total)}</p>
                    <p className={`text-xs ${Number(c.saldo) > 0 ? "text-gold" : "text-muted"}`}>
                      {Number(c.saldo) > 0 ? `debe ${plata(c.saldo)}` : `${c.unidades ?? 0} u. · ${fecha(c.ultima_compra)}`}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>

                <div className="border-t border-line px-3.5 pb-4 pt-3 sm:px-4">
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <Dato a="Compras" b={String(c.compras ?? 0)} />
                    <Dato a="Ticket promedio" b={plata(c.ticket_promedio)} />
                    <Dato a="Primera" b={fecha(c.primera_compra)} />
                    <Dato a="Última" b={fecha(c.ultima_compra)} />
                  </div>

                  {talles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                      {talles.map(([t, n]) => (
                        <span key={t} className="rounded-full border border-sky-400/40 px-2.5 py-1 text-sky-300">Talle {t} ×{n}</span>
                      ))}
                      {equipos.map(([e, n]) => (
                        <span key={e} className="rounded-full border border-gold/40 px-2.5 py-1 text-gold">{e} ×{n}</span>
                      ))}
                    </div>
                  )}

                  <p className="mb-1.5 mt-4 text-xs text-muted">Todo lo que compró</p>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {suyas.map((i, n) => (
                      <li key={n} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate">{i.modelo} · <b>{i.talle}</b>{i.cantidad > 1 ? ` ×${i.cantidad}` : ""}</span>
                          <span className="text-xs text-muted">{fecha(i.fecha)} · {i.venta_id} · {String(i.estado).toLowerCase()}</span>
                        </span>
                        <span className="shrink-0">{plata(i.facturado)}</span>
                      </li>
                    ))}
                  </ul>

                  {c.telefono && (
                    <a href={`https://wa.me/${c.telefono}`} target="_blank" rel="noopener"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-wa/50 px-3 py-2 text-sm font-semibold text-wa hover:bg-wa/10">
                      <MessageCircle className="h-4 w-4" /> Escribirle
                    </a>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <Paginacion pagina={pagina} paginas={paginas} href={(n) => href({ p: n })} />
    </main>
  );
}

function Dato({ a, b }: { a: string; b: string }) {
  return (
    <div className="rounded-lg bg-ground/60 px-3 py-2">
      <p className="text-[11px] text-muted">{a}</p>
      <p className="font-semibold">{b}</p>
    </div>
  );
}
