"use server";

import { revalidatePath, updateTag } from "next/cache";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { TAG_CATALOGO } from "@/lib/sheets";

/**
 * Todo lo que el panel escribe pasa por acá y cada acción llama a una sola función
 * de la base. Las reglas (stock, descuentos, pagos de más, quién puede) viven en la
 * base: si algo no se puede, la base lo rechaza con un mensaje en castellano y ese
 * mensaje es el que ve quien cargó.
 */

export type Resultado = { ok: true; id?: string } | { ok: false; error: string };

type Cliente = { id?: string; nombre?: string; telefono?: string; tipo?: string };
type Item = { sku: number; cantidad: number; precio_unit: number; motivo_descuento?: string };
type Pago = { monto: number; metodo: string; tipo: string } | null;

export type VentaNueva = {
  cliente: Cliente;
  items: Item[];
  estado: "Reservada" | "Señada" | "Pagada" | "Entregada";
  pago: Pago;
  canal: string | null;
  fecha: string;
  notas: string | null;
};

/** Mensaje de Postgres sin el ruido técnico. */
function mensaje(e: { message?: string } | null): string {
  return (e?.message ?? "Algo falló. Probá de nuevo.").replace(/^.*?ERROR:\s*/, "");
}

/** Después de escribir: el panel y el stock de la web se ven al día. */
function refrescar() {
  revalidatePath("/admin", "layout");
  updateTag(TAG_CATALOGO);
}

export async function cargarVenta(v: VentaNueva): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc("registrar_venta", {
    p_cliente: v.cliente,
    p_items: v.items.map((i) => ({
      sku: i.sku,
      cantidad: i.cantidad,
      precio_unit: i.precio_unit,
      motivo_descuento: i.motivo_descuento || null,
    })),
    p_estado: v.estado,
    p_pago: v.pago && v.pago.monto > 0 ? v.pago : null,
    p_canal: v.canal,
    p_fecha: v.fecha,
    p_notas: v.notas || null,
  });
  if (error) return { ok: false, error: mensaje(error) };
  refrescar();
  return { ok: true, id: data as string };
}

export async function cobrar(venta: string, monto: number, metodo: string, entregar: boolean): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { data: v } = await supabase.from("v_ventas").select("cobrado").eq("id", venta).single();
  const { data, error } = await supabase.rpc("registrar_pago", {
    p_venta: venta,
    p_monto: monto,
    p_metodo: metodo,
    p_tipo: Number(v?.cobrado ?? 0) > 0 ? "Saldo" : "Total",
    p_entregar: entregar,
  });
  if (error) return { ok: false, error: mensaje(error) };
  refrescar();
  return { ok: true, id: data as string };
}

export async function entregar(venta: string, item: number): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc("cambiar_estado", {
    p_venta: venta,
    p_items: [item],
    p_estado: "Entregada",
  });
  if (error) return { ok: false, error: mensaje(error) };
  refrescar();
  return { ok: true };
}

/** Deshace la venta entera: las unidades vuelven al stock y lo cobrado se devuelve. */
export async function revertir(venta: string, motivo: string, metodo: string | null): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.rpc("revertir_venta", {
    p_venta: venta,
    p_motivo: motivo,
    p_metodo: metodo,
  });
  if (error) return { ok: false, error: mensaje(error) };
  refrescar();
  return { ok: true };
}

export type Movimiento = {
  tipo: "Ingreso" | "Egreso";
  categoria: string;
  monto: number;
  metodo: string;
  pedido: string | null;
  nota: string | null;
  fecha: string;
};

export async function cargarMovimiento(m: Movimiento): Promise<Resultado> {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.rpc("registrar_movimiento", {
    p_tipo: m.tipo,
    p_categoria: m.categoria,
    p_monto: m.monto,
    p_metodo: m.metodo,
    p_pedido: m.pedido || null,
    p_nota: m.nota || null,
    p_fecha: m.fecha,
  });
  if (error) return { ok: false, error: mensaje(error) };
  refrescar();
  return { ok: true, id: data as string };
}
