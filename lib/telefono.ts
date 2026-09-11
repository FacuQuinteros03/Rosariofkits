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
