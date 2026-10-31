import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** Cierra la sesión. Es POST para que un link o un prefetch no saquen a nadie. */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${request.nextUrl.origin}/admin/entrar`, { status: 303 });
}
