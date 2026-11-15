/**
 * Medidas de la guía de talles, en centímetros, con la prenda apoyada plana.
 *
 *   ancho = de axila a axila
 *   largo = del hombro al borde de abajo
 *
 * ⚠ PROVISORIAS: son las medidas habituales de estas versiones, cargadas para
 * poder armar la guía. Hay que reemplazarlas por las reales (medir una prenda
 * de cada talle) antes de publicar. Se cambia solo acá.
 */
export type Version = "fan" | "player";

/**
 * Interruptor de la guía. En `false` el botón "Guía de talles" no aparece en
 * ningún lado y el sitio se apoya en las preguntas frecuentes de la ficha
 * ("¿Cómo vienen los talles?"). Pasa a `true` cuando las medidas de abajo
 * sean las reales.
 */
export const GUIA_TALLES_PUBLICA = false;

export const TABLA_TALLES: Record<Version, { talle: string; ancho: number; largo: number }[]> = {
  fan: [
    { talle: "S", ancho: 50, largo: 69 },
    { talle: "M", ancho: 52, largo: 71 },
    { talle: "L", ancho: 54, largo: 73 },
    { talle: "XL", ancho: 56, largo: 75 },
    { talle: "XXL", ancho: 58, largo: 77 },
  ],
  player: [
    { talle: "S", ancho: 46, largo: 67 },
    { talle: "M", ancho: 48, largo: 69 },
    { talle: "L", ancho: 50, largo: 71 },
    { talle: "XL", ancho: 52, largo: 73 },
    { talle: "XXL", ancho: 54, largo: 75 },
  ],
};

export const VERSIONES: { id: Version; nombre: string; calce: string }[] = [
  { id: "fan", nombre: "Fan", calce: "Calce suelto, como una remera común." },
  { id: "player", nombre: "Player", calce: "Calce al cuerpo. Si estás entre dos talles, pedí el más grande." },
];

/**
 * La versión sale del nombre del modelo, que es donde hoy está escrita
 * ("... Player", "Versión jugador", "... FAN"). Si el nombre no dice nada,
 * null: la tarjeta no muestra etiqueta y la guía abre en Fan.
 */
export function versionDe(nombre: string): Version | null {
  if (/\b(player|jugador)\b/i.test(nombre)) return "player";
  if (/\bfan\b/i.test(nombre)) return "fan";
  return null;
}
