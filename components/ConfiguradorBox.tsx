"use client";

import { useState } from "react";
import { Check, MessageCircle, ShoppingBag } from "lucide-react";
import { agregarBox } from "@/lib/carrito";
import {
  BOX,
  describirBox,
  limpiarTexto,
  precioBox,
  PRECIO_BOX,
  requisitosBox,
  TIPOS_BOX,
  TOPE_TEXTO,
  VERSIONES_BOX,
  type PedidoBox,
  type TipoBox,
  type VersionBox,
} from "@/lib/box";
import { precio, WHATSAPP } from "@/lib/whatsapp";
import { EVENTO_AGREGADO } from "./Carrito";
import { BOTON_BASE, BOTON_VARIANTE } from "./ui/Boton";

/**
 * Lo que el cliente elige de su Mystery Box. Los talles salen del servidor
 * (`tallesPorTipo`): solo los que tienen camisetas en mano de ese tipo, para no
 * vender una box que no se puede cumplir.
 */
export function ConfiguradorBox({ tallesPorTipo }: { tallesPorTipo: Record<TipoBox, string[]> }) {
  const [version, setVersion] = useState<VersionBox>("fan");
  const [tipo, setTipo] = useState<TipoBox>("cualquiera");
  const [talle, setTalle] = useState<string | null>(null);
  const [preferencia, setPreferencia] = useState("");
  const [excluir, setExcluir] = useState("");
  const [agregada, setAgregada] = useState(false);

  const talles = tallesPorTipo[tipo];
  /* si el talle elegido no existe en el tipo nuevo, se vuelve a pedir */
  const talleValido = talle && talles.includes(talle) ? talle : null;
  const retro = tipo === "retro";

  const pedido: PedidoBox | null = talleValido
    ? { version: retro ? "player" : version, tipo, talle: talleValido, preferencia: limpiarTexto(preferencia), excluir: limpiarTexto(excluir) }
    : null;
  const monto = precioBox({ version, tipo });

  function sumar() {
    if (!pedido) return;
    agregarBox(pedido);
    setAgregada(true);
    setTimeout(() => setAgregada(false), 2500);
    window.dispatchEvent(new CustomEvent(EVENTO_AGREGADO, { detail: `${BOX.nombre} (${pedido.talle})` }));
  }

  const linkWhatsApp = pedido
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        [
          `¡Hola Rosario F Kits! Quiero una ${BOX.nombre}: ${describirBox(pedido)} — ${precio(monto)}`,
          requisitosBox(pedido),
          "¿Cómo seguimos con el pago y la entrega?",
        ]
          .filter(Boolean)
          .join("\n")
      )}`
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Grupo titulo="Versión">
        {VERSIONES_BOX.map((v) => {
          const deshabilitada = retro && v.id === "fan";
          const activa = (retro ? "player" : version) === v.id;
          return (
            <Opcion
              key={v.id}
              activa={activa}
              deshabilitada={deshabilitada}
              onClick={() => setVersion(v.id)}
              ancha
            >
              <span className="block text-[15px] font-bold">
                {v.nombre} · {precio(PRECIO_BOX[v.id])}
              </span>
              <span className={`mt-0.5 block text-[13px] font-medium ${activa ? "text-white/80" : "text-muted"}`}>
                {v.detalle}
              </span>
            </Opcion>
          );
        })}
      </Grupo>
      {retro && <p className="-mt-4 text-[13px] text-muted">La retro va siempre en versión Player.</p>}

      <Grupo titulo="Tipo">
        {TIPOS_BOX.map((t) => (
          <Opcion
            key={t.id}
            activa={tipo === t.id}
            deshabilitada={tallesPorTipo[t.id].length === 0}
            onClick={() => setTipo(t.id)}
          >
            {t.nombre}
          </Opcion>
        ))}
      </Grupo>

      <Grupo titulo="Talle">
        {talles.length === 0 ? (
          <p className="text-[14px] text-muted">De este tipo no nos queda ningún talle. Probá con otro.</p>
        ) : (
          talles.map((t) => (
            <Opcion key={t} activa={talleValido === t} onClick={() => setTalle(t)}>
              {t}
            </Opcion>
          ))
        )}
      </Grupo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Equipo o liga que te gustaría"
          ayuda="Opcional. Lo tenemos en cuenta si hay en tu talle."
          valor={preferencia}
          onChange={setPreferencia}
          ejemplo="Ej: Premier, Boca"
        />
        <Campo
          etiqueta="Equipos que no querés"
          ayuda="Opcional. Esto lo respetamos."
          valor={excluir}
          onChange={setExcluir}
          ejemplo="Ej: River, Newell's"
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Tu box</span>
          <span className="font-display text-4xl font-bold tabular-nums">{precio(monto)}</span>
        </p>
        {!pedido && <p className="text-[13px] text-muted">Elegí tu talle para seguir.</p>}
        <a
          href={linkWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!pedido}
          onClick={(e) => !pedido && e.preventDefault()}
          className={`${BOTON_BASE} ${BOTON_VARIANTE.whatsapp} aria-disabled:pointer-events-none aria-disabled:opacity-50`}
        >
          <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
          Pedir por WhatsApp
        </a>
        <button
          type="button"
          onClick={sumar}
          disabled={!pedido}
          className={`${BOTON_BASE} ${BOTON_VARIANTE.linea} disabled:opacity-50`}
        >
          {agregada ? (
            <Check className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
          ) : (
            <ShoppingBag className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
          )}
          {agregada ? "Agregada a tu pedido" : "Agregar al pedido"}
        </button>
      </div>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{titulo}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={titulo}>
        {children}
      </div>
    </div>
  );
}

function Opcion({
  activa,
  deshabilitada = false,
  ancha = false,
  onClick,
  children,
}: {
  activa: boolean;
  deshabilitada?: boolean;
  ancha?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      aria-pressed={activa}
      className={[
        "min-h-12 rounded-xl border px-4 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        ancha ? "flex-1 basis-[11rem] py-2.5 text-left" : "min-w-[52px]",
        activa ? "border-navy bg-navy text-white" : "border-line text-ink hover:border-muted",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Campo({
  etiqueta,
  ayuda,
  valor,
  onChange,
  ejemplo,
}: {
  etiqueta: string;
  ayuda: string;
  valor: string;
  onChange: (v: string) => void;
  ejemplo: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] font-semibold text-ink">{etiqueta}</span>
      <input
        value={valor}
        maxLength={TOPE_TEXTO}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ejemplo}
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-base placeholder:text-muted/70 focus:border-azul"
      />
      <span className="mt-1 block text-[13px] text-muted">{ayuda}</span>
    </label>
  );
}
