import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/servidor";

/**
 * Inicio del panel: lo que se mira al abrirlo. Solo lectura (etapa 5); cargar venta,
 * cobrar, recibir pedido y ajustar vienen en las etapas 6 y 7.
 *
 * Todo sale de vistas de la base con la sesión del usuario: si su mail no está en
 * `admins`, la base devuelve vacío y acá se muestra que no tiene acceso.
 */
export const dynamic = "force-dynamic";

const plata = (n: number | string | null | undefined) =>
  "$" + Math.round(Number(n ?? 0)).toLocaleString("es-AR");

/** Días entre una fecha AAAA-MM-DD y hoy. */
const diasDesde = (f: string) => Math.floor((Date.now() - new Date(f + "T12:00:00").getTime()) / 86_400_000);

/** Link de WhatsApp a un número guardado solo con dígitos. */
const whatsapp = (tel: string | null) => (tel ? `https://wa.me/${tel}` : null);

/** Reservas sin plata más viejas que esto se marcan como alerta. */
const DIAS_RESERVA_SIN_SENA = 7;

export default async function Inicio() {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/entrar");

  const { data: esAdmin } = await supabase.rpc("es_admin");
  if (!esAdmin) {
    return (
      <main className="flex min-h-[70dvh] flex-col justify-center gap-4">
        <h1 className="font-display text-4xl font-extrabold uppercase">Sin acceso</h1>
        <p className="text-sm text-muted">
          Entraste como <span className="text-ink">{user.email}</span>, pero esa cuenta no tiene
          permiso para ver el panel.
        </p>
        <Salir />
      </main>
    );
  }

  const [tablero, caja, saldos, porEntregar, reservas] = await Promise.all([
    supabase.from("v_tablero").select("*").single(),
    supabase.from("v_caja").select("metodo, saldo"),
    supabase.from("v_saldo_cliente").select("id, nombre, telefono, saldo").gt("saldo", 0).order("saldo", { ascending: false }),
    supabase.from("v_por_entregar").select("venta_id, cliente, telefono, producto, cantidad, estado, pedido_id, estado_pedido, llego").order("pedido_id"),
    supabase.from("v_ventas").select("id, fecha, cliente, total, cobrado").eq("estado", "Reservada").eq("cobrado", 0),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: Record<string, any> = tablero.data ?? {};
  const porMetodo = Object.fromEntries((caja.data ?? []).map((c) => [c.metodo ?? "Total", c.saldo]));

  const alertas = (reservas.data ?? [])
    .filter((r) => diasDesde(r.fecha) >= DIAS_RESERVA_SIN_SENA)
    .map((r) => `${r.cliente} tiene ${plata(r.total)} reservados sin seña hace ${diasDesde(r.fecha)} días`);
  if (Number(t.skus_en_negativo) > 0) alertas.unshift(`${t.skus_en_negativo} productos con stock negativo: hay que revisarlos`);

  // "Para entregar": primero lo que ya está en casa, después agrupado por el pedido que lo trae.
  const grupos = new Map<string, NonNullable<typeof porEntregar.data>>();
  for (const f of porEntregar.data ?? []) {
    const clave = f.llego ? "En casa: listo para entregar" : `Cuando llegue ${f.pedido_id}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Rosario F Kits</p>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Inicio</h1>
        </div>
        <Salir />
      </header>

      {alertas.length > 0 && (
        <section className="flex flex-col gap-2">
          {alertas.map((a) => (
            <p key={a} className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
              {a}
            </p>
          ))}
        </section>
      )}

      <Seccion titulo="Plata">
        <div className="grid grid-cols-2 gap-2">
          <Dato titulo="Caja" valor={plata(t.saldo_caja)}
            pie={`Banco ${plata(porMetodo["Transferencia"])} · Efvo ${plata(porMetodo["Efectivo"])}`} />
          <Dato titulo="A cobrar" valor={plata(t.a_cobrar)} pie={`${saldos.data?.length ?? 0} clientes`} />
          <Dato titulo="Debés a proveedores" valor={plata(t.deuda_proveedores)} />
          <Dato titulo="Ganancia total" valor={plata(t.ganancia)} pie={`sobre ${plata(t.facturado)} vendidos`} />
        </div>
      </Seccion>

      <Seccion titulo="Stock">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Dato titulo="En casa" valor={String(t.fisico ?? 0)} />
          <Dato titulo="En camino" valor={String(t.unidades_en_camino ?? 0)} />
          <Dato titulo="Para vender" valor={String(t.disponible ?? 0)} />
        </div>
      </Seccion>

      <Seccion titulo="Para entregar">
        {grupos.size === 0 && <p className="text-sm text-muted">Nada pendiente.</p>}
        {[...grupos.entries()].map(([grupo, filas]) => (
          <div key={grupo} className="mb-3">
            <p className="mb-1 text-xs font-semibold text-muted">
              {grupo} · {filas.reduce((s, f) => s + f.cantidad, 0)} u.
            </p>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {filas.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{f.producto}{f.cantidad > 1 ? ` ×${f.cantidad}` : ""}</span>
                    <span className="text-xs text-muted">{f.cliente} · {f.estado.toLowerCase()} · {f.venta_id}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Seccion>

      <Seccion titulo="Te deben">
        {(saldos.data ?? []).length === 0 && <p className="text-sm text-muted">Nadie.</p>}
        <ul className="divide-y divide-line rounded-lg border border-line">
          {(saldos.data ?? []).map((c) => {
            const wa = whatsapp(c.telefono);
            return (
              <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{c.nombre}</span>
                <span className="flex items-center gap-3">
                  {plata(c.saldo)}
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener" className="text-xs font-semibold text-wa">
                      WhatsApp
                    </a>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Seccion>

      <p className="text-center text-xs text-muted">
        Cargar ventas y cobros llega en la próxima etapa. <Link href="/" className="underline">Ver la web</Link>
      </p>
    </main>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{titulo}</h2>
      {children}
    </section>
  );
}

function Dato({ titulo, valor, pie }: { titulo: string; valor: string; pie?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-xs text-muted">{titulo}</p>
      <p className="mt-0.5 font-display text-2xl font-extrabold tracking-tight">{valor}</p>
      {pie && <p className="mt-0.5 text-[11px] text-muted">{pie}</p>}
    </div>
  );
}

function Salir() {
  return (
    <form action="/admin/salir" method="post">
      <button className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-ink">Salir</button>
    </form>
  );
}
