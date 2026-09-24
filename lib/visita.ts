/**
 * De donde llego y con que, para anotarlo junto al cupon de la ruleta.
 *
 * Son funciones puras: entran strings, salen strings. Asi se pueden probar sin
 * levantar un servidor, que es la unica forma de saber que el dia que Instagram
 * cambie su navegador nos vamos a enterar.
 *
 * NO se guarda la IP. Lo que sirve para decidir es "vino de Instagram" o "entro
 * desde un iPhone"; la IP no agrega nada de eso y en cambio convierte la hoja
 * CUPONES en una lista de datos personales que hay que cuidar. La zona sale del
 * codigo de area del telefono (ver `zonaDeTelefono`), que ademas es mas exacta.
 */

/**
 * LA TRAMPA: el `referer` que le llega al API **no** es de donde vino la
 * persona.
 *
 * El giro se dispara con un `fetch()` desde la propia pagina, asi que el header
 * `referer` de ese pedido dice `rosariofkits.vercel.app` siempre, venga de
 * Instagram o de Marte. El origen real lo sabe el navegador en
 * `document.referrer`, y por eso lo manda el componente adentro del body.
 *
 * Por suerte hay una segunda pista que no depende de eso y es mas firme: los
 * navegadores embebidos de Instagram y Facebook se declaran en el user-agent.
 * Cuando aparecen, gana esa — que la gente abra el link adentro de Instagram es
 * justamente el caso que interesa medir.
 */
export function deDondeVino(userAgent: string, referrerDelNavegador: string): string {
  const ua = (userAgent || "").toLowerCase();

  // el navegador de adentro de la app; no hay forma de falsearlo sin querer
  if (ua.includes("instagram")) return "Instagram";
  if (ua.includes("fbav") || ua.includes("fban") || ua.includes("fb_iab")) return "Facebook";

  const ref = (referrerDelNavegador || "").trim();
  if (!ref) return "Directo";

  let host: string;
  try {
    host = new URL(ref).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Directo";
  }

  const conocidos: [RegExp, string][] = [
    [/(^|\.)instagram\.com$/, "Instagram"],
    [/(^|\.)facebook\.com$/, "Facebook"],
    [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"],
    [/(^|\.)google\./, "Google"],
    [/(^|\.)tiktok\.com$/, "TikTok"],
    [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "X"],
    [/(^|\.)bing\.com$/, "Bing"],
    [/(^|\.)youtube\.com$/, "YouTube"],
  ];
  for (const [patron, nombre] of conocidos) if (patron.test(host)) return nombre;

  /* Navegando dentro del propio sitio: no dice de donde vino, dice que ya
     estaba adentro. Es lo que pasa si gira despues de mirar el catalogo. */
  if (host.includes("rosariofkits")) return "Ya estaba en la web";

  return host;
}

/**
 * Con que entro.
 *
 * Ojo con esperar el modelo del telefono: **Chrome en Android ya no lo dice**.
 * Desde 2023 le reporta `Android 10; K` a todos los sitios, tengas el equipo
 * que tengas. Lo unico que se puede afirmar es el tipo de aparato.
 */
export function conQueEntro(userAgent: string): string {
  const ua = userAgent || "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Android" : "Tablet Android";
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return "Compu";
  return "";
}

/** El pais que resuelve Vercel por IP. A nivel pais la IP no se equivoca casi nunca. */
export function paisDe(cabecera: string | null): string {
  const p = (cabecera || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(p) ? p : "";
}
