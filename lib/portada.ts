/**
 * Las fotos que rotan en la portada. Son propias, sacadas de cerca: se eligen
 * las más nítidas (1200×1600 como mínimo) porque ocupan media pantalla.
 *
 * Para sumar o cambiar una: el archivo va en public/hero con versión en el
 * nombre (next/image cachea por URL: foto nueva = nombre nuevo) y se agrega
 * acá. La primera de la lista es la que se ve al entrar.
 */
export const FOTOS_PORTADA = [
  { src: "/hero/real-madrid-v1.jpg", equipo: "Real Madrid", alt: "Camiseta negra del Real Madrid, vista de cerca" },
  { src: "/hero/argentina-v1.jpg", equipo: "Argentina", alt: "Camiseta de la Selección Argentina: escudo de la AFA, parche de campeón del mundo y el 10" },
  { src: "/hero/boca-retro-v1.jpg", equipo: "Boca retro", alt: "Camiseta retro blanca de Boca Juniors con la franja azul y amarilla" },
  { src: "/hero/arsenal-v1.jpg", equipo: "Arsenal", alt: "Escudo del Arsenal sobre la camiseta roja, vista de cerca" },
  { src: "/hero/chelsea-v1.jpg", equipo: "Chelsea", alt: "Escudo del Chelsea sobre la camiseta azul, vista de cerca" },
  { src: "/hero/juventus-v1.jpg", equipo: "Juventus", alt: "Camiseta de la Juventus a rayas blancas y negras con detalles rosas" },
] as const;

/** cada cuánto cambia la foto, en milisegundos */
export const PORTADA_INTERVALO = 4500;
