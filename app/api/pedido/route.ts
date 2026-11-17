/**
 * Pedido pagado por transferencia, desde el carrito.
 *
 *   POST multipart:  nombre, telefono, items (JSON [{sku, cantidad} | {box, cantidad}]),
 *                    total, comprobante (imagen o PDF)
 *        ->  { venta: "V-0040", total }   (o "MB-0003" si el pedido era solo de boxes)
 *
 * Las Mystery Box no son venta todavía: quedan en `mystery_boxes` como Pendiente
 * hasta que Facu elige la camiseta en /admin/mystery-box. Ver lib/box.ts.
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
import { LEGAL, LEGALES_PUBLICOS } from "@/lib/legal";
import { esDelPropioSitio, ipDe, superaLimite, tipoPorBytes } from "@/lib/pedidos-web";
import { describirBox, entraEnBox, leerPedidoBox, MAX_BOX_POR_LINEA, precioBox, tallesBox, type PedidoBox } from "@/lib/box";

export const dynamic = "force-dynamic";

/** Una foto de celular pesa 2-4 MB; un PDF de home banking, menos de 1. */
const MAX_BYTES = 8 * 1024 * 1024;
/** Un pedido de verdad son unas pocas camisetas: más que esto se arregla por WhatsApp. */
const MAX_UNIDADES = 10;
/**
 * Pedidos web sin verificar por teléfono. Cada comprobante falso bloquea stock
 * hasta que Facu lo revierte, así que uno a la vez alcanza para el que paga de
 * verdad y le pone techo al que quiere molestar.
 */
const MAX_PENDIENTES = 1;
/**
 * Pedidos web sin verificar en total, de todos los teléfonos. Es el techo que
 * importa contra el que inventa teléfonos para vaciar el stock: llegado a este
 * número, la web deja de reservar hasta que Facu cobre o revierta alguno.
 */
