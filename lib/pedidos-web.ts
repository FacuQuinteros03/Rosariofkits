import "server-only";

/**
 * Defensas compartidas por las rutas públicas que reciben datos (/api/pedido y
 * /api/ruleta). Nada de esto reemplaza la verificación de Facu en el panel:
 * le pone techo a lo que puede hacer alguien que quiere molestar.
 */

/**
 * ¿El pedido viene de la propia web? Un navegador siempre manda `Origin` en un
 * POST; si viene y no coincide con el host, es otro sitio usando al visitante.
 * Sin `Origin` (curl, apps) se deja pasar: eso no es CSRF y lo frenan los
 * demás controles.
 */
export function esDelPropioSitio(request: Request): boolean {
  const origen = request.headers.get("origin");
  if (!origen) return true;
  try {
    return new URL(origen).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/** La IP del visitante. En Vercel la pone la plataforma y no se puede falsear. */
export function ipDe(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "desconocida"
  );
}

/**
 * Límite por IP en memoria. Vercel puede tener varias copias del servidor y
 * cada una cuenta por su lado, así que esto frena al apurado, no al
 * insistente: el tope que sí vale siempre es el de pedidos sin verificar, que
 * se cuenta en la base (ver /api/pedido).
 */
const intentos = new Map<string, number[]>();

export function superaLimite(clave: string, maximo: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const recientes = (intentos.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= maximo) {
    intentos.set(clave, recientes);
    return true;
  }
  recientes.push(ahora);
  intentos.set(clave, recientes);
  /* que el mapa no crezca para siempre */
  if (intentos.size > 5000) {
    for (const [k, v] of intentos) if (v.every((t) => ahora - t >= ventanaMs)) intentos.delete(k);
  }
  return false;
}

/**
 * El tipo de un archivo leído de sus primeros bytes. Lo que declara el
 * navegador (`file.type`) lo elige quien sube: un HTML se puede mandar
 * diciendo que es una foto. Devuelve la extensión y el tipo reales, o null si
 * no es ninguno de los que se aceptan como comprobante.
 */
export function tipoPorBytes(b: Uint8Array): { extension: string; mime: string } | null {
  const empieza = (...firma: number[]) => firma.every((v, i) => b[i] === v);
  const ascii = (desde: number, hasta: number) => String.fromCharCode(...b.slice(desde, hasta));

  if (empieza(0xff, 0xd8, 0xff)) return { extension: "jpg", mime: "image/jpeg" };
  if (empieza(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { extension: "png", mime: "image/png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { extension: "webp", mime: "image/webp" };
  if (ascii(0, 5) === "%PDF-") return { extension: "pdf", mime: "application/pdf" };
  /* las fotos del iPhone: caja "ftyp" con una marca HEIC/HEIF */
  if (ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|heim|heis|mif1|msf1|heif)$/.test(ascii(8, 12))) {
    return { extension: "heic", mime: "image/heic" };
  }
  return null;
}
