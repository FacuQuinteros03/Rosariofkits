import type { CategoriaReal } from "./types";

export const WHATSAPP = "5493416178059";

/** "Camiseta Boca" + Clubes -> "la camiseta Boca". Ver nota en linkWhatsApp. */
function articuloYNombre(nombre: string, categoria?: CategoriaReal): string {
  const limpio = nombre.replace(/^(camisetas?|shorts?)\s+/i, "").trim();
  const articulo = categoria === "Shorts" ? "el short" : "la camiseta";
  return `${articulo} ${limpio}`;
}

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
  const conTalle = talle && talle !== "ÚNICO" ? ` en talle ${talle}` : "";
  const texto = `¡Hola Rosario F Kits! Me interesa ${articuloYNombre(nombre, categoria)}${conTalle}. ¿Tienen stock?`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

/**
 * Consulta por un modelo agotado.
 *
 * Es el motivo por el que los agotados siguen en el catalogo: el visitante ve
 * que ese modelo se vendio y arranca la conversacion de encargue solo.
 */
export function linkWhatsAppEncargue(
  nombre: string,
  categoria?: CategoriaReal,
  talle?: string | null
): string {
  const conTalle = talle && talle !== "ÚNICO" ? ` en talle ${talle}` : "";
  const texto = `¡Hola Rosario F Kits! Vi que tienen agotada ${articuloYNombre(nombre, categoria)}. ¿La pueden conseguir por encargue${conTalle ? `,${conTalle}` : ""}?`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

/** Consulta general, sin producto: la del boton del encabezado. */
export function linkWhatsAppGeneral(): string {
  const texto = "¡Hola Rosario F Kits! Quería hacerles una consulta.";
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

/**
 * Consulta con un cupon de la ruleta.
 *
 * El codigo va en el mensaje porque es el unico comprobante que existe: no se
 * guarda en ningun lado, la firma que lleva adentro alcanza para validarlo en
 * /cupon/CODIGO.
 */
export function linkWhatsAppCupon(codigo: string, frase: string): string {
  const texto = `¡Hola Rosario F Kits! Giré la ruleta y me salió ${frase}. Mi cupón es ${codigo}.`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

export const precio = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
