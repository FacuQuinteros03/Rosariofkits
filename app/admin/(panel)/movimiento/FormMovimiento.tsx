"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cargarMovimiento } from "@/app/admin/acciones";
import { plata } from "@/app/admin/_lib/formato";
import { Chips, Tarjeta } from "@/app/admin/_componentes/Controles";

export type PedidoLista = { id: string; proveedor: string; estado: string; saldo_a_pagar: number };

/** Qué se puede cargar a mano. Los cobros de ventas no: van con "Cobrar" en el Inicio. */
const TIPOS = [
  { nombre: "Pago a proveedor", tipo: "Egreso", categoria: "Pago proveedor", pedido: true },
  { nombre: "Envío de China", tipo: "Egreso", categoria: "Envio China", pedido: true },
  { nombre: "Envío a cliente", tipo: "Egreso", categoria: "Envio cliente", pedido: false },
  { nombre: "Publicidad", tipo: "Egreso", categoria: "Publicidad", pedido: false },
  { nombre: "Otro gasto", tipo: "Egreso", categoria: "Otro", pedido: false },
  { nombre: "Retiro", tipo: "Egreso", categoria: "Retiro", pedido: false },
  { nombre: "Aporte de plata", tipo: "Ingreso", categoria: "Aporte", pedido: false },
] as const;

export function FormMovimiento({ pedidos, hoy }: { pedidos: PedidoLista[]; hoy: string }) {
  const router = useRouter();
  const [yendo, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cual, setCual] = useState<string>(TIPOS[3].nombre);
  const [monto, setMonto] = useState(0);
  const [metodo, setMetodo] = useState("Transferencia");
  const [pedido, setPedido] = useState<string>(pedidos.find((p) => Number(p.saldo_a_pagar) > 0)?.id ?? "");
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState(hoy);

  const t = TIPOS.find((x) => x.nombre === cual)!;
  const bloqueo = monto <= 0 ? "Poné el monto" : t.pedido && !pedido ? "Elegí el pedido" : null;

  function guardar() {
    setError(null);
    iniciar(async () => {
      const r = await cargarMovimiento({
        tipo: t.tipo, categoria: t.categoria, monto, metodo,
        pedido: t.pedido ? pedido : null, nota: nota.trim() || null, fecha,
      });
      if (!r.ok) setError(r.error);
      else router.push("/admin");
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Caja</p>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Gasto o aporte</h1>
        <p className="mt-2 text-sm text-muted">Los cobros de ventas no van acá: se cargan con la venta o con &quot;Cobrar&quot; en el Inicio.</p>
      </header>

      <Tarjeta titulo="¿Qué es?">
        <Chips opciones={TIPOS.map((x) => x.nombre)} valor={cual} onChange={setCual} />
        {t.pedido && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {pedidos.map((p) => (
              <button key={p.id} onClick={() => setPedido(p.id)}
                className={`rounded-lg border px-3 py-2.5 text-left ${pedido === p.id ? "border-gold bg-gold/10" : "border-line"}`}>
                <span className="block text-sm font-semibold">{p.id} · {p.proveedor}</span>
                <span className="text-xs text-muted">
                  {Number(p.saldo_a_pagar) > 0 ? `falta pagar ${plata(p.saldo_a_pagar)}` : "pagado"} · {p.estado}
                </span>
              </button>
            ))}
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Monto">
        <label className="flex items-center gap-1 rounded-lg border border-line px-3 py-3 focus-within:border-gold">
          <span className="text-muted">$</span>
          <input inputMode="numeric" autoFocus value={monto ? monto.toLocaleString("es-AR") : ""}
            onChange={(e) => setMonto(Number(e.target.value.replace(/\D/g, "")) || 0)}
            className="w-full bg-transparent font-display text-2xl font-extrabold outline-none" />
        </label>
        <div className="mt-3"><Chips opciones={["Transferencia", "Efectivo", "Mercado Pago"]} valor={metodo} onChange={setMetodo} /></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Fecha</span>
            <input type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)}
              className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-gold" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Nota (opcional)</span>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: anuncio de Marketplace"
              className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-gold" />
          </label>
        </div>
      </Tarjeta>

      <button onClick={guardar} disabled={!!bloqueo || yendo}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold font-semibold text-ground disabled:opacity-40">
        <Check className="h-5 w-5" />
        {yendo ? "Guardando..." : `Guardar ${t.tipo === "Ingreso" ? "ingreso" : "gasto"}${monto ? ` de ${plata(monto)}` : ""}`}
      </button>
      {(error || bloqueo) && <p className={`text-center text-xs ${error ? "text-red-300" : "text-muted"}`}>{error ?? bloqueo}</p>}
    </div>
  );
}
