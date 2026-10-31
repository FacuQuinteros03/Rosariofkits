/**
 * El stock de hoy para los SKU del carrito.
 *
 *   GET /api/stock?skus=6012,7003  ->  { "6012": { disponible, precio, precioAntes }, ... }
 *
 * El carrito lo pide al abrirse: entre que alguien agrega una camiseta y manda
 * el pedido pueden pasar horas, y con una unidad por talle es fácil que otro la
 * haya comprado. Sale del mismo catálogo que la web (la base del ERP, con la
 * copia de un minuto), así que una venta cargada en /admin se ve acá enseguida.
 *
 * Solo devuelve lo que ya está publicado en la web: disponible y precio.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCatalogo } from "@/lib/sheets";

/** La respuesta depende de los SKU pedidos; el catálogo de abajo ya va cacheado. */
export const dynamic = "force-dynamic";

/** Un carrito real no pasa de unos pocos SKU: más que esto es otra cosa. */
const MAXIMO = 40;

export async function GET(request: NextRequest) {
  const pedidos = (request.nextUrl.searchParams.get("skus") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{1,6}$/.test(s))
    .slice(0, MAXIMO);

  if (pedidos.length === 0) return NextResponse.json({});

  const buscados = new Set(pedidos);
  const resultado: Record<string, { disponible: number; precio: number; precioAntes: number | null }> = {};

  for (const p of await getCatalogo()) {
    for (const v of p.variantes) {
      if (buscados.has(v.sku)) {
        resultado[v.sku] = { disponible: v.disponible, precio: p.precio, precioAntes: p.precioAntes };
      }
    }
  }

  return NextResponse.json(resultado, { headers: { "Cache-Control": "no-store" } });
}
