import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import type { CategoriaReal, Producto, Variante } from "./types";

/** Marcas de acento, para comparar "japon" con "Japón". */
const SIN_TILDES = new RegExp("[" + "\u0300-\u036f" + "]", "g");

/**
 * Hoja "Web" del libro Stock_RosarioFkits, publicada como CSV.
 * Columnas: SKU | Producto / Descripcion | Categoria | Precio Venta ($) | Disponible
 * Solo trae filas con Disponible > 0 y nunca costo ni margen.
 */
const CSV_URL = process.env.SHEET_CSV_URL ?? "";

/** Cada cuantos segundos Next revalida el catalogo en segundo plano. */
export const REVALIDATE = 60;

// ---------------------------------------------------------------- utilidades

/** Parser CSV estilo RFC 4180: respeta comillas y comas dentro del texto. */
function parseCSV(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;

  const t = texto.replace(/\r\n?/g, "\n");

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (enComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"';
          i++;
        } else enComillas = false;
      } else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((x) => x.trim() !== ""));
}

/**
 * "$52.500" -> 52500. El Sheet viene con formato argentino:
 * el punto es separador de miles y la coma, decimal.
 */
function parsePrecio(v: string): number {
  const s = String(v ?? "").replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  const coma = s.lastIndexOf(",");
  const punto = s.lastIndexOf(".");
  const sep = Math.max(coma, punto);
  let limpio = s;
  if (sep > -1) {
    const decimales = s.length - sep - 1;
    limpio =
      decimales === 1 || decimales === 2
        ? s.slice(0, sep).replace(/[.,]/g, "") + "." + s.slice(sep + 1)
        : s.replace(/[.,]/g, "");
  }
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : 0;
}

/** "Camiseta Boca 25/26 - Talle XL" -> { modelo, talle } */
function partirNombre(nombre: string): { modelo: string; talle: string } {
  const m = /^(.*?)\s*[-–]\s*Talles?\s+(.+?)\s*$/i.exec(nombre ?? "");
  if (m) return { modelo: m[1].trim(), talle: m[2].trim().toUpperCase() };
  return { modelo: (nombre ?? "").trim(), talle: "ÚNICO" };
}

const SELECCIONES = [
  "argentina", "brasil", "uruguay", "colombia", "chile", "mexico", "méxico",
  "alemania", "francia", "inglaterra", "españa", "espana", "italia", "portugal",
  "croacia", "canada", "canadá", "gales", "japon", "japón", "holanda",
  "paises bajos", "países bajos", "belgica", "bélgica", "marruecos",
  "estados unidos", "usa", "polonia", "suiza", "dinamarca", "nigeria", "senegal",
];

/**
 * El Sheet solo distingue Camiseta / Short, asi que la categoria fina
 * se deduce del nombre. Si sumas selecciones nuevas, van a esta lista.
 */
function clasificar(modelo: string, categoriaSheet: string): CategoriaReal {
  if (/short/i.test(categoriaSheet) || /^short/i.test(modelo)) return "Shorts";

  const n = modelo
    .toLowerCase()
    .normalize("NFD")
    .replace(SIN_TILDES, "");

  if (/\bretro\b|aniversario|\b(19|20[01])\d\b/.test(n)) return "Retro";
  if (SELECCIONES.some((s) => n.includes(s))) return "Selecciones";
  return "Clubes";
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(SIN_TILDES, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const ORDEN_TALLE = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "ÚNICO"];
const pesoTalle = (t: string) => {
  const i = ORDEN_TALLE.indexOf(t);
  return i === -1 ? 99 : i;
};

/**
 * Busca las fotos en /public/fotos. Convención de nombres:
 *
 *   3020.jpg      la principal
 *   3020-2.jpg    la segunda, 3020-3.jpg la tercera, y así
 *
 * Se resuelve en el servidor, en build o al revalidar, así que el cliente
 * nunca pide una imagen que no existe. Para sumar fotos alcanza con dejar
 * el archivo en la carpeta: no hay que tocar código ni el Sheet.
 */
const EXTENSIONES = [".jpg", ".webp", ".png"];
const MAX_FOTOS_POR_SKU = 8;

function buscarFotos(skus: string[]): string[] {
  const base = path.join(process.cwd(), "public", "fotos");
  const encontradas: string[] = [];

  for (const sku of skus) {
    for (let i = 1; i <= MAX_FOTOS_POR_SKU; i++) {
      const nombre = i === 1 ? sku : `${sku}-${i}`;
      const ext = EXTENSIONES.find((e) => existsSync(path.join(base, nombre + e)));
      if (!ext) {
        if (i === 1) break; // sin principal, tampoco hay secundarias
        continue;
      }
      const ruta = `/fotos/${nombre}${ext}`;
      if (!encontradas.includes(ruta)) encontradas.push(ruta);
    }
  }
  return encontradas;
}

// ------------------------------------------------------------------ el fetch

/**
 * Trae el catalogo agrupado por modelo.
 *
 * ISR: `next.revalidate` hace que Next sirva la copia cacheada al instante y
 * refresque en segundo plano. Ninguna visita espera a Google.
 */
export async function getCatalogo(): Promise<Producto[]> {
  if (!CSV_URL) {
    throw new Error(
      "Falta SHEET_CSV_URL en .env.local — es el link CSV publicado de la hoja Web."
    );
  }

  const res = await fetch(CSV_URL, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`El Sheet respondio ${res.status}`);

  const filas = parseCSV(await res.text()).slice(1); // fuera el encabezado

  const porModelo = new Map<
    string,
    { nombre: string; categoria: CategoriaReal; precio: number; variantes: Variante[] }
  >();

  for (const f of filas) {
    const sku = (f[0] ?? "").trim();
    if (!/^\d+$/.test(sku)) continue; // filas de seccion del Sheet

    const disponible = Math.trunc(parsePrecio(f[4] ?? "0"));
    if (disponible <= 0) continue;

    const { modelo, talle } = partirNombre(f[1] ?? "");
    const categoria = clasificar(modelo, f[2] ?? "");
    const precio = parsePrecio(f[3] ?? "0");
    const clave = `${categoria}::${modelo.toLowerCase()}`;

    const actual = porModelo.get(clave);
    if (actual) {
      if (precio > 0 && (actual.precio === 0 || precio < actual.precio)) actual.precio = precio;
      actual.variantes.push({ sku, talle, disponible });
    } else {
      porModelo.set(clave, {
        nombre: modelo,
        categoria,
        precio,
        variantes: [{ sku, talle, disponible }],
      });
    }
  }

  return [...porModelo.values()]
    .map((m) => {
      const variantes = m.variantes.sort((a, b) => pesoTalle(a.talle) - pesoTalle(b.talle));
      const fotos = buscarFotos(variantes.map((v) => v.sku));
      return {
        id: slug(`${m.nombre}-${m.categoria}`),
        nombre: m.nombre,
        categoria: m.categoria,
        precio: m.precio,
        total: variantes.reduce((s, v) => s + v.disponible, 0),
        variantes,
        foto: fotos[0] ?? null,
        fotos,
      } satisfies Producto;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Un producto por su slug, para la página de detalle. */
export async function getProducto(id: string): Promise<Producto | null> {
  const todos = await getCatalogo();
  return todos.find((p) => p.id === id) ?? null;
}

/** Otros modelos de la misma categoría, para el bloque "también tenemos". */
export async function getRelacionados(producto: Producto, cuantos = 5): Promise<Producto[]> {
  const todos = await getCatalogo();
  return todos
    .filter((p) => p.id !== producto.id && p.categoria === producto.categoria)
    .slice(0, cuantos);
}
