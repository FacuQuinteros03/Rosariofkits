import Link from "next/link";
import { CheckCircle2, MessageCircle, Plus } from "lucide-react";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { nombreMes, plata, plataCorta, porciento } from "@/app/admin/_lib/formato";
import { Tarjeta } from "@/app/admin/_componentes/Controles";
import { Avance, BarrasMes, Chispa, COLORES, Dona, Ranking } from "@/app/admin/_componentes/Graficos";
import { BotonEntregar, Cobrar } from "@/app/admin/_componentes/Acciones";

/**
 * Inicio del panel: el tablero del negocio. Todo sale de vistas de la base con la
 * sesión de quien entró (el layout ya comprobó que es admin).
 */
export const dynamic = "force-dynamic";

/** Días entre una fecha AAAA-MM-DD y hoy. */
const diasDesde = (f: string) => Math.floor((Date.now() - new Date(f + "T12:00:00").getTime()) / 86_400_000);

/** Reservas sin plata más viejas que esto se marcan como alerta. */
const DIAS_RESERVA_SIN_SENA = 7;

type Fila = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Suma una métrica mensual por una clave (equipo, línea, talle...). */
function sumarPor(filas: Fila[], clave: string, campo: string) {
  const m = new Map<string, number>();
  for (const f of filas) m.set(f[clave] ?? "Sin dato", (m.get(f[clave] ?? "Sin dato") ?? 0) + Number(f[campo] ?? 0));
  return [...m.entries()].map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor);
}

const ORDEN_TALLES = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];

