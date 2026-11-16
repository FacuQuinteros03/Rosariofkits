import type { Metadata } from "next";
import Link from "next/link";
import { PieDePagina } from "@/components/PieDePagina";
import { LEGAL } from "@/lib/legal";
import { INSTAGRAM, NEGOCIO, USUARIO_IG } from "@/lib/site";
import { linkWhatsAppGeneral } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué datos pide Rosario F Kits, para qué los usa y cómo pedir que se corrijan o se borren.",
};

/**
 * Política de privacidad (Ley 25.326). Texto corto y en criollo: qué se pide,
 * para qué, dónde queda y cómo pedirlo o borrarlo. Si cambia algo de fondo,
 * se sube LEGAL.version en lib/legal.ts.
 */
export default function Privacidad() {
  const contacto = linkWhatsAppGeneral();
  return (
    <main className="mx-auto max-w-[680px] px-4 pb-20 pt-6">
      <Link href="/" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-azul hover:underline">
        Volver al catálogo
      </Link>

      <h1 className="mt-4 font-titulo text-4xl font-extrabold uppercase leading-none text-navy sm:text-5xl">
        Privacidad
      </h1>
      <p className="mt-2 text-[13px] text-muted">
        Versión {LEGAL.version}, vigente desde el {LEGAL.vigencia}.
      </p>

      <div className="mt-8 space-y-8 text-base leading-relaxed text-ink [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-navy [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
        <section>
          <h2>Quién responde por tus datos</h2>
          <p>
            {LEGAL.responsable}, tienda de camisetas de fútbol de {NEGOCIO.ciudad}, {NEGOCIO.provincia}.
            Para cualquier consulta sobre tus datos escribinos por{" "}
            <a href={contacto} target="_blank" rel="noopener noreferrer" className="font-semibold text-azul underline underline-offset-4">
              WhatsApp
            </a>{" "}
            o por Instagram a{" "}
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="font-semibold text-azul underline underline-offset-4">
              {USUARIO_IG}
            </a>
            .
          </p>
        </section>

        <section>
          <h2>Qué datos pedimos y para qué</h2>
          <ul>
            <li>
              <b>Si reservás pagando por transferencia:</b> tu nombre, tu WhatsApp y el comprobante de la
              transferencia. Los usamos para confirmar el pago, guardarte la camiseta y coordinar la entrega.
              También queda anotada la fecha y la dirección de internet desde la que aceptaste esta política.
            </li>
            <li>
              <b>Si girás la ruleta:</b> tu nombre y tu WhatsApp, para que cada persona tenga un solo cupón y
              podamos validarlo cuando lo uses.
            </li>
            <li>
              <b>Si nos escribís por WhatsApp o Instagram:</b> lo que nos cuentes en esa conversación, para
              atender tu pedido.
            </li>
          </ul>
          <p className="mt-3">
            No pedimos datos de tarjetas ni claves bancarias. No vendemos ni pasamos tus datos a otras
            empresas para publicidad.
          </p>
        </section>

        <section>
          <h2>Dónde se guardan</h2>
          <p>
            Los pedidos y los comprobantes se guardan en Supabase, los cupones de la ruleta en una planilla de
            Google, y el sitio funciona sobre Vercel. Los servidores de estos servicios pueden estar fuera de
            Argentina. Al enviarnos tus datos aceptás que se guarden ahí.
          </p>
          <p className="mt-3">
            Los comprobantes quedan en una carpeta privada: solo los ve quien administra la tienda.
          </p>
        </section>

        <section>
          <h2>Cuánto tiempo</h2>
          <p>
            Guardamos los datos de un pedido hasta {LEGAL.plazo}. Después los borramos, salvo que una ley nos
            obligue a conservarlos más.
          </p>
        </section>

        <section>
          <h2>Cookies y medición</h2>
          <p>
            El sitio no usa cookies de publicidad ni de terceros. Guardamos en tu navegador lo necesario para
            que funcione: el pedido que vas armando y, si giraste la ruleta, tu cupón. Contamos las visitas
            con Vercel Web Analytics, que no usa cookies ni te sigue de un sitio a otro.
          </p>
        </section>

        <section>
          <h2>Tus derechos</h2>
          <p>
            Podés pedirnos que te mostremos qué datos tuyos tenemos, que los corrijamos o que los borremos.
            Escribinos por WhatsApp y lo resolvemos: el acceso dentro de los 10 días corridos, y las
            correcciones o el borrado dentro de los 5 días hábiles.
          </p>
          <p className="mt-3">
            La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las
            denuncias y reclamos de quienes vean afectados sus derechos por incumplimiento de las normas de
            protección de datos personales.
          </p>
        </section>
      </div>

      <PieDePagina />
    </main>
  );
}
