import type { CategoriaReal, Producto } from "./types";
import { pesoTalle } from "./types";

/**
 * La Mystery Box: una camiseta sorpresa. El cliente elige versión, tipo, talle y
 * qué prefiere o no quiere; qué camiseta le toca lo elige Facu a mano desde
 * /admin/mystery-box. Se vende como un producto más: entra al carrito al lado de
 * las camisetas y se paga igual (transferencia con comprobante o WhatsApp).
 *
 * Decisiones de Facu (17/11/2026): Fan $35.000, Player $45.000, la retro va
 * siempre como Player.
 */

export const BOX = {
  nombre: "Mystery Box",
  ruta: "/mystery-box",
  /** portada propia; con versión en el nombre porque next/image cachea por URL */
  foto: "/mystery-box/portada-v1.png",
  /** la camiseta con el signo, sin textos: para el bloque de la portada, que ya tiene título */
  icono: "/mystery-box/icono-v1.png",
} as const;

export type VersionBox = "fan" | "player";
export type TipoBox = "cualquiera" | "club" | "seleccion" | "retro";

export const PRECIO_BOX: Record<VersionBox, number> = { fan: 35000, player: 45000 };

export const VERSIONES_BOX: { id: VersionBox; nombre: string; detalle: string }[] = [
  { id: "fan", nombre: "Fan", detalle: "Calce suelto, como la de la tribuna" },
  { id: "player", nombre: "Player", detalle: "Calce al cuerpo, la de los jugadores" },
];

export const TIPOS_BOX: { id: TipoBox; nombre: string }[] = [
  { id: "cualquiera", nombre: "Me da igual" },
  { id: "club", nombre: "Club" },
  { id: "seleccion", nombre: "Selección" },
  { id: "retro", nombre: "Retro" },
];

const CATEGORIA_DE: Record<Exclude<TipoBox, "cualquiera">, CategoriaReal> = {
  club: "Clubes",
  seleccion: "Selecciones",
  retro: "Retro",
};

/** Lo que el cliente pidió. Viaja en el carrito y llega así a /api/pedido. */
export interface PedidoBox {
  version: VersionBox;
  tipo: TipoBox;
  talle: string;
  /** equipo o liga que le gustaría; es una preferencia, no una garantía */
  preferencia: string;
  /** equipos que no quiere */
  excluir: string;
}

/** Los textos libres: cortos y sin saltos de línea, que van al mensaje de WhatsApp y al panel. */
export const TOPE_TEXTO = 60;
export const limpiarTexto = (s: unknown) =>
  String(s ?? "").replace(/\s+/g, " ").trim().slice(0, TOPE_TEXTO);

/** La retro va siempre como Player: así lo decidió Facu. */
export const versionEfectiva = (b: Pick<PedidoBox, "version" | "tipo">): VersionBox =>
  b.tipo === "retro" ? "player" : b.version;

export const precioBox = (b: Pick<PedidoBox, "version" | "tipo">) => PRECIO_BOX[versionEfectiva(b)];

/** ¿Este modelo puede salir en una box de este tipo? Los shorts nunca. */
export function entraEnBox(p: Pick<Producto, "categoria">, tipo: TipoBox): boolean {
  if (p.categoria === "Shorts") return false;
  return tipo === "cualquiera" || p.categoria === CATEGORIA_DE[tipo];
}

/**
 * Los talles que se pueden ofrecer para un tipo: los que tienen al menos una
 * camiseta en mano. Así nadie paga una box que no se puede cumplir.
 */
export function tallesBox(productos: Producto[], tipo: TipoBox): string[] {
  const talles = new Set<string>();
  for (const p of productos) {
    if (!entraEnBox(p, tipo)) continue;
    for (const v of p.variantes) if (v.disponible > 0 && v.talle !== "ÚNICO") talles.add(v.talle);
  }
  return [...talles].sort((a, b) => pesoTalle(a) - pesoTalle(b));
}

/** "Fan · Club · talle M" */
export function describirBox(b: PedidoBox): string {
  const version = versionEfectiva(b) === "player" ? "Player" : "Fan";
  const tipo = TIPOS_BOX.find((t) => t.id === b.tipo)?.nombre ?? "";
  return [version, b.tipo === "cualquiera" ? "cualquier tipo" : tipo, `talle ${b.talle}`].join(" · ");
}

/** "Prefiere: Premier · No quiere: River" (vacío si no puso nada) */
export function requisitosBox(b: PedidoBox): string {
  return [b.preferencia && `Prefiere: ${b.preferencia}`, b.excluir && `No quiere: ${b.excluir}`]
    .filter(Boolean)
    .join(" · ");
}

/**
 * La clave de la box en el carrito. Dos boxes con lo mismo pedido son la misma
 * línea (se suma la cantidad); si cambia algo, es otra.
 */
export function claveBox(b: PedidoBox): string {
  const texto = [versionEfectiva(b), b.tipo, b.talle, b.preferencia.toLowerCase(), b.excluir.toLowerCase()].join("|");
  let h = 0;
  for (const c of texto) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return `box-${(h >>> 0).toString(36)}`;
}

export const esClaveBox = (sku: string) => sku.startsWith("box-");

/** Cuántas boxes iguales en una línea del carrito. */
export const MAX_BOX_POR_LINEA = 3;

/**
 * Lo que manda el navegador, leído con desconfianza: cualquier cosa que no sea
 * una de las opciones vuelve null.
 */
export function leerPedidoBox(x: unknown): PedidoBox | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const version = o.version === "fan" || o.version === "player" ? o.version : null;
  const tipo = TIPOS_BOX.some((t) => t.id === o.tipo) ? (o.tipo as TipoBox) : null;
  const talle = String(o.talle ?? "").trim().toUpperCase();
  if (!version || !tipo || !/^[A-Z0-9]{1,5}$/.test(talle)) return null;
  return {
    version: versionEfectiva({ version, tipo }),
    tipo,
    talle,
    preferencia: limpiarTexto(o.preferencia),
    excluir: limpiarTexto(o.excluir),
  };
}
