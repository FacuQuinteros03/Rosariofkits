import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
