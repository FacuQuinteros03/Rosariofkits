export const CATEGORIAS = ["Todas", "Clubes", "Selecciones", "Retro", "Shorts"] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export type CategoriaReal = Exclude<Categoria, "Todas">;

/** Una fila del Sheet: un SKU es siempre un producto + un talle concreto. */
export interface Variante {
  sku: string;
  talle: string;
  disponible: number;
}

/** Un modelo agrupado, con todos sus talles disponibles. */
export interface Producto {
  /** slug estable, sirve como key y como futura URL de detalle */
  id: string;
  nombre: string;
  categoria: CategoriaReal;
  precio: number;
  /** suma de unidades de todos los talles */
  total: number;
  variantes: Variante[];
  /** primera foto, o null si todavia no hay ninguna cargada */
  foto: string | null;
  /** todas las fotos del modelo, en orden */
  fotos: string[];
}
