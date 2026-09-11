import Link from "next/link";
import type { Metadata } from "next";
import { verificar } from "@/lib/ruleta-server";
import { REGISTRO_ACTIVO, cuponDeCodigo, type CuponRegistrado } from "@/lib/cupones";
import { mostrarTelefono } from "@/lib/telefono";

/**
 * Validador de cupones. Es la pantalla que mira Facu cuando alguien le pasa un
 * código por WhatsApp: dice si es de verdad, de cuánto es y hasta cuándo vale.
 *
 * La firma dice si el código es de verdad; la hoja CUPONES dice de quién es y
 * si ya se canjeó. Marcar el canje se hace en el Sheet, a mano: esta URL es
 * pública para cualquiera que tenga el código, así que no escribe nada.
 */
export const dynamic = "force-dynamic";

/* Fuera de Google: es una herramienta interna, no una página del catálogo. */
export const metadata: Metadata = {
  title: "Cupón",
  robots: { index: false, follow: false },
};

/* Siempre en hora de Rosario: esta pantalla la mira Facu, no el visitante. */
const fecha = (ms: number) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(ms));

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const r = verificar(decodeURIComponent(codigo));

  /* La firma ya alcanza para saber si es válido: el registro solo agrega quién
     lo sacó. Si Google no contesta, la pantalla sirve igual. */
  let registrado: CuponRegistrado | null = null;
  let fallóElRegistro = false;
  if (r.estado !== "invalido" && REGISTRO_ACTIVO) {
    try {
      registrado = await cuponDeCodigo(r.cupon.codigo);
    } catch {
      fallóElRegistro = true;
    }
  }

  const color =
    r.estado === "valido" ? "text-wa" : r.estado === "vencido" ? "text-gold" : "text-muted";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="rounded-3xl border border-line bg-surface p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          Cupón de la ruleta
        </p>

        <p className={`mt-2 font-display text-4xl font-extrabold uppercase leading-none ${color}`}>
          {r.estado === "valido" ? "Válido" : r.estado === "vencido" ? "Vencido" : "No existe"}
        </p>

        {r.estado === "invalido" ? (
          <p className="mt-3 text-[14px] leading-snug text-muted">
            Ese código no salió de la ruleta: la firma no cierra. Puede estar mal copiado —
            fijate que no falte ningún guion — o ser inventado.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Premio</p>
              <p className="text-lg font-bold text-ink">{r.cupon.premio.titulo}</p>
              <p className="text-[13px] leading-snug text-muted">{r.cupon.premio.detalle}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {r.estado === "vencido" ? "Vencía" : "Vence"}
              </p>
              <p className="text-[14px] text-ink">{fecha(r.cupon.vence)} hs</p>
            </div>
            {registrado && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Lo sacó
                </p>
                <p className="text-[15px] font-semibold text-ink">{registrado.nombre}</p>
                <p className="text-[14px] text-muted">
                  {mostrarTelefono(registrado.telefono)} · tiene que escribirte desde ese número
                </p>
              </div>
            )}

            {registrado?.usado && (
              <p className="rounded-xl border border-gold/50 bg-gold/10 p-2.5 text-center text-[13px] font-semibold text-gold">
                Ojo: en la hoja CUPONES figura como YA USADO.
              </p>
            )}

            {REGISTRO_ACTIVO && !registrado && !fallóElRegistro && (
              <p className="text-[13px] leading-snug text-muted">
                La firma cierra, pero no aparece en la hoja CUPONES. Puede ser de antes de
                empezar a registrarlos.
              </p>
            )}

            {fallóElRegistro && (
              <p className="text-[13px] leading-snug text-muted">
                No se pudo consultar la hoja CUPONES (Google no contestó), así que no sé de
                quién es ni si ya se usó. El premio y la fecha de acá arriba son correctos.
              </p>
            )}

            <code className="block rounded-xl border border-dashed border-line bg-ground/60 p-2.5 text-center font-display text-base tracking-wider text-gold">
              {r.cupon.codigo}
            </code>
          </div>
        )}

        <Link
          href="/"
          className="mt-6 block text-center text-[13px] font-semibold text-muted hover:text-ink"
        >
          Volver al catálogo
        </Link>
      </div>
    </main>
  );
}
