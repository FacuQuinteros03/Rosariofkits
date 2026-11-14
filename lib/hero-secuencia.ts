/**
 * La secuencia de la portada: cuadros WebP sacados de un video propio.
 *
 * La carpeta lleva versión porque los cuadros se cachean un año entero
 * (ver next.config.ts): secuencia nueva = carpeta nueva, y se cambia acá.
 * Cómo se regenera: herramientas/hero-secuencia/LEEME.md
 */
export const HERO_SECUENCIA = {
  base: "/hero/azul-v1",
  /** primer cuadro, en buena calidad: es lo que se ve antes de que cargue nada */
  poster: "/hero/azul-v1/poster.jpg",
  ancho: 576,
  alto: 1024,
  /** celular: menos cuadros y más chicos */
  movil: { carpeta: "m", cuadros: 72 },
  escritorio: { carpeta: "d", cuadros: 96 },
} as const;
