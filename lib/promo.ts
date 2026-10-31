import type { CategoriaReal } from "./types";

/**
 * Las reglas de las promos, en un solo lugar. Las usan el banner del catálogo
 * (que la anuncia) y el carrito (que la calcula): si vivieran separadas, el día
 * que cambie una el carrito cobraría distinto de lo que dice el banner.
 */

/** Fin del Hot Sale: 1/11/2026 a las 00:00 de Argentina (UTC−3). */
export const HOT_SALE_HASTA = Date.parse("2026-11-01T00:00:00-03:00");

export const enHotSale = (ahora = Date.now()) => ahora < HOT_SALE_HASTA;

/** 2 camisetas a elección por este total. */
export const PROMO_PAR = 100000;

/** Desde este precio entra una camiseta: la versión jugador. Ver PromoBanner. */
export const PROMO_DESDE = 52500;

/**
 * Si una unidad entra en la promo 2x$100.000: camiseta (no short), versión
 * jugador, sin rebaja ("No suma con las rebajadas"). Durante el Hot Sale no
 * entra nada: no son acumulables.
 */
export function entraEnPromo(
  item: { categoria: CategoriaReal; precio: number; precioAntes: number | null },
  ahora = Date.now()
): boolean {
  if (enHotSale(ahora)) return false;
  return item.categoria !== "Shorts" && item.precio >= PROMO_DESDE && item.precioAntes === null;
}

export interface Totales {
  /** suma a precio de lista */
  lista: number;
  /** lo que se paga, con la promo aplicada */
  total: number;
  /** cuántos pares de la promo se armaron */
  pares: number;
  /** lista − total */
  ahorro: number;
}

/**
 * Arma los pares de la promo con las unidades que entran, de la más cara a la
 * más barata: así el ahorro es el mayor posible. Si queda una suelta, va a
 * precio de lista.
 */
export function calcularTotales(
  items: { categoria: CategoriaReal; precio: number; precioAntes: number | null; cantidad: number }[],
  ahora = Date.now()
): Totales {
  const lista = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const unidades = items
    .filter((i) => entraEnPromo(i, ahora))
    .flatMap((i) => Array<number>(i.cantidad).fill(i.precio))
    .sort((a, b) => b - a);

  const pares = Math.floor(unidades.length / 2);
  const enPares = unidades.slice(0, pares * 2).reduce((s, p) => s + p, 0);
  const ahorro = enPares - pares * PROMO_PAR;

  return { lista, total: lista - ahorro, pares, ahorro };
}
