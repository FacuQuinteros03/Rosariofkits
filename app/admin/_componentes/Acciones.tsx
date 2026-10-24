"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, HandCoins, PackageCheck, Undo2, X } from "lucide-react";
import { cobrar, entregar, revertir } from "@/app/admin/acciones";
import { plata } from "@/app/admin/_lib/formato";
import { Chips } from "./Controles";

/** "Ya se la di": marca un item como entregado. */
export function BotonEntregar({ venta, item, debe }: { venta: string; item: number; debe: number }) {
  const router = useRouter();
  const [yendo, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  function hacer() {
    if (debe > 0 && !confirmar) {
      setConfirmar(true);
      return;
    }
    iniciar(async () => {
      const r = await entregar(venta, item);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <button onClick={hacer} disabled={yendo}
        className="inline-flex items-center gap-1.5 rounded-lg border border-wa/50 px-2.5 py-1.5 text-xs font-semibold text-wa
                   hover:bg-wa/10 disabled:opacity-50">
        <PackageCheck className="h-3.5 w-3.5" />
        {yendo ? "..." : confirmar ? `Debe ${plata(debe)}, ¿igual?` : "Entregada"}
      </button>
      {error && <span className="max-w-48 text-right text-[11px] text-red-300">{error}</span>}
    </span>
  );
}

/** Cobrar lo que falta de una venta, con opción de marcarla entregada en el mismo paso. */
export function Cobrar({ venta, saldo, puedeEntregar }: { venta: string; saldo: number; puedeEntregar: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState(saldo);
  const [metodo, setMetodo] = useState("Transferencia");
  const [entrega, setEntrega] = useState(false);
  const [yendo, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gold/50 px-2.5 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10">
        <HandCoins className="h-3.5 w-3.5" /> Cobrar
      </button>
    );
  }

  function guardar() {
    setError(null);
    iniciar(async () => {
      const r = await cobrar(venta, monto, metodo, entrega);
      if (!r.ok) setError(r.error);
      else {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-2 flex w-full flex-col gap-2 rounded-lg border border-line bg-ground/60 p-3">
      <label className="flex items-center gap-1 rounded-lg border border-line px-3 py-2 focus-within:border-gold">
        <span className="text-sm text-muted">$</span>
        <input inputMode="numeric" autoFocus value={monto ? monto.toLocaleString("es-AR") : ""}
          onChange={(e) => setMonto(Math.min(Number(e.target.value.replace(/\D/g, "")) || 0, saldo))}
          className="w-full bg-transparent font-semibold outline-none" />
        <span className="shrink-0 text-xs text-muted">de {plata(saldo)}</span>
      </label>
      <Chips opciones={["Transferencia", "Efectivo", "Mercado Pago"]} valor={metodo} onChange={setMetodo} />
      {puedeEntregar && (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={entrega} onChange={(e) => setEntrega(e.target.checked)} className="accent-[#e2b74a]" />
          Y ya se la llevó
        </label>
      )}
      <div className="flex gap-2">
        <button onClick={guardar} disabled={yendo || monto <= 0}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold py-2 text-sm font-semibold text-ground disabled:opacity-40">
          <Check className="h-4 w-4" /> {yendo ? "Guardando..." : `Cobrar ${plata(monto)}`}
        </button>
        <button onClick={() => setAbierto(false)} aria-label="Cancelar" className="rounded-lg border border-line px-3 text-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

/**
 * Revertir la venta entera: no le entró, se arrepintió, no la vino a buscar. Las
 * camisetas vuelven al stock y, si había cobrado algo, se devuelve todo.
 * Un cambio de talle no va por acá: eso es cargar la venta nueva.
 */
export function Revertir({ venta, cobrado }: { venta: string; cobrado: number }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [metodo, setMetodo] = useState("Transferencia");
  const [yendo, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-400/40 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10">
        <Undo2 className="h-3.5 w-3.5" /> Revertir
      </button>
    );
  }

  function guardar() {
    setError(null);
    iniciar(async () => {
      const r = await revertir(venta, motivo, cobrado > 0 ? metodo : null);
      if (!r.ok) setError(r.error);
      else {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-2 flex w-full flex-col gap-2 rounded-lg border border-red-400/30 bg-ground/60 p-3">
      <p className="text-sm text-muted">
        Las camisetas vuelven al stock
        {cobrado > 0 ? <> y se le devuelven <b className="text-ink">{plata(cobrado)}</b></> : ""}.
      </p>
      <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por qué: le quedó chica, se arrepintió..."
        className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-red-300" />
      {cobrado > 0 && (
        <Chips opciones={["Transferencia", "Efectivo", "Mercado Pago"]} valor={metodo} onChange={setMetodo} />
      )}
      <div className="flex gap-2">
        <button onClick={guardar} disabled={yendo || !motivo.trim()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500/80 py-2 text-sm font-semibold text-white disabled:opacity-40">
          <Undo2 className="h-4 w-4" /> {yendo ? "Revirtiendo..." : cobrado > 0 ? `Revertir y devolver ${plata(cobrado)}` : "Revertir la venta"}
        </button>
        <button onClick={() => setAbierto(false)} aria-label="Cancelar" className="rounded-lg border border-line px-3 text-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
