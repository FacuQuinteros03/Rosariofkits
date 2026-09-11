import type { MetadataRoute } from "next";
import { SITIO } from "@/lib/site";

/**
 * El catálogo es todo público. Lo único fuera de Google es el validador de
 * cupones de la ruleta: es una herramienta interna y cada URL es un código.
 * Cuando existan checkout o panel de admin, esas rutas van también acá.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cupon/", "/api/"],
      },
    ],
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
