import type { MetadataRoute } from "next";
import { SITIO } from "@/lib/site";

/**
 * Hoy no hay nada que esconder: todo el sitio es catálogo público.
 * Cuando existan checkout o panel de admin, esas rutas van en `disallow`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // disallow: ["/checkout", "/admin"],
      },
    ],
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
