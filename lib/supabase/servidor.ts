import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para el servidor (páginas y Server Actions del panel).
 *
 * Corre con la sesión de quien está logueado, no con la clave de servicio: lo que
 * puede ver y hacer lo decide la base (RLS + es_admin()), no este código. La clave
 * es la publishable, la misma que ya es pública.
 */
export async function supabaseServidor() {
  const almacen = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (lista) => {
          // Desde un Server Component no se pueden escribir cookies; el proxy ya
          // refrescó la sesión antes de llegar acá, así que se puede ignorar.
          try {
            lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}
