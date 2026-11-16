import type { Metadata } from "next";
import Link from "next/link";
import { BotonArrepentimiento } from "@/components/BotonArrepentimiento";
import { PieDePagina } from "@/components/PieDePagina";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento",
  description: "Si compraste a distancia en Rosario F Kits, tenés 10 días para arrepentirte de la compra.",
};

/**
 * Botón de arrepentimiento (Ley 24.240, art. 34): visible, sin cuenta y con
 * número de gestión. El pedido sale por WhatsApp, que es por donde se compra.
 */
export default function Arrepentimiento() {
  return (
    <main className="mx-auto max-w-[680px] px-4 pb-20 pt-6">
      <Link href="/" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-azul hover:underline">
        Volver al catálogo
      </Link>

      <h1 className="mt-4 font-titulo text-4xl font-extrabold uppercase leading-none text-navy sm:text-5xl">
        Botón de arrepentimiento
      </h1>

      <div className="mt-6 space-y-4 text-base leading-relaxed text-ink">
        <p>
          Si compraste por la web, por WhatsApp o por Instagram y recibiste el pedido por envío, tenés 10 días
          corridos desde que lo recibiste para arrepentirte, sin dar explicaciones.
        </p>
        <p>
          Tocá el botón: se abre WhatsApp con un mensaje ya escrito y tu número de gestión. Ahí coordinamos la
          devolución de la camiseta, sin uso y con sus etiquetas, y te devolvemos la plata.
        </p>
      </div>

      <div className="mt-6">
        <BotonArrepentimiento />
      </div>

      <PieDePagina />
    </main>
  );
}
