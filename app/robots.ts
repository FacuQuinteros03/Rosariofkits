import type { MetadataRoute } from "next";
import { SITIO } from "@/lib/site";

/**
 * El catálogo es todo público. Lo único fuera de Google es el validador de
 * cupones de la ruleta: es una herramienta interna y cada URL es un código.
 *
 * /admin no va acá a propósito: robots.txt es público y listarlo avisa que hay un
 * panel. Sin sesión /admin da 404, y el panel lleva noindex (layout y proxy).
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
