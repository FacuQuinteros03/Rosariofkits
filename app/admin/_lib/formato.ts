/** Formatos de números del panel. Sirven en el servidor y en el navegador. */

export const plata = (n: number | string | null | undefined) =>
  "$" + Math.round(Number(n ?? 0)).toLocaleString("es-AR");

/** $1,2M / $450k / $9.500: para ejes y gráficos donde no entra el número entero. */
export function plataCorta(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  const a = Math.abs(v);
  if (a >= 1_000_000) return `$${(v / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (a >= 10_000) return `$${Math.round(v / 1000)}k`;
  return plata(v);
}

export const porciento = (n: number | string | null | undefined) =>
  `${Math.round(Number(n ?? 0) * 100)}%`;

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "2026-09-01" → "Sep". */
export const nombreMes = (f: string) => MESES[Number(f.slice(5, 7)) - 1] ?? f;

/** Hoy en Argentina, AAAA-MM-DD. */
export const hoy = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