const MAX_PENDIENTES_TOTAL = 12;
/** Intentos por IP: alcanza para equivocarse varias veces, no para un robot. */
const MAX_POR_IP = 6;
const VENTANA_IP_MS = 10 * 60 * 1000;

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

  if (!esDelPropioSitio(request)) return error("No se pudo enviar.", 403);
  /* El tope de tamaño se mira antes de leer nada: el formulario entero es el
     comprobante más unos pocos campos de texto. */
  const largo = Number(request.headers.get("content-length") ?? 0);
  if (!largo || largo > MAX_BYTES + 64 * 1024) {
    return error("El comprobante pesa demasiado: mandá una captura o el PDF del banco.", 413);
  }
  if (superaLimite(`pedido:${ipDe(request)}`, MAX_POR_IP, VENTANA_IP_MS)) {
    return error("Demasiados intentos seguidos. Esperá unos minutos o escribinos por WhatsApp.", 429);
  }

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
  /* El tipo sale de los bytes del archivo, no de lo que dice el navegador. */
  const tipo = tipoPorBytes(new Uint8Array(await archivo.slice(0, 16).arrayBuffer()));
  if (!tipo) return error("El comprobante tiene que ser una imagen (foto o captura) o un PDF.");

  /* Cada línea es una camiseta ({sku, cantidad}) o una Mystery Box ({box, cantidad}). */
  const pedidos: { sku: string; cantidad: number }[] = [];
  const boxes: { box: PedidoBox; cantidad: number }[] = [];
  try {
    const crudo: unknown = JSON.parse(String(datos.get("items") ?? "[]"));
    if (!Array.isArray(crudo) || crudo.length === 0) throw new Error();
    for (const l of crudo as Record<string, unknown>[]) {
      const cantidad = Math.trunc(Number(l?.cantidad));
      if (!(cantidad >= 1)) throw new Error();
      if (l?.box !== undefined) {
        const box = leerPedidoBox(l.box);
        if (!box || cantidad > MAX_BOX_POR_LINEA) throw new Error();
        boxes.push({ box, cantidad });
      } else {
        const sku = String(l?.sku);
        if (!/^\d{1,6}$/.test(sku)) throw new Error();
        pedidos.push({ sku, cantidad });
      }
    }
  } catch {
    return error("El pedido llegó mal. Recargá la página y probá de nuevo.");
  }
  const unidadesBox = boxes.reduce((s, b) => s + b.cantidad, 0);
  if (pedidos.reduce((s, p) => s + p.cantidad, 0) + unidadesBox > MAX_UNIDADES) {
    return error(`Para más de ${MAX_UNIDADES} unidades escribinos por WhatsApp.`);
  }

  // Precios y stock del catálogo, no del navegador.
  const catalogo = await getCatalogo();
  const porSku = new Map(
    catalogo.flatMap((p) => p.variantes.map((v) => [v.sku, { producto: p, variante: v }] as const))
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
  /* Una box se puede vender si hay al menos tantas camisetas de ese talle y tipo
     como boxes pedidas: que Facu tenga con qué cumplirla. */
  for (const { box, cantidad } of boxes) {
    if (!tallesBox(catalogo, box.tipo).includes(box.talle)) {
      return error(`Ya no tenemos camisetas para la Mystery Box ${describirBox(box)}. Elegí otro talle o tipo.`, 409);
    }
    const hay = catalogo
      .filter((p) => entraEnBox(p, box.tipo))
      .reduce((s, p) => s + p.variantes.filter((v) => v.talle === box.talle).reduce((t, v) => t + v.disponible, 0), 0);
    if (hay < cantidad) return error(`Para ${cantidad} Mystery Box ${describirBox(box)} escribinos por WhatsApp.`, 409);
  }
  const totalBoxes = boxes.reduce((s, b) => s + precioBox(b.box) * b.cantidad, 0);
  const total = (items.length > 0 ? calcularTotales(items).total : 0) + totalBoxes;
  if (Number(datos.get("total")) !== total) {
    return error(`Cambió el precio de algo del pedido: el total ahora es ${precio(total)}. Revisalo antes de transferir.`, 409);
  }

  // Techo de pedidos sin verificar: primero el de toda la web, después el del teléfono.
  // Cuentan las reservas web sin cobrar y las Mystery Box sin resolver.
  const [ventasPend, boxesPend] = await Promise.all([
    supabase.from("v_ventas").select("id", { count: "exact", head: true })
      .eq("canal", "Web").eq("estado", "Reservada").eq("cobrado", 0),
    supabase.from("mystery_boxes").select("id", { count: "exact", head: true }).eq("estado", "Pendiente"),
  ]);
  /* Si la tabla de boxes no responde (por ejemplo, falta la migración 0025), un
     pedido sin boxes sigue igual: solo frena el que trae una box. */
  if (boxesPend.error) console.error("[pedido] contar boxes:", boxesPend.error);
  const errorTecho = ventasPend.error ?? (boxes.length > 0 ? boxesPend.error : null);
  /* si no se puede contar, no se reserva: mejor frenar que dejar el techo abierto */
  if (errorTecho) console.error("[pedido] contar pendientes:", errorTecho);
  if (errorTecho || (ventasPend.count ?? 0) + (boxesPend.count ?? 0) >= MAX_PENDIENTES_TOTAL) {
    return error("En este momento no podemos tomar la reserva por la web. Escribinos por WhatsApp con tu comprobante y te la guardamos.", 503);
  }

  const yaPendiente = "Ya tenés un pedido esperando que confirmemos el pago. Escribinos por WhatsApp y lo vemos.";
  const { data: cliente } = await supabase.from("clientes").select("id").eq("telefono", telefono).maybeSingle();
  if (cliente) {
    const { count } = await supabase
      .from("v_ventas")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", cliente.id)
      .eq("canal", "Web")
      .eq("estado", "Reservada")
      .eq("cobrado", 0);
    if ((count ?? 0) >= MAX_PENDIENTES) return error(yaPendiente, 429);
  }
  if (boxes.length > 0) {
    const { count: boxesDelTel } = await supabase
      .from("mystery_boxes")
      .select("id", { count: "exact", head: true })
      .eq("telefono", telefono)
      .eq("estado", "Pendiente");
    if ((boxesDelTel ?? 0) >= MAX_PENDIENTES) return error(yaPendiente, 429);
  }

  /* Queda anotado qué versión de la política aceptó, cuándo y desde dónde:
     es la prueba del consentimiento que pide la Ley 25.326. Solo si la línea de
     consentimiento estuvo a la vista. */
  const consentimiento = LEGALES_PUBLICOS
    ? ` Aceptó la política de privacidad v${LEGAL.version} el ${new Date().toISOString()} desde ${ipDe(request)}.`
    : "";

  // 1. Las camisetas, si hay: la venta reservada, como siempre.
  let venta: string | null = null;
  if (items.length > 0) {
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    const conBox = boxes.length > 0 ? ` En el mismo pedido: ${unidadesBox} Mystery Box (ver /admin/mystery-box).` : "";
    const { data, error: errorVenta } = await supabase.rpc("registrar_venta", {
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
      p_notas: `Pedido web de ${nombre}: transferencia de ${precio(total)} a verificar. El envío se coordina aparte.${conBox}${consentimiento}`,
    });
    if (errorVenta || typeof data !== "string") {
      console.error("[pedido] registrar_venta:", errorVenta);
      return error(explicarErrorBase(errorVenta?.message ?? ""), 409);
    }
    venta = data;
  }

  // 2. Las boxes: una fila por unidad, para que Facu asigne cada una por su lado.
  let boxIds: string[] = [];
  if (boxes.length > 0) {
    const filas = boxes.flatMap(({ box, cantidad }) =>
      Array.from({ length: cantidad }, () => ({
        nombre,
        telefono,
        version: box.version,
        tipo: box.tipo,
        talle: box.talle,
        preferencia: box.preferencia || null,
        excluir: box.excluir || null,
        precio: precioBox(box),
        venta_web: venta,
      }))
    );
    const { data, error: errorBox } = await supabase.from("mystery_boxes").insert(filas).select("id");
    if (errorBox || !data?.length) {
      console.error("[pedido] mystery_boxes:", errorBox);
      if (venta) await supabase.rpc("revertir_venta", { p_venta: venta, p_motivo: "No se pudo registrar la Mystery Box del pedido web" });
      return error("No pudimos registrar el pedido. Escribinos por WhatsApp con tu comprobante y lo cargamos a mano.", 500);
    }
    boxIds = data.map((f) => f.id as string);
  }

  // 3. El comprobante, uno solo para todo el pedido, en la carpeta de la venta o de la primera box.
  const numero = venta ?? boxIds[0];
  const ruta = `${numero}/comprobante.${tipo.extension}`;
  const deshacer = async (motivo: string) => {
    if (venta) await supabase.rpc("revertir_venta", { p_venta: venta, p_motivo: motivo });
    if (boxIds.length) await supabase.from("mystery_boxes").delete().in("id", boxIds);
  };
  const { error: errorArchivo } = await supabase.storage
    .from(BUCKET_COMPROBANTES)
    .upload(ruta, archivo, { contentType: tipo.mime, upsert: false });
  if (errorArchivo) {
    // Sin comprobante guardado no hay pedido: se deshace todo.
    console.error("[pedido] comprobante:", errorArchivo);
    await deshacer("No se pudo guardar el comprobante del pedido web");
    return error("No pudimos guardar el comprobante. Probá de nuevo o mandalo por WhatsApp.", 500);
  }
  if (boxIds.length) {
    const { error: errorRuta } = await supabase.from("mystery_boxes").update({ comprobante: ruta }).in("id", boxIds);
    if (errorRuta) console.error("[pedido] ruta del comprobante en la box:", errorRuta);
  }

  // La web deja de mostrar esas unidades ya, sin esperar el minuto del catálogo.
  if (venta) revalidateTag(TAG_CATALOGO, { expire: 0 });

  return NextResponse.json({ venta: numero, total });
}
