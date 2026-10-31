import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Solo para /admin: refresca la sesión de Supabase y, si no hay nadie logueado,
 * manda a /admin/entrar. Es comodidad, no seguridad: aunque alguien se saltee esto,
 * la base no le devuelve ni una fila si su mail no está en `admins`.
 *
 * El resto del sitio no pasa por acá (ver `matcher`).
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) {
    // Sin Supabase configurado (producción hasta el corte) el panel no existe.
    return new NextResponse("Panel no configurado", { status: 404 });
  }

  const supabase = createServerClient(url, clave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  // getUser() valida el token contra Supabase (getSession() solo lo lee de la cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const publica = ruta.startsWith("/admin/entrar") || ruta.startsWith("/admin/auth");
  if (!user && !publica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/admin/entrar";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return respuesta;
}

export const config = {
  matcher: ["/admin/:path*"],
};
