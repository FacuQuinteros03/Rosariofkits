/**
 * Lo que dicen los clientes. Son mensajes REALES, copiados tal cual llegaron.
 *
 * Regla: acá no se inventa ni se "mejora" nada. Una reseña que no escribió un
 * cliente es publicidad engañosa, y basta que alguien lo note para que deje de
 * creerse también las verdaderas. Si hay pocas, se muestran pocas.
 *
 * `nombre` es opcional y solo se pone si el cliente dio permiso (nombre de
 * pila alcanza). `camiseta` es el modelo que compró, si se sabe.
 */
export interface Resena {
  texto: string;
  nombre?: string;
  camiseta?: string;
}

export const RESENAS: Resena[] = [
  { texto: "Amigo 10 puntos la camiseta, muy buena la calidad" },
  { texto: "La tela muy buena, muy fresca para jugar" },
  { texto: "Muy buenos modelos y atención, gracias Facu!" },
];
