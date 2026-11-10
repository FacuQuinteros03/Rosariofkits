/**
 * Versión de los archivos de la portada (public/hero-golazo-{land,port}-<versión>.mp4 y .jpg).
 * Vive acá y no en HeroVideo porque la leen un Server Component (Hero) y uno de
 * cliente: una constante exportada desde un archivo "use client" no se puede
 * leer en el servidor. Clip nuevo = versión nueva. Ver herramientas/hero-3d.
 */
export const VERSION_HERO = "v1";
