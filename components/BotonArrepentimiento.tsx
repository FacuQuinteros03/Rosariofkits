"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { BOTON_BASE, BOTON_VARIANTE } from "./ui/Boton";
import { WHATSAPP } from "@/lib/whatsapp";

/**
 * Arma el pedido de arrepentimiento con un número de gestión y lo manda por
 * WhatsApp, que es el canal por el que se hizo la compra. El número se genera
 * recién al tocar el botón (fecha + cuatro letras al azar) y queda a la vista,
 * para que la persona lo tenga aunque cierre WhatsApp.
 */
export function BotonArrepentimiento() {
  const [gestion, setGestion] = useState<string | null>(null);

  function pedir() {
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, "0")}${String(hoy.getDate()).padStart(2, "0")}`;
    const letras = Array.from(crypto.getRandomValues(new Uint8Array(4)), (n) => "ABCDEFGHJKLMNPQRSTUVWXYZ"[n % 24]).join("");
    const codigo = `ARR-${fecha}-${letras}`;
    setGestion(codigo);
    const texto = `Hola Rosario F Kits. Quiero arrepentirme de una compra. Número de gestión: ${codigo}.`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  }

  return (
    <div>
      <button type="button" onClick={pedir} className={`${BOTON_BASE} ${BOTON_VARIANTE.acento} w-full sm:w-auto`}>
        <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} aria-hidden />
        Pedir el arrepentimiento
      </button>
      {gestion && (
        <p role="status" className="mt-3 text-base text-ink">
          Tu número de gestión es <b className="tabular-nums">{gestion}</b>. Guardalo: va escrito en el mensaje
          que se abrió en WhatsApp.
        </p>
      )}
    </div>
  );
}
