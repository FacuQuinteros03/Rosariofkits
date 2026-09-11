"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Check, Copy, Gift, MessageCircle, X } from "lucide-react";
import {
  GAJOS,
  GRADOS_POR_GAJO,
  VIGENCIA_HORAS,
  premioPorId,
  type PremioId,
} from "@/lib/ruleta";
import { linkWhatsAppCupon } from "@/lib/whatsapp";

type Cupon = {
  codigo: string;
  premio: PremioId;
  titulo: string;
  frase: string;
  detalle: string;
  gajo: number;
  vence: number;
  vencido: boolean;
};

type Estado = "cerrado" | "listo" | "girando" | "resultado";

/* Condiciones del juego. Están acá y no desperdigadas por el componente: es lo
   que se va a querer cambiar, y es lo que el cliente después recita por
   WhatsApp. Si algún día el cupón se acumula con la promo del short, se toca
   este renglón y nada más. */
const CONDICIONES = [
  "Un giro por número de WhatsApp.",
  "Se canjea escribiendo desde ese mismo número.",
  `El cupón vale ${VIGENCIA_HORAS} horas desde que lo ganás.`,
  "No se acumula con otras promos.",
];

/** El estilo de los dos campos, para no repetirlo. */
const CAMPO =
  "w-full rounded-xl border border-line bg-ground px-3.5 py-3 text-[15px] text-ink " +
  "placeholder:text-muted focus:border-gold focus:outline-none";

const VUELTAS = 5;
const DURACION_MS = 4200;

/** Los premios gordos van en dorado; el resto alterna los dos azules de la marca. */
const DORADOS: Partial<Record<PremioId, string>> = {
  "2x1": "#f0cc6a",
  envio: "#e2b74a",
  "15": "#b98f2e",
};

const relleno = (id: PremioId, i: number) =>
  DORADOS[id] ?? (i % 2 === 0 ? "#10233b" : "#1b3355");

const tinta = (id: PremioId) => (DORADOS[id] ? "#0a0c10" : "#e9edf2");

/** Un gajo de la rueda. El ángulo se mide desde las 12, en sentido horario. */
function sector(i: number) {
  const r = 96;
  const desde = i * GRADOS_POR_GAJO - GRADOS_POR_GAJO / 2;
  const hasta = desde + GRADOS_POR_GAJO;
  const punto = (grados: number) => {
    const rad = (grados * Math.PI) / 180;
    return `${(100 + r * Math.sin(rad)).toFixed(2)} ${(100 - r * Math.cos(rad)).toFixed(2)}`;
  };
  return `M 100 100 L ${punto(desde)} A ${r} ${r} 0 0 1 ${punto(hasta)} Z`;
}

