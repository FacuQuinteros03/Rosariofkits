import { supabaseServidor } from "@/lib/supabase/servidor";
import { hoy } from "@/app/admin/_lib/formato";
import { FormMovimiento, type PedidoLista } from "./FormMovimiento";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gasto o aporte" };

export default async function CargarMovimiento() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from("v_pedidos").select("id, proveedor, estado, saldo_a_pagar").order("id");
  return <FormMovimiento pedidos={(data ?? []) as PedidoLista[]} hoy={hoy()} />;
}
