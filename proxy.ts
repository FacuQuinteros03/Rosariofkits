import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Cookie que abre la puerta de /admin/entrar en este navegador. */
const PUERTA = "rfk_puerta";

/**
 * La misma pagina que cualquier URL inventada: quien prueba /admin no se entera
 * de que hay un panel.
 */
function noExiste(request: NextRequest) {
  return NextResponse.rewrite(new URL("/no-existe", request.url));
}

/**
 * Solo para /admin: refresca la sesión de Supabase y, si no hay nadie logueado,
 * responde 404. Es para no mostrar el panel, no seguridad: aunque alguien se
 * saltee esto, la base no le devuelve ni una fila si su mail no está en `admins`.
 *
 * El login (/admin/entrar) solo aparece en un navegador con la llave: se abre una
 * vez con /admin/entrar?llave=<ADMIN_LLAVE> y queda guardada en una cookie. Sin
 * ADMIN_LLAVE en Vercel el login queda a la vista, como antes.
 *
 * El resto del sitio no pasa por acá (ver `matcher`).
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) return noExiste(request); // sin Supabase el panel no existe

  const ruta = request.nextUrl.pathname;
  const llave = process.env.ADMIN_LLAVE?.trim();

  if (llave && ruta.startsWith("/admin/entrar")) {
    const dada = request.nextUrl.searchParams.get("llave");
    if (dada === llave) {
      // Guarda la llave y saca el parametro de la barra de direcciones.
      const limpia = request.nextUrl.clone();
      limpia.searchParams.delete("llave");
      const r = NextResponse.redirect(limpia);
      r.cookies.set(PUERTA, llave, {
        path: "/admin", httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365,
      });
      return r;
    }
    if (request.cookies.get(PUERTA)?.value !== llave) return noExiste(request);
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

  const publica = ruta.startsWith("/admin/entrar") || ruta.startsWith("/admin/auth");
  if (!user && !publica) return noExiste(request);
  respuesta.headers.set("X-Robots-Tag", "noindex, nofollow");
  return respuesta;
}

export const config = {
  matcher: ["/admin/:path*"],
};
