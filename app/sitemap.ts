import type { MetadataRoute } from "next";
import { getCatalogo } from "@/lib/sheets";
import { SITIO } from "@/lib/site";

/**
 * Se regenera con el mismo ISR que el catálogo: si entra un modelo nuevo al
 * Sheet, en un minuto ya está en el sitemap sin tocar nada.
 */
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productos = await getCatalogo();
  const ahora = new Date();

  return [
    {
      url: SITIO,
      lastModified: ahora,
      changeFrequency: "daily",
      priority: 1,
    },
    /* los agotados se indexan igual — traen visitas que terminan en encargue —
       pero con menos prioridad que lo que se puede comprar hoy */
    ...productos.map((p) => ({
      url: `${SITIO}/producto/${p.id}`,
      lastModified: ahora,
      changeFrequency: "daily" as const,
      priority: p.total > 0 ? 0.8 : 0.5,
    })),
  ];
}
