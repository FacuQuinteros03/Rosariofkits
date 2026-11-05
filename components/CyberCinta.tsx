import Link from "next/link";
import { Zap } from "lucide-react";
import {
  CYBER_CIERRE_CORTO,
  CYBER_PRECIO,
  CYBER_PRECIO_CLAVO,
  enCyber,
} from "@/lib/cyber";
import { precio } from "@/lib/whatsapp";

/**
 * La cinta del Cyber Monday, arriba de todo. Server Component: con el ISR de
 * un minuto deja de aparecer sola cuando termina la fecha.
 *
 * El texto va dos veces seguidas y la animación corre la mitad del ancho: al
 * terminar la primera vuelta la segunda está exactamente donde arrancó.
 */
export function CyberCinta() {
  if (!enCyber()) return null;

  const frases = [
    "Cyber Monday",
    `Todas las camisetas a ${precio(CYBER_PRECIO)}`,
    `Seleccionadas a ${precio(CYBER_PRECIO_CLAVO)}`,
    `Hasta el ${CYBER_CIERRE_CORTO}`,
    "Envíos a todo el país",
    "Efectivo o transferencia sin recargo",
  ];
  const vuelta = (oculta: boolean) => (
    <span
      aria-hidden={oculta || undefined}
      className="flex shrink-0 items-center"
    >
      {frases.map((f, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-4">{f}</span>
          <Zap
            className="h-3.5 w-3.5 shrink-0 fill-current text-fuchsia-300"
            aria-hidden
          />
        </span>
      ))}
    </span>
  );

  return (
    <Link
      href="/#cyber"
      className="relative z-40 block overflow-hidden bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500
                 py-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-black"
    >
      <span className="sr-only">
        Cyber Monday: todas las camisetas a {precio(CYBER_PRECIO)} hasta el{" "}
        {CYBER_CIERRE_CORTO}.
      </span>
      <span className="cinta-cyber flex w-max" aria-hidden>
        {vuelta(false)}
        {vuelta(true)}
      </span>
    </Link>
  );
}
