"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { asignarBox, rechazarBox } from "@/app/admin/acciones";

export type Candidata = { sku: number; nombre: string; disponible: number; aviso: string | null };

/**
 * Elegir la camiseta de una box. La lista ya viene filtrada por talle y tipo,
 * con las que coinciden con la versión primero. Lo que no quiere el cliente es
 * texto libre: eso lo mira Facu.
 */
export function AsignarBox({ box, candidatas, conComprobante }: { box: string; candidatas: Candidata[]; conComprobante: boolean }) {
  const router = useRouter();
  const [sku, setSku] = useState<number | null>(null);
  const [cobrar, setCobrar] = useState(conComprobante);
  const [yendo, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (candidatas.length === 0) {
    return (
      <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        No queda ninguna camiseta de este talle y tipo. Si no entra stock, rechazala y devolvé la plata.
      </p>
    );
  }

  function guardar() {
    if (sku === null) return;
    setError(null);
    iniciar(async () => {
      const r = await asignarBox(box, sku, cobrar);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1" role="radiogroup" aria-label="Camiseta para la box">
        {candidatas.map((c) => (
          <button
            key={c.sku}
            type="button"
            role="radio"
            aria-checked={sku === c.sku}
            onClick={() => setSku(c.sku)}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
              sku === c.sku ? "border-gold bg-gold/10" : "border-line hover:border-muted"
            }`}
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">{c.nombre}</span>
              <span className="text-xs text-muted">
                SKU {c.sku} · quedan {c.disponible}
                {c.aviso && <span className="text-gold"> · {c.aviso}</span>}
              </span>
            </span>
            {sku === c.sku && <Check className="h-4 w-4 shrink-0 text-gold" />}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={cobrar} onChange={(e) => setCobrar(e.target.checked)} className="accent-[#e2b74a]" />
        Ya vi la plata en el banco: cobrarla ahora
      </label>
      <button
        onClick={guardar}
        disabled={sku === null || yendo}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-gold px-4 text-sm font-semibold text-ground disabled:opacity-40"
      >
        <Check className="h-4 w-4" /> {yendo ? "Guardando..." : cobrar ? "Asignar y cobrar" : "Asignar (sin cobrar)"}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function RechazarBox({ box }: { box: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [yendo, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
      >
        <X className="h-3.5 w-3.5" /> Rechazar
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-red-400/30 bg-ground/60 p-3">
      <p className="text-sm text-muted">La box queda rechazada. Si había plata, devolvela por fuera y anotalo acá.</p>
      <input
        autoFocus
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Por qué: no llegó la transferencia, no hay talle..."
        className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-red-300"
      />
      <div className="flex gap-2">
        <button
          onClick={() =>
            iniciar(async () => {
              setError(null);
              const r = await rechazarBox(box, motivo);
              if (!r.ok) setError(r.error);
              else router.refresh();
            })
          }
          disabled={yendo || !motivo.trim()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500/80 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {yendo ? "Rechazando..." : "Rechazar la box"}
        </button>
        <button onClick={() => setAbierto(false)} aria-label="Cancelar" className="rounded-lg border border-line px-3 text-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
