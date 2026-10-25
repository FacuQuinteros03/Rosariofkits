import type { Producto } from "@/lib/types";
import { NEGOCIO } from "@/lib/site";

export interface Pregunta {
  pregunta: string;
  /** texto plano: se muestra en la ficha y va igual al JSON-LD */
  respuesta: string;
}

const TALLE: Pregunta = {
  pregunta: "¿Cómo vienen los talles?",
  respuesta:
    "Las camisetas versión jugador son entalladas: tienen corte ajustado al cuerpo y tela más liviana, así que recomendamos pedir un talle más del que usás normalmente. Las de versión hincha tienen corte común y van con tu talle de siempre. Si tenés dudas, escribinos por WhatsApp y te ayudamos a elegir.",
};

const LAVADO: Pregunta = {
  pregunta: "¿Cómo lavo la camiseta para que dure?",
  respuesta:
    "Lavala del revés, con agua fría (30 °C como máximo), a mano o en ciclo delicado. Sin lavandina ni suavizante, que dañan la tela y despegan los estampados. No uses secarropas: secala colgada a la sombra. Y no planches encima del escudo, los sponsors ni el dorsal.",
};

const COMPRA: Pregunta = {
  pregunta: "¿Cómo compro?",
  respuesta:
    "Elegí el talle y tocá el botón de WhatsApp: se abre un mensaje con el modelo y el talle ya escritos. Te confirmamos el stock y coordinamos la entrega o el envío.",
};

const ENVIOS: Pregunta = {
  pregunta: "¿Hacen envíos?",
  respuesta: `Sí. Entregamos en mano en ${NEGOCIO.ciudad} y enviamos a todo el país por Correo Argentino o Andreani. El costo depende del destino: te lo pasamos por WhatsApp antes de cerrar la compra.`,
};

const PAGO: Pregunta = {
  pregunta: "¿Cómo se paga?",
  respuesta: "En efectivo o por transferencia, sin recargo.",
};

const STOCK: Pregunta = {
  pregunta: "¿El stock de la web es real?",
  respuesta:
    "Sí. Lo que ves publicado es lo que tenemos en mano, talle por talle, y se actualiza todos los días.",
};

const ENCARGUE: Pregunta = {
  pregunta: "¿Qué pasa si no está mi talle o se agotó?",
  respuesta:
    "La conseguimos por encargue. Escribinos por WhatsApp con el modelo y el talle, y te pasamos plazo y precio.",
};

/**
 * Las preguntas de una ficha. Se muestran debajo del botón y van como
 * FAQPage en el JSON-LD: es texto que una IA puede citar tal cual cuando
 * alguien pregunta cómo talla o cómo se lava una camiseta.
 *
 * Lo de talles y lavado es de camisetas: a un short no se le muestra la
 * de talles, porque el "pedí uno más" es por el corte de la versión jugador.
 *
 * Falta una de cambios y devoluciones: no se escribe hasta que haya una
 * política definida, porque una respuesta acá es una promesa.
 */
export function preguntasProducto(p: Producto): Pregunta[] {
  const talle = p.categoria === "Shorts" ? [] : [TALLE];
  return [...talle, LAVADO, COMPRA, ENVIOS, PAGO, STOCK, ENCARGUE];
}

export function jsonLdPreguntas(preguntas: Pregunta[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preguntas.map((q) => ({
      "@type": "Question",
      name: q.pregunta,
      acceptedAnswer: { "@type": "Answer", text: q.respuesta },
    })),
  };
}
