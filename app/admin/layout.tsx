import type { Metadata } from "next";
import { cookies } from "next/headers";

/** El panel no se indexa ni entra al sitemap. No está en robots.ts: ver ahí por qué. */
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

/** Claro por defecto, como la web; oscuro si se eligió con el botón de la barra. */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const oscuro = (await cookies()).get("panel_tema")?.value === "oscuro";
  return (
    <div data-panel className={`tema-panel ${oscuro ? "oscuro" : ""} min-h-dvh bg-ground text-ink`}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">{children}</div>
    </div>
  );
}
