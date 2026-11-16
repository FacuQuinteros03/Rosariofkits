import type { NextConfig } from "next";

/*
  Encabezados de seguridad para todas las páginas.

  La CSP va en dos partes a propósito:
   - lo que no puede romper nada va en firme: nadie mete el sitio en un iframe
     (clickjacking), no hay <base> ni <object>, y los formularios solo envían
     al propio sitio;
   - la lista de orígenes permitidos va en modo "solo reporte": el navegador
     avisa en la consola si algo queda afuera, pero no lo bloquea. Cuando pase
     un tiempo sin avisos, se pasa a firme cambiando el nombre del encabezado.

  'unsafe-inline' en script-src: Next escribe scripts en línea para hidratar.
  Sacarlo exige un nonce por pedido, que vuelve dinámicas todas las páginas y
  se lleva puesto el caché del catálogo. No se paga ese costo por ahora.
*/
const CSP_FIRME = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";
const CSP_REPORTE = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com",
  "frame-src 'none'",
].join("; ");

const ENCABEZADOS = [
  { key: "Content-Security-Policy", value: CSP_FIRME },
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORTE },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  /* sin "X-Powered-By: Next.js": no hace falta contarle a nadie con qué está hecho */
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:ruta*", headers: ENCABEZADOS },
      /* el panel y las respuestas con datos de pedidos no se guardan en ningún caché */
      { source: "/admin/:ruta*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },

  /*
    El slug de la ficha sale del nombre del modelo: si se renombra en el Sheet,
    la URL vieja da 404. Cada renombre deja acá su redirección permanente, así
    no se pierden los links compartidos ni lo que Google ya tenía indexado.
  */
  async redirects() {
    return [
      {
        source: "/producto/camiseta-arsenal-casual-bordo-clubes",
        destination: "/producto/camiseta-arsenal-25-26-terrace-icons-adidas-originals-bordo-clubes",
        permanent: true,
      },
    ];
  },

  images: {
    // AVIF primero: pesa bastante menos que WebP en fotos de producto
    formats: ["image/avif", "image/webp"],

    /*
      Next 16 solo acepta las calidades declaradas acá; cualquier otra la
      ignora en silencio y cae a 75. Sin esta linea, el quality={90} de la
      portada y el {90} del visor no hacen nada.
    */
    qualities: [75, 90],

    /*
      Hoy las fotos son archivos locales en /public/fotos/<SKU>.jpg, así que no
      hace falta ningún host remoto. Si algún día las servís desde afuera,
      descomentá el patrón que corresponda.

      Ojo con Google Drive: bloquea el hotlinking de imágenes y los links
      dejan de funcionar solos. Si hay que salir de /public, conviene un
      bucket (S3, R2, Supabase Storage) o Cloudinary.
    */
    remotePatterns: [
      // { protocol: "https", hostname: "cdn.treinta.co", pathname: "/**" },
      // { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
