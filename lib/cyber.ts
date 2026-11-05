import type { CategoriaReal } from "./types";

/**
 * Cyber Monday de Rosario F Kits, desde el miércoles 4 a la noche hasta el
 * domingo 8 de noviembre de 2026.
 *
 *   - Todas las camisetas a $45.000.
 *   - Las "clavo" (las que llevan mucho en el estante) a $40.000.
 *   - Afuera: las del último pedido a Gonza (SKU 7000–7999: Arsenal Terrace
 *     Icons, Boca y River Retro 1996). Siguen a su precio.
 *   - Afuera también los shorts: la promo es de camisetas.
 *
 * **El precio de la base no se toca.** El descuento se aplica acá, al armar el
 * catálogo, y se prende y se apaga solo con las fechas: el lunes 9 a las 00:00
 * todo vuelve a su precio sin que nadie tenga que acordarse de revertir nada
 * (en el Hot Sale hubo que cambiar los precios a mano en el libro, y otra vez
 * a mano para volverlos).
 *
 * El formulario de venta de /admin también lo usa: al agregar una camiseta
 * propone el precio del Cyber con el motivo "Cyber Monday" ya escrito.
 *
 * Sin "server-only": lo usan también el banner y el carrito, en el navegador.
 */

/** Arranca apenas se publica: miércoles 4/11/2026, 20:00 de Argentina (UTC−3). */
export const CYBER_DESDE = Date.parse("2026-11-04T20:00:00-03:00");
/** Termina el lunes 9/11/2026 a las 00:00: el domingo 8 es el último día. */
export const CYBER_HASTA = Date.parse("2026-11-09T00:00:00-03:00");

/** Cómo se dice el cierre en los carteles. */
export const CYBER_CIERRE = "el domingo 8 de noviembre";
export const CYBER_CIERRE_CORTO = "domingo 8/11";

export const CYBER_PRECIO = 45000;
export const CYBER_PRECIO_CLAVO = 40000;

/**
 * Las clavo (van a $40.000), según Facu el 4/11:
 *
 *   1. todo el pedido de 10 Córdoba (Diez Store), la serie 6000, menos el
 *      Manchester United y las de Oasis, que quedan a $45.000;
 *   2. toda camiseta con dorsal: el estampado viaja en el nombre entre
 *      paréntesis, "Real Madrid 25/26 (Mbappé 10)", y siempre lleva número;
 *   3. por las dudas, los tres que nombró: Lamine Yamal, Garnacho y Mbappé;
 *   4. cualquier SKU que se sume a mano en CLAVOS.
 *
 * Por reglas y no por lista porque así entran todos los talles sin cargarlos
 * uno por uno, y el formulario de /admin (que mira talle por talle) decide igual.
 */
export const CLAVOS: ReadonlySet<string> = new Set<string>([
  // "2130",  // ejemplo: así se suma una a mano
]);

/** El pedido de 10 Córdoba (Diez Store): SKU de la serie 6000. */
const esDelPedidoDiez = (sku: string) => {
  const n = Number(sku);
  return n >= 6000 && n < 7000;
};

/** Del pedido de Diez, estas no son clavo: van a $45.000 como el resto. */
const NO_CLAVO_DE_DIEZ = /manchester united|man\.? united|oasis/i;

/** Un paréntesis con un número adentro es un estampado: "(Mbappé 10)", "(N 24)". */
const CON_DORSAL = /\([^)]*\d[^)]*\)/;

const NOMBRADAS = /lamine|yamal|garnacho|mbapp/i;

export function esClavo(nombre: string, skus: string[]): boolean {
  if (skus.some((s) => CLAVOS.has(s))) return true;
  if (CON_DORSAL.test(nombre) || NOMBRADAS.test(nombre)) return true;
  return skus.some(esDelPedidoDiez) && !NO_CLAVO_DE_DIEZ.test(nombre);
}

/** El último pedido (a Gonza): SKU de la serie 7000. No entra en el Cyber. */
export const esDelUltimoPedido = (sku: string) => {
  const n = Number(sku);
  return n >= 7000 && n < 8000;
};

export const enCyber = (ahora = Date.now()) =>
  ahora >= CYBER_DESDE && ahora < CYBER_HASTA;

/** "camiseta" = a $45.000; "clavo" = a $40.000. */
export type TipoCyber = "camiseta" | "clavo";

/**
 * El precio de un modelo durante el Cyber, o null si no entra.
 *
 * Nunca sube un precio: una camiseta que ya estaba por debajo (una versión
 * hincha, una rebajada) se queda como está. El tachado es el precio al que
 * estaba publicada —uno que de verdad se cobró—, o el tachado que ya tenía.
 */
export function aplicarCyber(
  m: {
    categoria: CategoriaReal;
    precio: number;
    precioAntes: number | null;
    skus: string[];
    nombre: string;
  },
  ahora = Date.now(),
): { precio: number; precioAntes: number; cyber: TipoCyber } | null {
  if (!enCyber(ahora)) return null;
  if (m.categoria === "Shorts") return null;
  if (m.skus.some(esDelUltimoPedido)) return null;

  const cyber: TipoCyber = esClavo(m.nombre, m.skus) ? "clavo" : "camiseta";
  const nuevo = cyber === "clavo" ? CYBER_PRECIO_CLAVO : CYBER_PRECIO;
  if (!(m.precio > nuevo)) return null;

  return {
    precio: nuevo,
    precioAntes: Math.max(m.precioAntes ?? 0, m.precio),
    cyber,
  };
}
