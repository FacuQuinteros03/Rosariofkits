/**
 * Las fotos que rotan en la portada. Son propias, sacadas de cerca: se eligen
 * las más nítidas (1200×1600 como mínimo) porque ocupan media pantalla.
 *
 * Para sumar o cambiar una: el archivo va en public/hero con versión en el
 * nombre (next/image cachea por URL: foto nueva = nombre nuevo) y se agrega
 * acá. La primera de la lista es la que se ve al entrar.
 *
 * Facu, 17/11/2026: vuelve Messi (horizontal, 2400×1600: se recorta al centro) y
 * quedan Chelsea, Real Madrid y Arsenal. Argentina, Boca retro y Juventus salen
 * hasta tener mejores fotos; los archivos siguen en public/hero.
 */
export const FOTOS_PORTADA = [
  { src: "/hero/messi-v1.jpg", equipo: "Argentina", alt: "Messi con la camiseta titular de la Selección Argentina" },
  { src: "/hero/chelsea-v1.jpg", equipo: "Chelsea", alt: "Escudo del Chelsea sobre la camiseta azul, vista de cerca" },
  { src: "/hero/real-madrid-v1.jpg", equipo: "Real Madrid", alt: "Camiseta negra del Real Madrid, vista de cerca" },
  { src: "/hero/arsenal-v1.jpg", equipo: "Arsenal", alt: "Escudo del Arsenal sobre la camiseta bordó, vista de cerca" },
] as const;

/** cada cuánto cambia la foto, en milisegundos */
export const PORTADA_INTERVALO = 4500;
