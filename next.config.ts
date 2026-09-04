import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF primero: pesa bastante menos que WebP en fotos de producto
    formats: ["image/avif", "image/webp"],

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
