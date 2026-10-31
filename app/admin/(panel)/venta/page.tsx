import { supabaseServidor } from "@/lib/supabase/servidor";
import { hoy } from "@/app/admin/_lib/formato";
import { FormVenta, type Producto, type ClienteLista } from "./FormVenta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cargar venta" };

export default async function CargarVenta() {
  const supabase = await supabaseServidor();
  const [productos, clientes] = await Promise.all([
    supabase
      .from("v_consulta_stock")
      .select("sku, producto, categoria, precio, disponible, en_casa")
      .gt("disponible", 0)
      .order("producto"),
    supabase.from("v_clientes_metricas").select("id, nombre, telefono, tipo, compras, saldo").order("nombre"),
  ]);

  return (
    <FormVenta
      productos={(productos.data ?? []) as Producto[]}
      clientes={(clientes.data ?? []) as ClienteLista[]}
      hoy={hoy()}
    />
  );
}
