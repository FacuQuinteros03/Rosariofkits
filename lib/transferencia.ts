import "server-only";

/**
 * Los datos para transferir. Viven en variables de Vercel y no en el código, que
 * es público: así se cambian sin deploy de código y no quedan en el historial.
 *
 *   TRANSFERENCIA_ALIAS     rosariofkits
 *   TRANSFERENCIA_CBU       el CBU o CVU, 22 dígitos (opcional si hay alias)
 *   TRANSFERENCIA_TITULAR   a nombre de quién figura la cuenta
 *   TRANSFERENCIA_CUIT      el CUIT del titular (opcional)
 *   TRANSFERENCIA_BANCO     el banco o billetera, ej. Naranja X (opcional)
 *
 * El alias no es un secreto (se le da a cada cliente), pero tenerlo en un solo
 * lugar evita que el día que cambie de banco quede uno viejo en algún rincón.
 */
export interface DatosTransferencia {
  alias: string | null;
  cbu: string | null;
  titular: string | null;
  cuit: string | null;
  banco: string | null;
}

export function datosTransferencia(): DatosTransferencia | null {
  const alias = process.env.TRANSFERENCIA_ALIAS?.trim() || null;
  const cbu = process.env.TRANSFERENCIA_CBU?.replace(/\D/g, "") || null;
  const titular = process.env.TRANSFERENCIA_TITULAR?.trim() || null;
  const cuit = process.env.TRANSFERENCIA_CUIT?.trim() || null;
  const banco = process.env.TRANSFERENCIA_BANCO?.trim() || null;
  if (!alias && !cbu) return null;
  return { alias, cbu, titular, cuit, banco };
}

/**
 * El pago por transferencia se ofrece solo si está todo: a dónde transferir y
 * dónde guardar el pedido. Con una de las dos cosas a medias, mejor no mostrarlo.
 */
export function pagoTransferenciaActivo(): boolean {
  return (
    datosTransferencia() !== null &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim())
  );
}
