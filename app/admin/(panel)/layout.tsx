import { cookies } from "next/headers";
import { sesionAdmin } from "@/app/admin/_lib/sesion";
import { Barra, SinAcceso } from "@/app/admin/_componentes/Marco";

/** Todo lo del panel menos la entrada: pide sesión de admin y pone la barra de arriba. */
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const { email, esAdmin } = await sesionAdmin();
  if (!esAdmin) return <SinAcceso email={email} />;
  return (
    <>
      <Barra email={email} oscuro={(await cookies()).get("panel_tema")?.value === "oscuro"} />
      {children}
    </>
  );
}
