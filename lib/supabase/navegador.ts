import { createBrowserClient } from "@supabase/ssr";

/** Cliente de Supabase para el navegador: solo lo usa el botón "Entrar con Google". */
export function supabaseNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
