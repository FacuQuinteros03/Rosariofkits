/**
 * Normalizar un celular argentino.
 *
 * La gente lo escribe de siete formas distintas y todas son la misma persona:
 * 341 612-3456, 0341 15 6123456, +54 9 341 6123456. Si no se unifican, alguien
 * gira una vez con cada formato y el control de "un cupón por número" no sirve
 * para nada.
 *
 * La salida es el mismo formato que usa el link de WhatsApp: 549 + diez dígitos.
 */

/** Áreas de dos dígitos (el resto son de tres o cuatro). */
const AREAS_CORTAS = ["11"];

export function normalizarTelefono(entrada: string): string | null {
  let n = (entrada || "").replace(/\D/g, "");

  if (n.startsWith("54")) n = n.slice(2);
  if (n.startsWith("9")) n = n.slice(1);
  if (n.startsWith("0")) n = n.slice(1);

  /* El "15" viejo va después del área. Área + abonado son siempre diez dígitos,
     así que doce dígitos significa que el 15 está ahí en el medio: 11 15 xxxx-xxxx,
     341 15 xxx-xxxx, 2477 15 xx-xxxx. El área puede medir 2, 3 o 4: se prueban
     las tres posiciones, empezando por la más común. */
  if (n.length === 12) {
    for (const largo of AREAS_CORTAS.includes(n.slice(0, 2)) ? [2, 3, 4] : [3, 4, 2]) {
      if (n.slice(largo, largo + 2) === "15") {
        n = n.slice(0, largo) + n.slice(largo + 2);
        break;
      }
    }
  }

  /* Diez dígitos exactos: área + abonado. Ni uno más ni uno menos. */
  if (!/^[1-9]\d{9}$/.test(n)) return null;
  return `549${n}`;
}

/** "5493416178059" -> "341 617-8059", para mostrarlo sin que asuste. */
export function mostrarTelefono(normalizado: string): string {
  const n = normalizado.replace(/^549/, "");
  if (n.length !== 10) return normalizado;
  const area = AREAS_CORTAS.includes(n.slice(0, 2)) ? 2 : 3;
  const resto = n.slice(area);
  return `${n.slice(0, area)} ${resto.slice(0, resto.length - 4)}-${resto.slice(-4)}`;
}

/**
 * De donde es, segun el codigo de area del celular.
 *
 * Es mas confiable que ubicar por IP: las companias de celular sacan a todo el
 * mundo por una misma IP (CGNAT), asi que alguien parado en Rosario puede
 * figurar en Buenos Aires. El codigo de area no se mueve.
 *
 * Lo que si falla: el que se mudo y conservo el numero. Sirve para saber a
 * donde se vende, no para afirmar donde esta parada una persona.
 *
 * Solo estan las areas que se pueden afirmar. Cualquier otra sale como
 * "area NNN" en vez de inventar una ciudad.
 */
const ZONAS: Record<string, string> = {
  // el area de siempre
  "341": "Rosario",
  "3476": "San Lorenzo",
  "3464": "Casilda",
  "3471": "Cañada de Gómez",
  "3400": "Villa Constitución",
  "3462": "Venado Tuerto",
  "3492": "Rafaela",
  "336": "San Nicolás",
  "2477": "Pergamino",
  // el resto del pais
  "11": "Buenos Aires",
  "221": "La Plata",
  "223": "Mar del Plata",
  "291": "Bahía Blanca",
  "351": "Córdoba",
  "358": "Río Cuarto",
  "342": "Santa Fe",
  "343": "Paraná",
  "345": "Concordia",
  "261": "Mendoza",
  "264": "San Juan",
  "266": "San Luis",
  "299": "Neuquén",
  "362": "Resistencia",
  "376": "Posadas",
  "379": "Corrientes",
  "380": "La Rioja",
  "381": "Tucumán",
  "383": "Catamarca",
  "385": "Santiago del Estero",
  "387": "Salta",
  "388": "Jujuy",
};

export function zonaDeTelefono(normalizado: string): string {
  const n = (normalizado || "").replace(/^549/, "");
  if (n.length !== 10) return "";

  /* Las areas miden 2, 3 o 4 digitos y no hay forma de saberlo del largo del
     numero — se prueba de la mas larga a la mas corta, que es la unica que no
     confunde 3476 (San Lorenzo) con 347 (que no existe). */
  for (const largo of [4, 3, 2]) {
    const area = n.slice(0, largo);
    if (ZONAS[area]) return ZONAS[area];
  }
  return `área ${n.slice(0, 3)}`;
}
