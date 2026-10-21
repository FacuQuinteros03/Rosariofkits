import type { Producto } from "@/lib/types";
import { conStock } from "@/lib/types";
import { INSTAGRAM, NEGOCIO, SITIO } from "@/lib/site";
import { precio, WHATSAPP } from "@/lib/whatsapp";

/**
 * El nodo de la tienda en el JSON-LD. Todas las ofertas lo citan por este @id,
 * así Google (y las IA que leen el marcado) unen cada camiseta con un mismo
 * vendedor, su ciudad y su Instagram.
 */
export const ID_TIENDA = `${SITIO}/#tienda`;

/**
 * Tienda online y no LocalBusiness: no hay local a la calle, y Google pide
 * dirección completa para un LocalBusiness. La ciudad va igual, que es lo que
 * hace que nos encuentren buscando "en Rosario".
 */
export const jsonLdTienda = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": ID_TIENDA,
  name: NEGOCIO.nombre,
  url: SITIO,
  logo: `${SITIO}/logo.png`,
  image: `${SITIO}/og.png`,
  description:
    "Tienda de camisetas de fútbol en Rosario, Santa Fe: clubes, selecciones y retro, con stock real por talle. Entrega en mano en Rosario y envíos a todo el país por Correo Argentino y Andreani. Pago en efectivo o transferencia, sin recargo.",
  telephone: `+${WHATSAPP}`,
  sameAs: [INSTAGRAM],
  address: {
    "@type": "PostalAddress",
    addressLocality: NEGOCIO.ciudad,
    addressRegion: NEGOCIO.provincia,
    addressCountry: NEGOCIO.pais,
  },
  areaServed: { "@type": "Country", name: "Argentina" },
  currenciesAccepted: "ARS",
  paymentAccepted: "Efectivo, transferencia bancaria",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "ventas",
    telephone: `+${WHATSAPP}`,
    availableLanguage: "es",
  },
};

export const jsonLdSitio = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITIO}/#sitio`,
  name: NEGOCIO.nombre,
  url: SITIO,
  inLanguage: "es-AR",
  publisher: { "@id": ID_TIENDA },
};

/** "L y XL", "S, M y L". */
function enumerar(xs: string[]): string {
  return xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

/**
 * La descripción en texto de una camiseta: la meta description, el JSON-LD y
 * el párrafo de la ficha salen de acá. Es lo que cita una IA cuando alguien le
 * pregunta dónde conseguir esa camiseta, así que dice todo en una oración
 * suelta: qué es, de qué equipo, talles, precio, ciudad, envío y pago.
 */
export function descripcionProducto(p: Producto): string {
  const talles = p.variantes.filter(conStock).map((v) => v.talle);
  /* "Camiseta Arsenal ... de Arsenal" no: solo cuando el nombre no lo dice */
  const deEquipo = p.equipo && !p.nombre.includes(p.equipo) ? ` de ${p.equipo}` : "";
  const entrega = `Entrega en mano en ${NEGOCIO.ciudad} (${NEGOCIO.provincia}) y envíos a todo el país; pago en efectivo o transferencia, sin recargo.`;

  if (p.total === 0) {
    return `${p.nombre}${deEquipo}: agotada por ahora, la conseguimos por encargue. ${entrega}`;
  }
  const enTalles =
    talles.length === 1 && talles[0] === "ÚNICO" ? "" : ` en talle${talles.length > 1 ? "s" : ""} ${enumerar(talles)}`;
  return `${p.nombre}${deEquipo}, en stock${enTalles} a ${precio(p.precio)}. ${entrega}`;
}
