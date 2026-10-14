import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** Vuelta de Google: cambia el código por la sesión y entra al panel. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const codigo = searchParams.get("code");
  // Si Supabase rechazó el login (por ejemplo, un mail sin invitación), viene acá.
  const errorProveedor = searchParams.get("error_description") ?? searchParams.get("error");

  if (codigo) {
    const supabase = await supabaseServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(`${origin}/admin`);
    return NextResponse.redirect(`${origin}/admin/entrar?error=${encodeURIComponent(error.message)}`);
  }
  return NextResponse.redirect(
    `${origin}/admin/entrar?error=${encodeURIComponent(errorProveedor ?? "sin_codigo")}`,
  );
}
