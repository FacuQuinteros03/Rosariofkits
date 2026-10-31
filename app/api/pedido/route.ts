/**
 * Pedido pagado por transferencia, desde el carrito.
 *
 *   POST multipart:  nombre, telefono, items (JSON [{sku, cantidad}]), total,
 *                    comprobante (imagen o PDF)
 *        ->  { venta: "V-0040", total }
 *
 * El comprobante es lo que reserva: sin archivo no hay pedido. La venta entra al
 * ERP como Reservada, canal Web y sin cobrar, así sus unidades dejan de figurar
 * disponibles en la web al instante. Pasa a cobrada recién cuando Facu ve la
 * plata en el banco y toca "Cobrar" en /admin; si el comprobante es falso, la
 * revierte y el stock vuelve.
 *
 * Nada de lo que manda el navegador decide plata: los precios salen del
 * catálogo y la promo se calcula acá. El `total` que manda es solo para avisar
 * si cambió algo entre que lo vio y que pagó.
 */

import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getCatalogo, TAG_CATALOGO } from "@/lib/sheets";
import { calcularTotales, repartirPromo } from "@/lib/promo";
import { BUCKET_COMPROBANTES, supabaseServicio } from "@/lib/supabase/servicio";
import { pagoTransferenciaActivo } from "@/lib/transferencia";
import { normalizarTelefono } from "@/lib/telefono";
import { precio } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Una foto de celular pesa 2-4 MB; un PDF de home banking, menos de 1. */
const MAX_BYTES = 8 * 1024 * 1024;
const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};
/** Un pedido de verdad son unas pocas camisetas: más que esto se arregla por WhatsApp. */
const MAX_UNIDADES = 10;
/**
 * Pedidos web sin verificar por teléfono. Cada comprobante falso bloquea stock
 * hasta que Facu lo revierte, así que uno a la vez alcanza para el que paga de
 * verdad y le pone techo al que quiere molestar.
 */
const MAX_PENDIENTES = 1;

const error = (mensaje: string, status = 400) => NextResponse.json({ error: mensaje }, { status });

/** "Sin stock: Camiseta Boca talle L (SKU 6012) quedaría con -1 disponibles" -> lo que importa. */
function explicarErrorBase(mensaje: string): string {
  if (/sin stock/i.test(mensaje)) {
    return "Una de las camisetas se vendió recién, mientras pagabas. Escribinos por WhatsApp con tu comprobante y lo resolvemos: te devolvemos la plata o la cambiás por otra.";
  }
  return "No pudimos registrar el pedido. Escribinos por WhatsApp con tu comprobante y lo cargamos a mano.";
}

