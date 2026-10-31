import "server-only";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/servidor";

/**
 * Cliente de Supabase de alguien logueado y admin. Si no hay sesión va a la entrada;
 * si el mail no está en `admins` devuelve `null` y la página muestra "Sin acceso".
 * Igual la base es la que manda: sin admin, las vistas vuelven vacías y las
 * funciones fallan con `no_autorizado`.
 */
export async function sesionAdmin() {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/entrar");
  const { data: esAdmin } = await supabase.rpc("es_admin");
  return { supabase, email: user.email ?? "", esAdmin: Boolean(esAdmin) };
}
