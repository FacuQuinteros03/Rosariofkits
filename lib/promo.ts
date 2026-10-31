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

/** Una línea de venta para el ERP: cuántas unidades de un SKU y a qué precio cada una. */
export interface LineaVenta {
  sku: string;
  cantidad: number;
  precio_unit: number;
  /** "2x100000" en las unidades que entraron en un par; el ERP exige el motivo si cobra menos que la lista */
  promo: string | null;
}

/**
 * Lo mismo que `calcularTotales`, pero unidad por unidad: cada camiseta de un par
 * va a la mitad del par ($50.000) con la promo anotada, el resto a precio de
 * lista. Si de un SKU entró solo una parte en pares, sale en dos líneas.
 */
export function repartirPromo(
  items: { sku: string; categoria: CategoriaReal; precio: number; precioAntes: number | null; cantidad: number }[],
  ahora = Date.now()
): LineaVenta[] {
  const unidades = items
    .filter((i) => entraEnPromo(i, ahora))
    .flatMap((i) => Array.from({ length: i.cantidad }, () => ({ sku: i.sku, precio: i.precio })))
    .sort((a, b) => b.precio - a.precio);
  const enPar = new Map<string, number>();
  for (const u of unidades.slice(0, Math.floor(unidades.length / 2) * 2)) {
    enPar.set(u.sku, (enPar.get(u.sku) ?? 0) + 1);
  }

  const lineas: LineaVenta[] = [];
  for (const i of items) {
    const conPromo = enPar.get(i.sku) ?? 0;
    if (conPromo > 0) lineas.push({ sku: i.sku, cantidad: conPromo, precio_unit: PROMO_PAR / 2, promo: "2x100000" });
    if (i.cantidad > conPromo) lineas.push({ sku: i.sku, cantidad: i.cantidad - conPromo, precio_unit: i.precio, promo: null });
  }
  return lineas;
}
