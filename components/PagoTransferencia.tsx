"use client";

import { useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Copy, MessageCircle, Upload } from "lucide-react";
import type { ItemCarrito } from "@/lib/carrito";
import type { DatosTransferencia } from "@/lib/transferencia";
import { precio, WHATSAPP } from "@/lib/whatsapp";

/**
 * El paso de pago del carrito: los datos para transferir y el formulario del
 * comprobante. Subir el comprobante es lo que reserva: antes de eso nada queda
 * apartado, así nadie bloquea stock sin haber pagado.
 *
 * Es para el que quiere asegurarse la camiseta a cualquier hora, aunque Facu no
 * pueda contestar en ese momento. La confirmación final (ver la plata en el
 * banco) la sigue haciendo una persona desde /admin.
 */
export function PagoTransferencia({
  items,
  total,
  datos,
  onVolver,
  onListo,
}: {
  items: ItemCarrito[];
  total: number;
  datos: DatosTransferencia;
  onVolver: () => void;
  onListo: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  /* el pedido confirmado: se guarda acá porque el carrito se vacía al terminar */
  const [listo, setListo] = useState<{ venta: string; total: number } | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const datosForm = new FormData(e.currentTarget);
    datosForm.set("items", JSON.stringify(items.map((i) => ({ sku: i.sku, cantidad: i.cantidad }))));
    datosForm.set("total", String(total));
    setEnviando(true);
    try {
      const res = await fetch("/api/pedido", { method: "POST", body: datosForm });
      const r = (await res.json().catch(() => ({}))) as { venta?: string; total?: number; error?: string };
      if (!res.ok || !r.venta) {
        setError(r.error ?? "No se pudo enviar. Probá de nuevo o escribinos por WhatsApp.");
        return;
      }
      setListo({ venta: r.venta, total: r.total ?? total });
      onListo();
    } catch {
      setError("Sin conexión. Probá de nuevo en un rato o mandá el comprobante por WhatsApp.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    const { venta } = listo;
    const texto = `¡Hola Rosario F Kits! Hice el pedido ${venta} en la web y ya transferí ${precio(listo.total)}. ¿Coordinamos el envío?`;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <CheckCircle2 className="h-14 w-14 text-wa" strokeWidth={1.8} aria-hidden />
        <div>
          <p className="font-display text-3xl font-extrabold uppercase leading-none">¡Reservado!</p>
          <p className="mt-2 text-sm text-muted">
            Pedido <b className="text-ink">{venta}</b> · {precio(listo.total)}
          </p>
        </div>
        <p className="text-[13.5px] leading-relaxed text-ink">
          Tus camisetas quedaron apartadas. En cuanto veamos la transferencia te escribimos por WhatsApp para
          coordinar el envío.
        </p>
        <a
          href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl bg-wa px-5 py-3.5 text-[15px]
                     font-bold text-black/85 transition-colors hover:bg-wa-dark"
        >
          <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
          Avisar por WhatsApp
        </a>
        <p className="text-[11.5px] text-muted">Opcional: tu pedido ya nos llegó igual.</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 space-y-5 px-5 py-4">
        <button
          type="button"
          onClick={onVolver}
          className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Volver al pedido
        </button>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">1 · Transferí</p>
          <p className="mt-1 font-display text-4xl font-bold tabular-nums">{precio(total)}</p>
          <p className="mt-1 text-[12px] text-muted">El envío no está incluido: lo coordinamos después por WhatsApp.</p>
        </div>

        <dl className="space-y-2 rounded-xl border border-line bg-surface p-3.5 text-sm">
          {datos.alias && <Dato etiqueta="Alias" valor={datos.alias} />}
          {datos.cbu && <Dato etiqueta="CBU / CVU" valor={datos.cbu} />}
          {datos.titular && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Titular</dt>
              <dd className="text-right">{datos.titular}</dd>
            </div>
          )}
        </dl>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            2 · Subí el comprobante y queda reservado
          </p>
          <Campo nombre="nombre" etiqueta="Tu nombre" autoComplete="name" />
          <Campo nombre="telefono" etiqueta="Tu WhatsApp" tipo="tel" autoComplete="tel" ayuda="Con código de área, ej. 341 612 3456" />
          {/* trampa para bots: una persona no la ve */}
          <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

          <label
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line px-3.5 py-3
                       text-sm hover:border-muted"
          >
            {archivo ? (
              <Check className="h-5 w-5 shrink-0 text-wa" aria-hidden />
            ) : (
              <Upload className="h-5 w-5 shrink-0 text-muted" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate">{archivo ?? "Comprobante (captura o PDF)"}</span>
            <input
              type="file"
              name="comprobante"
              accept="image/*,application/pdf"
              required
              className="sr-only"
              onChange={(e) => setArchivo(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-[13px] leading-snug text-red-200">
            {error}
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-line px-5 py-4">
        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gold px-5 py-3.5 text-[15px]
                     font-bold text-black/85 transition-opacity disabled:opacity-60"
        >
          {enviando ? "Enviando..." : "Enviar comprobante y reservar"}
        </button>
        <p className="text-center text-[11.5px] leading-snug text-muted">
          Confirmamos el pago con el banco y te escribimos. Si algo no está, te devolvemos la plata.
        </p>
      </div>
    </form>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{etiqueta}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span className="break-all text-right font-semibold tabular-nums">{valor}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(valor);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1800);
            } catch {
              // sin permiso para copiar: el dato igual está a la vista
            }
          }}
          aria-label={`Copiar ${etiqueta}`}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-muted hover:text-ink"
        >
          {copiado ? <Check className="h-3.5 w-3.5 text-wa" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </dd>
    </div>
  );
}

function Campo({
  nombre,
  etiqueta,
  tipo = "text",
  autoComplete,
  ayuda,
}: {
  nombre: string;
  etiqueta: string;
  tipo?: string;
  autoComplete?: string;
  ayuda?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] text-muted">{etiqueta}</span>
      <input
        name={nombre}
        type={tipo}
        required
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-muted"
      />
      {ayuda && <span className="mt-1 block text-[11.5px] text-muted">{ayuda}</span>}
    </label>
  );
}
