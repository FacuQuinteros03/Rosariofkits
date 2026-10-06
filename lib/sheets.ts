import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { pesoTalle, type CategoriaReal, type Producto, type Variante } from "./types";

/** Marcas de acento, para comparar "japon" con "Japón". */
const SIN_TILDES = new RegExp("[" + "\u0300-\u036f" + "]", "g");

/**
 * Hoja "WEB" del libro Stock_RosarioFkits, publicada como CSV.
 * Columnas: SKU | Producto / Descripcion | Categoria | Precio Venta ($) | Disponible
 * y, opcionales, Estado_Pub y Nuevo. Nunca trae costo ni margen.
 *
 * Las cinco primeras se leen por posicion; las opcionales, por el nombre del
 * encabezado. Asi se puede agregar una columna al QUERY de la hoja sin que
 * otra cambie de significado: con "Nuevo" en la sexta posicion, leerla por
 * indice la confundia con Estado_Pub y sacaba esos productos del catalogo.
 *
 * La hoja tiene que incluir tambien las filas con Disponible = 0: de ahi salen
 * los modelos agotados que el catalogo muestra para pedir por encargue.
 */
const CSV_URL = process.env.SHEET_CSV_URL ?? "";

/**
 * Que filas entran al catalogo principal.
 *
 * El libro trae todo junto: lo que esta en mano y las 154 unidades del pedido
 * a China, que son preventa y llegan alrededor de diciembre. Sin este filtro
 * el catalogo las ofreceria hoy como stock disponible.
 *
 * Cuando la columna no viene, se asume "Stock". El libro viejo publicaba solo
 * cinco columnas, asi que el catalogo sigue andando contra cualquiera de los
 * dos — importa para no quedarse sin web entre que se cambia el CSV y que se
 * publica la hoja nueva.
 */
const ESTADO_PUBLICABLE = "stock";

/** Donde esta cada columna opcional; -1 si la hoja no la publica. */
interface Columnas {
  estado: number;
  nuevo: number;
}

function ubicarColumnas(encabezado: string[]): Columnas {
  const nombres = encabezado.map((h) => h.trim().toLowerCase());
  return { estado: nombres.indexOf("estado_pub"), nuevo: nombres.indexOf("nuevo") };
}

function estadoPub(fila: string[], col: Columnas): string {
  const v = col.estado === -1 ? "" : (fila[col.estado] ?? "").trim().toLowerCase();
  return v === "" ? ESTADO_PUBLICABLE : v;
}

/**
 * "Recién llegadas" se marca a mano en la columna Nuevo: si, x, 1.
 * A mano y no por SKU o por fecha porque lo nuevo es lo que Facu quiere
 * mostrar, no lo ultimo que se cargo: un talle repuesto no es una novedad.
 */
function esNuevo(fila: string[], col: Columnas): boolean {
  if (col.nuevo === -1) return false;
  const v = (fila[col.nuevo] ?? "").trim().toLowerCase();
  return /^(si|sí|x|1|true|nuevo|nueva)$/.test(v);
}

/** Cada cuantos segundos Next revalida el catalogo en segundo plano. */
export const REVALIDATE = 60;

// ---------------------------------------------------------------- utilidades