/** "domingo 13 a las 15:01". La hora va en 24 h: nadie dice "3 p. m." acá. */
function cuando(ms: number) {
  const d = new Date(ms);
  const dia = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric" }).format(d);
  const hora = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${dia.replace(",", "")} a las ${hora} hs`;
}

/**
 * La ruleta: botón flotante + modal.
 *
 * El premio lo decide el servidor. Acá no hay ninguna tabla de probabilidades
 * que alguien pueda leer en las devtools: llega un gajo y la rueda frena ahí.
 */
export function Ruleta() {
  const ruta = usePathname();
  const [activa, setActiva] = useState(false);
  const [estado, setEstado] = useState<Estado>("cerrado");
  const [cupon, setCupon] = useState<Cupon | null>(null);
  const [giro, setGiro] = useState(0);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pidiendo = useRef(false);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Red de seguridad del giro. Si la pestaña pierde el foco mientras la rueda
     gira, el navegador puede no disparar nunca `transitionend` y el modal se
     quedaría clavado en "Girando...". Este reloj muestra el premio igual. */
  const frenar = useCallback(() => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = null;
    setEstado((e) => (e === "girando" ? "resultado" : e));
  }, []);

  useEffect(() => () => void (reloj.current && clearTimeout(reloj.current)), []);

  /* El estado inicial se consulta con la página ya pintada: la ruleta es lo
     último que importa mientras el catálogo está cargando. */
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/ruleta");
        const d = await r.json();
        if (!d.activa) return;
        setActiva(true);
        if (d.cupon) {
          setCupon(d.cupon);
          setGiro(360 * VUELTAS - d.cupon.gajo * GRADOS_POR_GAJO);
        }
      } catch {
        /* sin ruleta se vende igual: no vale la pena molestar con un error */
      }
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const cerrar = useCallback(() => setEstado("cerrado"), []);

  useEffect(() => {
    if (estado === "cerrado") return;
    const teclas = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", teclas);
    /* con el modal abierto el catálogo de atrás no se mueve */
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", teclas);
      document.body.style.overflow = previo;
    };
  }, [estado, cerrar]);

  async function girar() {
    if (pidiendo.current || estado === "girando") return;
    pidiendo.current = true;
    setError(null);
    setEstado("girando");
    try {
      const r = await fetch("/api/ruleta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono }),
      });
      const d = await r.json();
      /* El servidor explica qué está mal (el número, el nombre, o que el
         registro no contesta): se muestra tal cual, es mejor que un genérico. */
      if (d.error) {
        setError(d.error);
        setEstado("listo");
        return;
      }
      if (!d.cupon) throw new Error("sin cupon");
      setCupon(d.cupon);
      /* siempre para adelante: las vueltas se suman sobre el ángulo actual */
      const base = Math.ceil(giro / 360) * 360;
      setGiro(base + 360 * VUELTAS - d.cupon.gajo * GRADOS_POR_GAJO);
      reloj.current = setTimeout(frenar, DURACION_MS + 500);
    } catch {
      setError("No pudimos girar la ruleta. Probá de nuevo en un momento.");
      setEstado("listo");
    } finally {
      pidiendo.current = false;
    }
  }

  async function copiar() {
    if (!cupon) return;
    try {
      await navigator.clipboard.writeText(cupon.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError(`Copialo a mano: ${cupon.codigo}`);
    }
  }

  /* En el validador de cupones el botón no pinta: esa pantalla es para Facu. */
  if (!activa || ruta.startsWith("/cupon")) return null;

  const yaGiro = Boolean(cupon);
  const mostrandoResultado = estado === "resultado" || (estado === "listo" && yaGiro);
  const abrir = () => setEstado(yaGiro ? "resultado" : "listo");

  const rueda = (
    <div className="relative mx-auto w-[min(74vw,290px)]">
      {/* la aguja, fija arriba: la rueda gira debajo */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[-9px] z-10 h-0 w-0 -translate-x-1/2
                   border-x-[11px] border-t-[20px] border-x-transparent border-t-gold
                   drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
      />
      <svg
        viewBox="0 0 200 200"
        className="w-full rounded-full ring-4 ring-gold/70 drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
        style={{
          transform: `rotate(${giro}deg)`,
          transition:
            estado === "girando"
              ? `transform ${DURACION_MS}ms cubic-bezier(0.16,0.84,0.24,1)`
              : "none",
        }}
        onTransitionEnd={frenar}
        role="img"
        aria-label="Ruleta de descuentos"
      >
        {GAJOS.map((id, i) => {
          const premio = premioPorId(id)!;
          return (
            <g key={i}>
              <path d={sector(i)} fill={relleno(id, i)} stroke="#0a0c10" strokeWidth="0.8" />
              <g transform={`rotate(${i * GRADOS_POR_GAJO} 100 100)`}>
                <text
                  x="100"
                  y="33"
                  textAnchor="middle"
                  fill={tinta(id)}
                  fontSize={id === "envio" ? 11 : id === "2x1" ? 14 : 16}
                  fontWeight="800"
                  fontFamily="var(--font-display)"
                >
                  {premio.gajo[0]}
                </text>
                <text
                  x="100"
                  y="45"
                  textAnchor="middle"
                  fill={tinta(id)}
                  fontSize={id === "envio" || id === "2x1" ? 7.5 : 10}
                  fontWeight="700"
                  letterSpacing="0.5"
                >
                  {premio.gajo[1]}
                </text>
              </g>
            </g>
          );
        })}
        <circle cx="100" cy="100" r="15" fill="#0a0c10" stroke="#e2b74a" strokeWidth="2" />
      </svg>
    </div>
  );

  const panel = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto
                 bg-black/85 p-4 backdrop-blur-sm"
      onClick={cerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Ruleta de descuentos"
    >
      <div
        className="aparece relative my-auto w-full max-w-md rounded-3xl border border-line
                   bg-surface p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full
                     text-muted transition-colors hover:bg-white/5 hover:text-ink"
        >
          <X className="h-5 w-5" strokeWidth={2.2} />
        </button>

        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
          {mostrandoResultado ? "Tu cupón" : "Un giro, un premio"}
        </p>
        <h2 className="mt-1 text-center font-display text-3xl font-extrabold uppercase leading-none text-ink">
          {mostrandoResultado && cupon ? cupon.titulo : "Girá y ganá"}
        </h2>

        <div className="mt-5">{rueda}</div>

        {mostrandoResultado && cupon ? (
          cupon.vencido ? (
            <div className="mt-5 rounded-2xl border border-line bg-ground/60 p-4 text-center">
              <p className="text-sm font-semibold text-ink">Este cupón ya venció.</p>
              <p className="mt-1 text-[13px] leading-snug text-muted">
                Duraba {VIGENCIA_HORAS} horas. Escribinos igual y vemos qué podemos hacer.
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-center text-[13px] leading-snug text-muted">{cupon.detalle}</p>

              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-gold/60 bg-ground/60 p-3">
                <code className="flex-1 text-center font-display text-lg font-bold tracking-wider text-gold">
                  {cupon.codigo}
                </code>
                <button
                  type="button"
                  onClick={copiar}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line
                             text-muted transition-colors hover:border-gold hover:text-gold"
                  aria-label="Copiar el código"
                >
                  {copiado ? (
                    <Check className="h-4 w-4 text-wa" strokeWidth={2.5} />
                  ) : (
                    <Copy className="h-4 w-4" strokeWidth={2.2} />
                  )}
                </button>
              </div>

              <p className="mt-2 text-center text-[12px] text-muted">
                Vence el {cuando(cupon.vence)}
              </p>

              <a
                href={linkWhatsAppCupon(cupon.codigo, cupon.frase)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-wa px-4 py-3
                           text-[15px] font-bold text-[#04310f] transition-colors hover:bg-wa-dark"
              >
                <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
                Usarlo por WhatsApp
              </a>
            </div>
          )
        ) : (
          /* Los datos van antes del giro, no después: pedirlos para entregar un
             premio ya ganado se siente como un peaje. */
          <form
            className="mt-5 space-y-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              girar();
            }}
          >
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
              autoComplete="name"
              maxLength={60}
              required
              className={CAMPO}
            />
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Tu WhatsApp (341 617 8059)"
              autoComplete="tel"
              inputMode="tel"
              maxLength={22}
              required
              className={CAMPO}
            />
            <button
              type="submit"
              disabled={estado === "girando" || nombre.trim().length < 3 || telefono.trim().length < 8}
              className="w-full rounded-xl bg-gold px-4 py-3.5 font-display text-xl font-extrabold
                         uppercase tracking-wide text-navy transition-transform hover:scale-[1.01]
                         disabled:cursor-not-allowed disabled:opacity-60"
            >
              {estado === "girando" ? "Girando…" : "Girar"}
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-center text-[13px] text-gold">{error}</p>}

        <ul className="mt-4 space-y-0.5 text-center text-[11.5px] leading-snug text-muted">
          {CONDICIONES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        {!mostrandoResultado && (
          <p className="mt-2 text-center text-[11px] leading-snug text-muted/70">
            Usamos tu nombre y tu número solo para validar el cupón.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-gold/40
                   bg-gradient-to-br from-gold to-[#c79a2f] px-4 py-3 text-[14px] font-bold text-navy
                   shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform hover:scale-105
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-gold"
      >
        <Gift className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
        {yaGiro ? "Tu cupón" : "Girá y ganá"}
      </button>

      {estado !== "cerrado" ? createPortal(panel, document.body) : null}
    </>
  );
}
