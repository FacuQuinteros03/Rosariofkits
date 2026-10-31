import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { BUCKET_COMPROBANTES, supabaseServicio } from "@/lib/supabase/servicio";

/**
 * Abre el comprobante de un pedido web. El bucket es privado: esto verifica que
 * quien pide sea admin (con su propia sesión, como el resto del panel) y recién
 * ahí genera un link firmado que dura cinco minutos.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ venta: string }> }) {
  const { venta } = await params;
  if (!/^V-\d{1,6}$/.test(venta)) return new NextResponse("No existe", { status: 404 });

  const { data: esAdmin } = await (await supabaseServidor()).rpc("es_admin");
  if (esAdmin !== true) return new NextResponse("No existe", { status: 404 });

  const servicio = supabaseServicio();
  if (!servicio) return new NextResponse("Falta SUPABASE_SECRET_KEY", { status: 503 });

  const { data: archivos } = await servicio.storage.from(BUCKET_COMPROBANTES).list(venta);
  const archivo = archivos?.find((a) => a.name.startsWith("comprobante."));
  if (!archivo) return new NextResponse("Este pedido no tiene comprobante", { status: 404 });

  const { data } = await servicio.storage
    .from(BUCKET_COMPROBANTES)
    .createSignedUrl(`${venta}/${archivo.name}`, 300);
  if (!data?.signedUrl) return new NextResponse("No se pudo abrir el comprobante", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
