/**
 * URL pública del sitio. En Vercel se define NEXT_PUBLIC_SITE_URL;
 * el fallback sirve para desarrollo y para el primer deploy.
 *
 * Importa que sea la real: de acá salen las URLs canónicas, las imágenes de
 * Open Graph y el JSON-LD. Si queda mal, Google indexa un dominio que no es.
 */
export const SITIO =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://rosariofkits.vercel.app";

export const INSTAGRAM = "https://www.instagram.com/rosariofkits/";
export const USUARIO_IG = "@rosariofkits";

export const NEGOCIO = {
  nombre: "Rosario F Kits",
  ciudad: "Rosario",
  provincia: "Santa Fe",
  pais: "AR",
} as const;