export default async function Inicio({ searchParams }: { searchParams: Promise<{ cargada?: string }> }) {
  const { cargada } = await searchParams;
  const supabase = await supabaseServidor();
  const q = (vista: string, campos = "*") => supabase.from(vista).select(campos);

  const [tablero, inversion, caja, meses, lineas, equipos, talles, pedidos, porEntregar, conSaldo, ultimas, clientes] =
    await Promise.all([
      q("v_tablero").single(),
      q("v_inversion").single(),
      q("v_caja", "metodo, saldo"),
      q("v_resumen_mensual").order("mes"),
      q("v_ventas_por_linea", "linea, unidades, facturado"),
      q("v_ventas_por_equipo", "equipo, unidades, ganancia"),
      q("v_ventas_por_talle", "talle, unidades"),
      q("v_margen_pedido").order("fecha"),
      q("v_por_entregar", "id, venta_id, cliente, producto, cantidad, estado, pedido_id, llego, saldo_venta").order("pedido_id"),
      q("v_ventas", "id, fecha, cliente, cliente_id, total, cobrado, saldo, estado").gt("saldo", 0).order("fecha"),
      q("v_ventas", "id, fecha, cliente, total, unidades, saldo, estado").order("id", { ascending: false }).limit(6),
      q("v_clientes_metricas", "id, telefono, recurrente"),
    ]);

  const t: Fila = tablero.data ?? {};
  const inv: Fila = inversion.data ?? {};
  const porMetodo = Object.fromEntries(((caja.data ?? []) as Fila[]).map((c) => [c.metodo ?? "Total", Number(c.saldo)]));
  const mes = (meses.data ?? []) as Fila[];
  const telefonos = new Map(((clientes.data ?? []) as Fila[]).map((c) => [c.id, c.telefono]));
  const recurrentes = ((clientes.data ?? []) as Fila[]).filter((c) => c.recurrente).length;
  const totalClientes = (clientes.data ?? []).length;
  const margen = Number(t.facturado) > 0 ? Number(t.ganancia) / Number(t.facturado) : 0;
  const ventasTotales = mes.reduce((s, m) => s + Number(m.ventas), 0);

  // Alertas
  const alertas: string[] = [];
  if (Number(t.skus_en_negativo) > 0) alertas.push(`${t.skus_en_negativo} productos con stock negativo: hay que revisarlos`);
  for (const v of (conSaldo.data ?? []) as Fila[]) {
    if (v.estado === "Reservada" && Number(v.cobrado) === 0 && diasDesde(v.fecha) >= DIAS_RESERVA_SIN_SENA)
      alertas.push(`${v.cliente} tiene ${plata(v.total)} reservados sin seña hace ${diasDesde(v.fecha)} días`);
  }

  // Para entregar: primero lo que está en casa, después por el pedido que lo trae.
  const grupos = new Map<string, Fila[]>();
  for (const f of ((porEntregar.data ?? []) as Fila[]).sort((a, b) => Number(b.llego) - Number(a.llego))) {
    const clave = f.llego ? "En casa · listo para entregar" : `Cuando llegue ${f.pedido_id}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }

  const tallesOrden = sumarPor((talles.data ?? []) as Fila[], "talle", "unidades").sort(
    (a, b) => ORDEN_TALLES.indexOf(a.nombre) - ORDEN_TALLES.indexOf(b.nombre),
  );

  return (
    <main className="flex flex-col gap-4">
      {cargada && (
        <p className="flex items-center gap-2 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          <CheckCircle2 className="h-4 w-4" /> Venta {cargada} cargada. El stock de la web ya se actualizó.
        </p>
      )}
      {alertas.map((a) => (
        <p key={a} className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">{a}</p>
      ))}

      {/* Números de arriba */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Vendido" valor={plataCorta(t.facturado)} pie={`${ventasTotales} ventas`}
          chispa={<Chispa valores={mes.map((m) => Number(m.facturado))} />} />
        <Kpi titulo="Ganancia" valor={plataCorta(t.ganancia)} pie={`margen ${porciento(margen)}`} acento="text-wa"
          chispa={<Chispa valores={mes.map((m) => Number(m.ganancia))} color={COLORES.verde} />} />
        <Kpi titulo="Caja" valor={plataCorta(t.saldo_caja)}
          pie={`Banco ${plataCorta(porMetodo["Transferencia"])} · Efvo ${plataCorta(porMetodo["Efectivo"])}`}
          chispa={<Chispa valores={mes.map((m) => Number(m.caja_al_cierre))} color={COLORES.azul} />} />
        <Kpi titulo="Te deben" valor={plataCorta(t.a_cobrar)} pie={`${(conSaldo.data ?? []).length} ventas sin cerrar`} acento="text-gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Ventas, ganancia y caja por mes" className="lg:col-span-2">
          <BarrasMes
            etiquetas={mes.map((m) => nombreMes(m.mes))}
            series={[
              { nombre: "Vendido", color: COLORES.oro, valores: mes.map((m) => Number(m.facturado)) },
              { nombre: "Ganancia", color: COLORES.verde, valores: mes.map((m) => Number(m.ganancia)) },
            ]}
            linea={{ nombre: "Caja al cierre", color: COLORES.azul, valores: mes.map((m) => Number(m.caja_al_cierre)) }}
          />
        </Tarjeta>
        <Tarjeta titulo="Stock">
          <Dona
            centro={String(t.disponible ?? 0)}
            sub="para vender"
            partes={[
              { nombre: "En casa", valor: Number(t.fisico ?? 0), color: COLORES.verde },
              { nombre: "En camino", valor: Number(t.unidades_en_camino ?? 0), color: COLORES.azul },
            ]}
            formato={(n) => `${n} u.`}
          />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center text-xs text-muted">
            <span><b className="block text-base text-ink">{t.reservadas_sin_senar ?? 0}</b>reservadas</span>
            <span><b className="block text-base text-ink">{t.senadas ?? 0}</b>señadas</span>
            <span><b className="block text-base text-ink">{plataCorta(t.valor_lista_fisico)}</b>en casa a precio</span>
          </div>
        </Tarjeta>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Inversión">
          <div className="flex flex-col gap-3 text-sm">
            <Linea a="Pusieron ustedes" b={plata(inv.inversion)} />
            <Linea a="Gasto total" b={plata(inv.gastado)}
              sub={`mercadería ${plataCorta(inv.gastado_mercaderia)} · otros ${plataCorta(inv.gastado_otros)}`} />
            <Linea a="Falta pagar a proveedores" b={plata(inv.deuda_proveedores)} color="text-red-300" />
            <div className="border-t border-line pt-3">
              <Linea a="Costo total de todo lo pedido" b={plata(inv.costo_total)} fuerte />
              <div className="mt-3">
                <Avance valor={Number(t.cobrado)} total={Number(inv.costo_total)} />
                <p className="mt-1.5 text-xs text-muted">
                  Ya volvieron {plata(t.cobrado)} en ventas cobradas: el {porciento(Number(t.cobrado) / Number(inv.costo_total || 1))} del costo
                </p>
              </div>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Pedidos: cuánto recuperó cada uno" className="lg:col-span-2">
          <ul className="flex flex-col gap-3.5">
            {((pedidos.data ?? []) as Fila[]).map((p) => (
              <li key={p.pedido_id}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="min-w-0 truncate">
                    <b>{p.pedido_id}</b> <span className="text-muted">{p.proveedor}</span>
                    {p.estado !== "Recibido" && (
                      <span className="ml-2 rounded bg-sky-400/15 px-1.5 py-0.5 text-[10px] text-sky-300">{p.estado}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {p.unidades_vendidas}/{p.unidades} vendidas · <b className="text-ink">{plataCorta(p.facturado)}</b> de {plataCorta(p.costo_total)}
                  </span>
                </div>
                <Avance valor={Number(p.facturado)} total={Number(p.costo_total)}
                  color={Number(p.recuperado) >= 1 ? COLORES.verde : COLORES.oro} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">En verde, los pedidos que ya se pagaron solos con lo vendido: lo que queda es ganancia.</p>
        </Tarjeta>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Tarjeta titulo="Equipos que más ganancia dejan">
          <Ranking filas={sumarPor((equipos.data ?? []) as Fila[], "equipo", "ganancia").slice(0, 7)} formato={plataCorta} />
        </Tarjeta>
        <Tarjeta titulo="Ventas por línea">
          <Dona centro={plataCorta(t.facturado)} sub="vendido"
            partes={sumarPor((lineas.data ?? []) as Fila[], "linea", "facturado").slice(0, 6)} formato={plataCorta} />
        </Tarjeta>
        <Tarjeta titulo="Talles que salen">
          <Ranking filas={tallesOrden} color={COLORES.azul} formato={(n) => `${n} u.`} />
          <p className="mt-3 text-xs text-muted">{recurrentes} de {totalClientes} clientes ya compraron más de una vez.</p>
        </Tarjeta>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Para entregar">
          {grupos.size === 0 && <p className="text-sm text-muted">Nada pendiente.</p>}
          {[...grupos.entries()].map(([grupo, filas]) => (
            <div key={grupo} className="mb-4 last:mb-0">
              <p className={`mb-1.5 text-xs font-semibold ${grupo.startsWith("En casa") ? "text-wa" : "text-gold"}`}>
                {grupo} · {filas.reduce((s, f) => s + f.cantidad, 0)} u.
              </p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {filas.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{f.producto}{f.cantidad > 1 ? ` ×${f.cantidad}` : ""}</span>
                      <span className="text-xs text-muted">
                        {f.cliente} · {String(f.estado).toLowerCase()} · {f.venta_id}
                        {Number(f.saldo_venta) > 0 && <span className="text-gold"> · debe {plata(f.saldo_venta)}</span>}
                      </span>
                    </span>
                    {f.llego && <BotonEntregar venta={f.venta_id} item={f.id} debe={Number(f.saldo_venta)} />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Tarjeta>

        <Tarjeta titulo="Te deben">
          {(conSaldo.data ?? []).length === 0 && <p className="text-sm text-muted">Nadie.</p>}
          <ul className="divide-y divide-line rounded-xl border border-line">
            {((conSaldo.data ?? []) as Fila[]).map((v) => {
              const tel = telefonos.get(v.cliente_id);
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{v.cliente}</span>
                    <span className="text-xs text-muted">
                      {v.id} · {String(v.estado).toLowerCase()} · pagó {plata(v.cobrado)} de {plata(v.total)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <b className="text-gold">{plata(v.saldo)}</b>
                    {tel && (
                      <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener" aria-label="WhatsApp"
                        className="rounded-lg border border-line p-1.5 text-wa hover:bg-wa/10">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Cobrar venta={v.id} saldo={Number(v.saldo)} puedeEntregar={v.estado !== "Entregada"} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Últimas ventas"
        accion={
          <Link href="/admin/venta" className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
            <Plus className="h-3.5 w-3.5" /> Cargar venta
          </Link>
        }>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-1 pb-2 font-normal">Venta</th>
                <th className="px-1 pb-2 font-normal">Cliente</th>
                <th className="px-1 pb-2 font-normal">Estado</th>
                <th className="px-1 pb-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {((ultimas.data ?? []) as Fila[]).map((v) => (
                <tr key={v.id}>
                  <td className="px-1 py-2"><b>{v.id}</b> <span className="text-xs text-muted">{v.fecha.slice(8, 10)}/{v.fecha.slice(5, 7)}</span></td>
                  <td className="px-1 py-2">{v.cliente} <span className="text-xs text-muted">· {v.unidades} u.</span></td>
                  <td className="px-1 py-2"><Estado e={v.estado} /></td>
                  <td className="px-1 py-2 text-right font-semibold">{plata(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </main>
  );
}

function Kpi({ titulo, valor, pie, chispa, acento = "" }: {
  titulo: string; valor: string; pie?: string; chispa?: React.ReactNode; acento?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">{titulo}</p>
        <span className="hidden sm:block">{chispa}</span>
      </div>
      <div>
        <p className={`font-display text-3xl font-extrabold leading-none tracking-tight sm:text-4xl ${acento}`}>{valor}</p>
        {pie && <p className="mt-1 truncate text-[11px] text-muted">{pie}</p>}
      </div>
    </div>
  );
}

function Linea({ a, b, sub, color = "", fuerte }: { a: string; b: string; sub?: string; color?: string; fuerte?: boolean }) {
  return (
    <div>
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-muted">{a}</span>
        <span className={`${fuerte ? "font-display text-xl font-extrabold" : "font-semibold"} ${color}`}>{b}</span>
      </p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

const COLOR_ESTADO: Record<string, string> = {
  Entregada: "bg-wa/15 text-wa",
  Pagada: "bg-sky-400/15 text-sky-300",
  Señada: "bg-gold/15 text-gold",
  Reservada: "bg-white/10 text-muted",
  Cancelada: "bg-red-500/15 text-red-300",
};

function Estado({ e }: { e: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs ${COLOR_ESTADO[e] ?? "bg-white/10"}`}>{e}</span>;
}
