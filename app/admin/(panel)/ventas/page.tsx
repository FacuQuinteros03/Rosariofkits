import Link from "next/link";
import { ChevronDown, Plus, Search } from "lucide-react";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { nombreMes, plata, plataCorta, porciento } from "@/app/admin/_lib/formato";
import { Cobrar } from "@/app/admin/_componentes/Acciones";
import { Paginacion, paginar } from "@/app/admin/_componentes/Paginacion";

/**
 * Todas las ventas, por mes, con su detalle: qué se llevó, cuánto pagó y cómo,
 * cuánto dejó de ganancia. Se filtra por estado y se busca por cliente o producto.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Ventas" };

type Fila = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const POR_PAGINA = 25;
const FILTROS = ["Todas", "Sin cerrar", "Reservada", "Señada", "Pagada", "Entregada", "Cancelada"];

const COLOR_ESTADO: Record<string, string> = {
  Entregada: "bg-wa/15 text-wa",
  Pagada: "bg-sky-400/15 text-sky-300",
  Señada: "bg-gold/15 text-gold",
  Reservada: "bg-white/10 text-muted",
  Cancelada: "bg-red-500/15 text-red-300",
};

const normal = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default async function Ventas({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; p?: string }> }) {
  const { q = "", estado = "Todas", p } = await searchParams;
  const supabase = await supabaseServidor();

  const [ventas, items, pagos] = await Promise.all([
    supabase.from("v_ventas").select("id, fecha, cliente, cliente_id, canal, notas, total, unidades, cobrado, saldo, estado").order("fecha", { ascending: false }).order("id", { ascending: false }),
    supabase.from("v_hechos_venta").select("venta_id, sku, modelo, talle, cantidad, facturado, ganancia, estado, pedido_id, promo, precio_unit, precio_lista"),
    supabase.from("pagos").select("venta_id, fecha, monto, metodo, tipo").order("fecha"),
  ]);

  const itemsPorVenta = new Map<string, Fila[]>();
  for (const i of (items.data ?? []) as Fila[]) itemsPorVenta.set(i.venta_id, [...(itemsPorVenta.get(i.venta_id) ?? []), i]);
  const pagosPorVenta = new Map<string, Fila[]>();
  for (const p of (pagos.data ?? []) as Fila[]) pagosPorVenta.set(p.venta_id, [...(pagosPorVenta.get(p.venta_id) ?? []), p]);

  const palabras = normal(q.trim()).split(/\s+/).filter(Boolean);
  const lista = ((ventas.data ?? []) as Fila[]).filter((v) => {
    if (estado === "Sin cerrar" ? Number(v.saldo) <= 0 && v.estado === "Entregada" : estado !== "Todas" && v.estado !== estado)
      return false;
    if (!palabras.length) return true;
    const texto = normal(`${v.id} ${v.cliente} ${(itemsPorVenta.get(v.id) ?? []).map((i) => `${i.modelo} ${i.talle} ${i.sku}`).join(" ")}`);
    return palabras.every((w) => texto.includes(w));
  });

  // Los totales de cada mes salen de todas las ventas filtradas; la página muestra 25.
  const delMes = new Map<string, Fila[]>();
  for (const v of lista) delMes.set(v.fecha.slice(0, 7), [...(delMes.get(v.fecha.slice(0, 7)) ?? []), v]);
  const { pagina, paginas, items: enPagina } = paginar(lista, p, POR_PAGINA);
  const meses = new Map<string, Fila[]>();
  for (const v of enPagina) meses.set(v.fecha.slice(0, 7), [...(meses.get(v.fecha.slice(0, 7)) ?? []), v]);
  const ganancia = (id: string) => (itemsPorVenta.get(id) ?? []).reduce((s, i) => s + Number(i.ganancia ?? 0), 0);

  const href = (cambio: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(estado !== "Todas" ? { estado } : {}), ...cambio });
    if (p.get("estado") === "Todas") p.delete("estado");
    if (!("p" in cambio) || cambio.p === "1") p.delete("p");
    const s = p.toString();
    return `/admin/ventas${s ? `?${s}` : ""}`;
  };

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{lista.length} ventas</p>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Ventas</h1>
        </div>
        <Link href="/admin/venta" className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-ground">
          <Plus className="h-4 w-4" /> Cargar venta
        </Link>
      </header>

      <form action="/admin/ventas" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 focus-within:border-gold">
        <Search className="h-4 w-4 text-muted" />
        <input name="q" defaultValue={q} placeholder="Cliente, equipo, talle o número de venta"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70" />
        {estado !== "Todas" && <input type="hidden" name="estado" value={estado} />}
      </form>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTROS.map((f) => (
          <Link key={f} href={href({ estado: f })}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm
              ${estado === f ? "border-gold bg-gold/15 font-semibold text-gold" : "border-line text-muted hover:text-ink"}`}>
            {f}
          </Link>
        ))}
      </nav>

      {lista.length === 0 && <p className="py-10 text-center text-sm text-muted">No hay ventas con ese filtro.</p>}

      {[...meses.entries()].map(([mes, vs]) => {
        const todoElMes = delMes.get(mes) ?? vs;
        const facturado = todoElMes.filter((v) => v.estado !== "Cancelada").reduce((s, v) => s + Number(v.total), 0);
        const gan = todoElMes.reduce((s, v) => s + ganancia(v.id), 0);
        return (
          <section key={mes}>
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
                {nombreMes(mes + "-01")} <span className="text-muted">{mes.slice(0, 4)}</span>
              </h2>
              <p className="text-xs text-muted">
                {todoElMes.length} ventas · <b className="text-ink">{plataCorta(facturado)}</b> · ganancia <b className="text-wa">{plataCorta(gan)}</b>
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {vs.map((v) => {
                const its = itemsPorVenta.get(v.id) ?? [];
                const gv = ganancia(v.id);
                return (
                  <li key={v.id}>
                    <details className="group rounded-2xl border border-line bg-surface open:border-muted/50">
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 sm:p-4 [&::-webkit-details-marker]:hidden">
                        <div className="w-12 shrink-0 text-center leading-none">
                          <p className="font-display text-2xl font-extrabold">{v.fecha.slice(8, 10)}</p>
                          <p className="text-[10px] uppercase text-muted">{nombreMes(v.fecha)}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2">
                            <span className="truncate font-semibold">{v.cliente}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${COLOR_ESTADO[v.estado] ?? "bg-white/10"}`}>{v.estado}</span>
                          </p>
                          <p className="truncate text-xs text-muted">
                            {v.id} · {its.map((i) => `${i.modelo.replace(/^Camiseta /, "")} ${i.talle}`).join(" + ")}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold">{plata(v.total)}</p>
                          <p className={`text-xs ${Number(v.saldo) > 0 ? "text-gold" : "text-muted"}`}>
                            {Number(v.saldo) > 0 ? `debe ${plata(v.saldo)}` : `${v.unidades} u.`}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                      </summary>

                      <div className="border-t border-line px-3.5 pb-4 pt-3 sm:px-4">
                        <ul className="flex flex-col gap-2">
                          {its.map((i, n) => (
                            <li key={n} className="flex items-start justify-between gap-3 text-sm">
                              <span className="min-w-0">
                                <span className="block">{i.modelo} · {i.talle}{i.cantidad > 1 ? ` ×${i.cantidad}` : ""}</span>
                                <span className="text-xs text-muted">
                                  SKU {i.sku} · {i.pedido_id ?? "sin pedido"} · {String(i.estado).toLowerCase()}
                                  {Number(i.precio_unit) < Number(i.precio_lista) && (
                                    <span className="text-gold"> · lista {plata(i.precio_lista)}{i.promo ? ` (${i.promo})` : ""}</span>
                                  )}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block">{plata(i.facturado)}</span>
                                <span className="text-xs text-wa">+{plata(i.ganancia)}</span>
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 grid gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs text-muted">Pagos</p>
                            {(pagosPorVenta.get(v.id) ?? []).length === 0 && <p className="text-muted">Todavía no pagó nada.</p>}
                            {(pagosPorVenta.get(v.id) ?? []).map((p, n) => (
                              <p key={n} className="flex justify-between gap-3">
                                <span>{p.fecha.slice(8, 10)}/{p.fecha.slice(5, 7)} · {p.tipo} · {p.metodo}</span>
                                <span className={Number(p.monto) < 0 ? "text-red-300" : ""}>{plata(p.monto)}</span>
                              </p>
                            ))}
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="flex justify-between"><span className="text-muted">Ganancia</span>
                              <b className="text-wa">{plata(gv)} <span className="text-xs font-normal text-muted">({porciento(gv / Number(v.total || 1))})</span></b></p>
                            {v.canal && <p className="flex justify-between"><span className="text-muted">Vino por</span><span>{v.canal}</span></p>}
                            {v.notas && <p className="text-xs text-muted">{v.notas}</p>}
                          </div>
                        </div>

                        {Number(v.saldo) > 0 && v.estado !== "Cancelada" && (
                          <div className="mt-3 flex justify-end">
                            <Cobrar venta={v.id} saldo={Number(v.saldo)} puedeEntregar={v.estado !== "Entregada"} />
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <Paginacion pagina={pagina} paginas={paginas} href={(n) => href({ p: String(n) })} />
    </main>
  );
}
