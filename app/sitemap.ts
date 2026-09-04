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
    ...productos.map((p) => ({
      url: `${SITIO}/producto/${p.id}`,
      lastModified: ahora,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
