import type { CategoriaReal } from "./types";

export const WHATSAPP = "5493416178059";

/**
 * Link de WhatsApp con el mensaje ya escrito.
 *
 * El nombre del Sheet ya empieza con "Camiseta ..." o "Short ...", asi que se
 * le saca ese sustantivo y se usa el que corresponde a la categoria. Si no,
 * saldria "me interesa la camiseta Camiseta Arsenal".
 */
export function linkWhatsApp(
  nombre: string,
  talle?: string | null,
  categoria?: CategoriaReal
): string {
  const limpio = nombre.replace(/^(camisetas?|shorts?)\s+/i, "").trim();
  const articulo = categoria === "Shorts" ? "el short" : "la camiseta";
  const conTalle = talle && talle !== "ÚNICO" ? ` en talle ${talle}` : "";
  const texto = `¡Hola Rosario F Kits! Me interesa ${articulo} ${limpio}${conTalle}. ¿Tienen stock?`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

/** Consulta general, sin producto: la del boton del encabezado. */
export function linkWhatsAppGeneral(): string {
  const texto = "¡Hola Rosario F Kits! Quería hacerles una consulta.";
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

export const precio = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
