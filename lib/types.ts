export const CATEGORIAS = ["Todas", "Clubes", "Selecciones", "Retro", "Shorts"] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export type CategoriaReal = Exclude<Categoria, "Todas">;

/** Una fila del Sheet: un SKU es siempre un producto + un talle. */
export interface Variante {
  sku: string;
  talle: string;
  /** unidades en mano; 0 si ese talle se agotó */
  disponible: number;
}

/** Un modelo agrupado, con todos sus talles. */
export interface Producto {
  /** slug estable, sirve como key y como URL de detalle */
  id: string;
  nombre: string;
  categoria: CategoriaReal;
  precio: number;
  /** suma de unidades de todos los talles; 0 = agotado */
  total: number;
  /**
   * Todos los talles del modelo, incluidos los que están en 0. Se guardan
   * los agotados para poder mostrar de qué talles hubo: es la información
   * que necesita alguien que quiere pedirlo por encargue.
   */
  variantes: Variante[];
  /** primera foto, o null si todavia no hay ninguna cargada */
  foto: string | null;
  /** todas las fotos del modelo, en orden */
  fotos: string[];
}

/** Los talles que se pueden comprar hoy. */
export const conStock = (v: Variante) => v.disponible > 0;

/** Orden de talles para mostrar. Vive acá porque lo usan servidor y cliente. */
export const ORDEN_TALLE = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "ÚNICO"];

export const pesoTalle = (t: string) => {
  const i = ORDEN_TALLE.indexOf(t);
  return i === -1 ? 99 : i;
};
