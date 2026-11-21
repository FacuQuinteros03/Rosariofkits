import Link from "next/link";
import { FileText, MessageCircle } from "lucide-react";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { getCatalogo } from "@/lib/sheets";
import { versionDe } from "@/lib/talles";
import { describirBox, entraEnBox, type PedidoBox, type TipoBox, type VersionBox } from "@/lib/box";
import { plata } from "@/app/admin/_lib/formato";
import { Tarjeta } from "@/app/admin/_componentes/Controles";
import { AsignarBox, RechazarBox, type Candidata } from "./AccionesBox";

/**
 * Las Mystery Box que pidieron por la web. Las pendientes esperan que Facu mire
 * el comprobante y elija la camiseta; recién ahí son una venta.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Mystery Box" };

type Box = {
  id: string;
  creado_en: string;
  nombre: string;
  telefono: string;
  version: VersionBox;
  tipo: TipoBox;
  talle: string;
  preferencia: string | null;
  excluir: string | null;
  precio: number;
  venta_web: string | null;
  comprobante: string | null;
  estado: "Pendiente" | "Asignada" | "Rechazada";
  venta_id: string | null;
  sku: number | null;
  motivo: string | null;
};

const fecha = (f: string) =>
  new Date(f).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function MysteryBoxes() {
  const supabase = await supabaseServidor();
  const [pendientes, resueltas, catalogo] = await Promise.all([
    supabase.from("mystery_boxes").select("*").eq("estado", "Pendiente").order("creado_en").limit(50),
    supabase.from("mystery_boxes").select("*").neq("estado", "Pendiente").order("resuelto_en", { ascending: false }).limit(15),
    getCatalogo(),
  ]);

  /** Las camisetas que sirven para una box: su talle y tipo, con stock; las de su versión primero. */
  function candidatas(b: Box): Candidata[] {
    const lista: (Candidata & { orden: number })[] = [];
    for (const p of catalogo) {
      if (!entraEnBox(p, b.tipo)) continue;
      const version = versionDe(p.nombre);
      const orden = version === b.version ? 0 : version === null ? 1 : 2;
      for (const v of p.variantes) {
        if (v.talle !== b.talle || v.disponible <= 0) continue;
        lista.push({
          sku: Number(v.sku),
          nombre: p.nombre,
          disponible: v.disponible,
          aviso: orden === 2 ? `es ${version === "player" ? "Player" : "Fan"}` : orden === 1 ? "versión sin aclarar" : null,
          orden,
        });
      }
    }
    return lista.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
  }

  const lista = (pendientes.data ?? []) as Box[];
  const hechas = (resueltas.data ?? []) as Box[];

  return (
    <main className="flex flex-col gap-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Web</p>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Mystery Box</h1>
        <p className="mt-2 text-sm text-muted">
          Mirá el comprobante y el banco, elegí la camiseta y queda cargada como venta. Si no llegó la plata, rechazala.
        </p>
      </header>

      {pendientes.error && (
        <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          No se pudieron leer las boxes: {pendientes.error.message}. ¿Corriste la migración 0025 en Supabase?
        </p>
      )}

      {lista.length === 0 && !pendientes.error && (
        <p className="rounded-xl border border-line px-4 py-6 text-center text-sm text-muted">
          No hay boxes esperando. Cuando alguien pague una por la web, aparece acá.
        </p>
      )}

      {lista.map((b) => {
        const pedido: PedidoBox = { version: b.version, tipo: b.tipo, talle: b.talle, preferencia: b.preferencia ?? "", excluir: b.excluir ?? "" };
        return (
          <Tarjeta key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{b.nombre}</span>
                  <span className="text-xs text-muted">{b.id} · {fecha(b.creado_en)}</span>
                </p>
                <p className="mt-1 text-lg font-semibold">{describirBox(pedido)} · {plata(b.precio)}</p>
                {b.preferencia && <p className="text-sm text-muted">Prefiere: <span className="text-ink">{b.preferencia}</span></p>}
                {b.excluir && <p className="text-sm text-muted">No quiere: <span className="font-semibold text-gold">{b.excluir}</span></p>}
                {b.venta_web && (
                  <p className="text-sm text-muted">
                    Vino en el mismo pedido que{" "}
                    <Link href={`/admin/ventas?q=${b.venta_web}`} className="text-ink underline underline-offset-2">{b.venta_web}</Link>
                    : el comprobante es de todo junto.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {b.comprobante && (
                  <a href={`/admin/comprobante/${b.id}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5">
                    <FileText className="h-3.5 w-3.5" /> Ver comprobante
                  </a>
                )}
                <a href={`https://wa.me/${b.telefono}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                <RechazarBox box={b.id} />
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <AsignarBox box={b.id} candidatas={candidatas(b)} conComprobante={Boolean(b.comprobante)} />
            </div>
          </Tarjeta>
        );
      })}

      {hechas.length > 0 && (
        <Tarjeta titulo="Últimas resueltas">
          <ul className="divide-y divide-line text-sm">
            {hechas.map((b) => (
              <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  <span className="font-semibold">{b.nombre}</span>{" "}
                  <span className="text-muted">{b.id} · talle {b.talle}</span>
                </span>
                {b.estado === "Asignada" ? (
                  <Link href={`/admin/ventas?q=${b.venta_id}`} className="text-wa underline-offset-2 hover:underline">
                    {b.venta_id} · SKU {b.sku}
                  </Link>
                ) : (
                  <span className="text-red-300">Rechazada: {b.motivo}</span>
                )}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </main>
  );
}
