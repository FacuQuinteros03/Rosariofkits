/**
 * La ruleta: premios y geometría.
 *
 * Todo lo de este archivo puede viajar al navegador. Las probabilidades, el
 * sorteo y la firma de los cupones viven en `ruleta-server.ts` y no salen del
 * servidor: si los pesos estuvieran acá, cualquiera abre las devtools y ve que
 * el envío gratis sale 3 de cada 100 veces.
 */

export type PremioId = "5" | "10" | "15" | "envio" | "2x1";

export type Premio = {
  id: PremioId;
  /** La sigla que va dentro del código del cupón. */
  sigla: string;
  /** Lo que se dibuja en el gajo, en dos renglones. */
  gajo: [string, string];
  /** El anuncio cuando la rueda frena. */
  titulo: string;
  /** Cómo se nombra el premio dentro del mensaje de WhatsApp. */
  frase: string;
  /** La letra chica, la misma que ve Facu al validar el cupón. */
  detalle: string;
};

export const PREMIOS: readonly Premio[] = [
  {
    id: "5",
    sigla: "5",
    gajo: ["5%", "OFF"],
    titulo: "5% de descuento",
    frase: "un 5% de descuento",
    detalle: "5% sobre el total de tu compra.",
  },
  {
    id: "10",
    sigla: "10",
    gajo: ["10%", "OFF"],
    titulo: "10% de descuento",
    frase: "un 10% de descuento",
    detalle: "10% sobre el total de tu compra.",
  },
  {
    id: "15",
    sigla: "15",
    gajo: ["15%", "OFF"],
    titulo: "15% de descuento",
    frase: "un 15% de descuento",
    detalle: "15% sobre el total de tu compra.",
  },
  {
    id: "2x1",
    sigla: "2X1",
    gajo: ["2x1", "CAMISETAS"],
    titulo: "¡2x1 en camisetas!",
    frase: "el 2x1 en camisetas",
    detalle: "Llevás dos camisetas y pagás una.",
  },
  {
    id: "envio",
    sigla: "ENV",
    gajo: ["ENVÍO", "GRATIS"],
    titulo: "¡Envío gratis!",
    frase: "el envío gratis",
    detalle: "Envío sin cargo a todo el país (Correo Argentino o Andreani).",
  },
] as const;

export function premioPorId(id: string): Premio | undefined {
  return PREMIOS.find((p) => p.id === id);
}

export function premioPorSigla(sigla: string): Premio | undefined {
  return PREMIOS.find((p) => p.sigla === sigla.toUpperCase());
}

/**
 * Los gajos de la rueda, en sentido horario desde arriba.
 *
 * No son los premios: son ocho posiciones. El 5% ocupa cuatro y los premios
 * grandes una sola cada uno, así que la rueda ya insinúa las probabilidades
 * antes de girar. Repetir el premio más probable también evita el efecto feo
 * de una rueda donde la aguja cae siempre en el mismo cuarto.
 */
export const GAJOS: readonly PremioId[] = ["5", "10", "5", "2x1", "5", "15", "5", "envio"];

export const GRADOS_POR_GAJO = 360 / GAJOS.length;

/** Horas que vive un cupón desde que se emite. */
export const VIGENCIA_HORAS = 48;

export type Cupon = {
  codigo: string;
  premio: Premio;
  /** Índice del gajo donde tiene que frenar la aguja. */
  gajo: number;
  /** Epoch en ms. */
  vence: number;
};
