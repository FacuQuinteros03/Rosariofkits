/**
 * Arma el catalogo con el mismo codigo de la web (getCatalogo) y lo imprime en JSON.
 * Se corre dos veces, una por fuente, y se comparan las salidas:
 *
 *   CATALOGO_FUENTE=sheets   npx tsx herramientas/comparar_catalogo.ts > a.json
 *   CATALOGO_FUENTE=supabase npx tsx herramientas/comparar_catalogo.ts > b.json
 *
 * (lo hace todo herramientas/comparar_catalogo.sh). Tiene que dar cero diferencias
 * antes de prender Supabase en ningun lado.
 */
import Module from "node:module";

// lib/sheets.ts empieza con `import "server-only"`, un paquete que Next resuelve por
// dentro y que fuera de Next no existe. Para este script se resuelve a nada.
const M = Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string };
const resolver = M._resolveFilename;
M._resolveFilename = function (req: string, ...rest: unknown[]) {
  if (req === "server-only") return require.resolve("./sin-server-only.cjs");
  return resolver.call(this, req, ...rest);
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getCatalogo } = require("../lib/sheets") as typeof import("../lib/sheets");
getCatalogo().then((productos) => console.log(JSON.stringify(productos, null, 1)));
