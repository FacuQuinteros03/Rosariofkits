import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la clave secreta, para lo único que hace la web pública
 * sin login: registrar un pedido pagado por transferencia y guardar su comprobante.
 *
 * Esta clave pasa por encima de los permisos de la base, por eso:
 *   - vive solo en el servidor (`server-only`) y en una variable Sensitive de Vercel;
 *   - la usan dos lugares, /api/pedido y el visor de comprobantes del panel, y en
 *     los dos lo que se hace está fijo en el código: nada de lo que manda el
 *     navegador elige qué tabla tocar.
 *
 * Sin SUPABASE_SECRET_KEY devuelve null y el pago por transferencia no se ofrece.
 */
export function supabaseServicio(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const clave = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !clave) return null;
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Bucket privado de Supabase Storage. Cada pedido en su carpeta: `V-0040/comprobante.jpg`. */
export const BUCKET_COMPROBANTES = "comprobantes";