/** Parser CSV estilo RFC 4180: respeta comillas y comas dentro del texto. */
export function parseCSV(texto: string): string[][] {
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
export function parsePrecio(v: string): number {
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

/**
 * Palabras donde termina el nombre del equipo: la temporada, el tipo de
 * camiseta, la version. "Boca Juniors 26/27' Entrenamiento" -> "Boca Juniors".
 */
const FIN_DE_EQUIPO =
  /^(\d|\(|home|away|supl|suplente|titular|alternativa|tercera|3ra|entrenamiento|retro|fan|player|jugador|edicion|edición|casual|manga|arquero|celeste|negra|negro|blanca|blanco|verde|azul|amarilla|roja)/i;

/** Nombres de la hoja que se muestran distinto, sin tilde -> como se ve. */
const NOMBRE_EQUIPO: Record<string, string> = {
  "boca juniors": "Boca",
  "river plate": "River",
  "olympique de marsella": "Marsella",
  "manchester city": "Man City",
  "manchester united": "Man United",
  "inter de milan": "Inter",
  canada: "Canadá",
  japon: "Japón",
  mexico: "México",
  "l.a galaxy": "LA Galaxy",
};

/** Lo que no es un club ni una seleccion: no lleva boton en "Encontrá tu equipo". */
const NO_SON_EQUIPOS = ["oasis"];

/**
 * El equipo, deducido del nombre como la categoria: el Sheet no lo trae.
 * Es todo lo que viene antes de la temporada o del tipo de camiseta.
 */
export function equipoDe(modelo: string): string | null {
  const palabras = modelo.replace(/^(camiseta|short)\s+/i, "").split(/\s+/);
  const corte = palabras.findIndex((p) => FIN_DE_EQUIPO.test(p));
  const nombre = palabras.slice(0, corte === -1 ? undefined : corte).join(" ").trim();
  if (!nombre) return null;

  const clave = nombre.toLowerCase().normalize("NFD").replace(SIN_TILDES, "");
  if (NO_SON_EQUIPOS.includes(clave)) return null;
  return NOMBRE_EQUIPO[clave] ?? nombre;
}

/**
 * El escudo del equipo, si Facu dejo uno en /public/escudos con el nombre del
 * equipo en minusculas y con guiones: boca.png, real-madrid.png, man-city.webp.
 * Es opt-in a proposito: los escudos son marcas registradas de cada club, y
 * cual se muestra es una decision suya, no del codigo. El equipo sin escudo
 * sigue saliendo con la foto de su camiseta.
 */
const EXTENSIONES_ESCUDO = [".png", ".webp", ".svg"];

function buscarEscudo(equipo: string | null): string | null {
  if (!equipo) return null;
  const base = path.join(process.cwd(), "public", "escudos");
  const nombre = slug(equipo);
  const ext = EXTENSIONES_ESCUDO.find((e) => existsSync(path.join(base, nombre + e)));
  return ext ? `/escudos/${nombre}${ext}` : null;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(SIN_TILDES, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

  const [encabezado = [], ...filas] = parseCSV(await res.text());
  const col = ubicarColumnas(encabezado);

  const porModelo = new Map<
    string,
    {
      nombre: string;
      categoria: CategoriaReal;
      precio: number;
      nuevo: boolean;
      variantes: Variante[];
    }
  >();

  for (const f of filas) {
    const sku = (f[0] ?? "").trim();
    if (!/^\d+$/.test(sku)) continue; // filas de seccion del Sheet
    if (estadoPub(f, col) !== ESTADO_PUBLICABLE) continue; // preventa y archivado, afuera

    // Los agotados entran igual. Ver el filtro de mas abajo: quedan solo los
    // que tienen foto, porque un agotado sin foto no le dice nada a nadie.
    const disponible = Math.max(0, Math.trunc(parsePrecio(f[4] ?? "0")));

    const { modelo, talle } = partirNombre(f[1] ?? "");
    const categoria = clasificar(modelo, f[2] ?? "");
    const precio = parsePrecio(f[3] ?? "0");
    const nuevo = esNuevo(f, col);
    const clave = `${categoria}::${modelo.toLowerCase()}`;

    const actual = porModelo.get(clave);
    if (actual) {
      if (precio > 0 && (actual.precio === 0 || precio < actual.precio)) actual.precio = precio;
      // con un talle marcado alcanza: el modelo es nuevo
      actual.nuevo ||= nuevo;
      actual.variantes.push({ sku, talle, disponible });
    } else {
      porModelo.set(clave, {
        nombre: modelo,
        categoria,
        precio,
        nuevo,
        variantes: [{ sku, talle, disponible }],
      });
    }
  }

  return [...porModelo.values()]
    .map((m) => {
      const variantes = m.variantes.sort((a, b) => pesoTalle(a.talle) - pesoTalle(b.talle));
      const fotos = buscarFotos(variantes.map((v) => v.sku));
      const equipo = equipoDe(m.nombre);
      return {
        id: slug(`${m.nombre}-${m.categoria}`),
        nombre: m.nombre,
        categoria: m.categoria,
        equipo,
        escudo: buscarEscudo(equipo),
        nuevo: m.nuevo,
        precio: m.precio,
        total: variantes.reduce((s, v) => s + v.disponible, 0),
        variantes,
        foto: fotos[0] ?? null,
        fotos,
      } satisfies Producto;
    })
    /*
      Un agotado sin foto es ruido: ocupa una tarjeta y no muestra nada. Los
      que tienen foto si valen, porque son la prueba de que ese modelo se
      vende y son la puerta de entrada al pedido por encargue.
    */
    .filter((p) => p.total > 0 || p.fotos.length > 0)
    /* primero lo que se puede comprar hoy; los agotados al final, alfabeticos */
    .sort(
      (a, b) =>
        Number(b.total > 0) - Number(a.total > 0) ||
        a.nombre.localeCompare(b.nombre, "es")
    );
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