export async function POST(request: NextRequest) {
  const supabase = supabaseServicio();
  if (!supabase || !pagoTransferenciaActivo()) return error("El pago por transferencia no está disponible.", 503);

  let datos: FormData;
  try {
    datos = await request.formData();
  } catch {
    return error("No llegó el formulario.");
  }

  // Campo trampa: invisible para una persona, los bots lo llenan.
  if (String(datos.get("web") ?? "").trim()) return error("No se pudo enviar.");

  const nombre = String(datos.get("nombre") ?? "").trim().slice(0, 80);
  const telefono = normalizarTelefono(String(datos.get("telefono") ?? ""));
  if (nombre.length < 2) return error("Falta tu nombre.");
  if (!telefono) return error("Revisá el WhatsApp: tiene que ser un celular argentino, con código de área.");

  const archivo = datos.get("comprobante");
  if (!(archivo instanceof File) || archivo.size === 0) return error("Falta el comprobante de la transferencia.");
  if (archivo.size > MAX_BYTES) return error("El comprobante pesa demasiado: mandá una captura o el PDF del banco.");
  const extension = TIPOS[archivo.type];
  if (!extension) return error("El comprobante tiene que ser una imagen (foto o captura) o un PDF.");

  let pedidos: { sku: string; cantidad: number }[];
  try {
    pedidos = JSON.parse(String(datos.get("items") ?? "[]"));
    if (!Array.isArray(pedidos) || pedidos.length === 0) throw new Error();
    pedidos = pedidos.map((p) => ({ sku: String(p.sku), cantidad: Math.trunc(Number(p.cantidad)) }));
    if (pedidos.some((p) => !/^\d{1,6}$/.test(p.sku) || !(p.cantidad >= 1))) throw new Error();
  } catch {
    return error("El pedido llegó mal. Recargá la página y probá de nuevo.");
  }
  if (pedidos.reduce((s, p) => s + p.cantidad, 0) > MAX_UNIDADES) {
    return error(`Para más de ${MAX_UNIDADES} unidades escribinos por WhatsApp.`);
  }

  // Precios y stock del catálogo, no del navegador.
  const porSku = new Map(
    (await getCatalogo()).flatMap((p) => p.variantes.map((v) => [v.sku, { producto: p, variante: v }] as const))
  );
  const items = [];
  for (const p of pedidos) {
    const encontrado = porSku.get(p.sku);
    if (!encontrado || encontrado.variante.disponible < p.cantidad) {
      return error("Una de las camisetas ya no tiene stock. Abrí el pedido de nuevo para actualizarlo.", 409);
    }
    const { producto } = encontrado;
    items.push({ sku: p.sku, categoria: producto.categoria, precio: producto.precio, precioAntes: producto.precioAntes, cantidad: p.cantidad });
  }
  const { total } = calcularTotales(items);
  if (Number(datos.get("total")) !== total) {
    return error(`Cambió el precio de algo del pedido: el total ahora es ${precio(total)}. Revisalo antes de transferir.`, 409);
  }

  // Techo de pedidos sin verificar por teléfono.
  const { data: cliente } = await supabase.from("clientes").select("id").eq("telefono", telefono).maybeSingle();
  if (cliente) {
    const { count } = await supabase
      .from("v_ventas")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", cliente.id)
      .eq("canal", "Web")
      .eq("estado", "Reservada")
      .eq("cobrado", 0);
    if ((count ?? 0) >= MAX_PENDIENTES) {
      return error("Ya tenés un pedido esperando que confirmemos el pago. Escribinos por WhatsApp y lo vemos.", 429);
    }
  }

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const { data: venta, error: errorVenta } = await supabase.rpc("registrar_venta", {
    p_cliente: { nombre, telefono },
    p_items: repartirPromo(items).map((l) => ({
      sku: Number(l.sku),
      cantidad: l.cantidad,
      precio_unit: l.precio_unit,
      promo: l.promo,
    })),
    p_estado: "Reservada",
    p_pago: null,
    p_canal: "Web",
    p_fecha: hoy,
    p_cupon: null,
    p_notas: `Pedido web de ${nombre}: transferencia de ${precio(total)} a verificar. El envío se coordina aparte.`,
  });
  if (errorVenta || typeof venta !== "string") {
    console.error("[pedido] registrar_venta:", errorVenta);
    return error(explicarErrorBase(errorVenta?.message ?? ""), 409);
  }

  const { error: errorArchivo } = await supabase.storage
    .from(BUCKET_COMPROBANTES)
    .upload(`${venta}/comprobante.${extension}`, archivo, { contentType: archivo.type, upsert: false });
  if (errorArchivo) {
    // Sin comprobante guardado no hay pedido: se deshace la reserva.
    console.error("[pedido] comprobante:", errorArchivo);
    await supabase.rpc("revertir_venta", { p_venta: venta, p_motivo: "No se pudo guardar el comprobante del pedido web" });
    return error("No pudimos guardar el comprobante. Probá de nuevo o mandalo por WhatsApp.", 500);
  }

  // La web deja de mostrar esas unidades ya, sin esperar el minuto del catálogo.
  revalidateTag(TAG_CATALOGO, { expire: 0 });

  return NextResponse.json({ venta, total });
}
