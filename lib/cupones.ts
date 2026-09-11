/**
 * El registro de cupones, que vive en la hoja CUPONES del libro.
 *
 * Del otro lado hay un Apps Script publicado (apps-script/cupones/Cupones.gs),
 * distinto del de cargar ventas. Server-only: la URL y el token no llevan
 * NEXT_PUBLIC_ justamente para que no salgan del servidor.
 *
 * Si las variables no están configuradas, el registro queda apagado y la
 * ruleta funciona igual con la cookie sola. Sirve para probar la pantalla en
 * localhost sin montar nada en Google.
 */

const URL_APPS_SCRIPT = process.env.CUPONES_URL?.trim();
const TOKEN = process.env.CUPONES_TOKEN?.trim();

export const REGISTRO_ACTIVO = Boolean(URL_APPS_SCRIPT && TOKEN);

/** Apps Script no es rápido: 1 a 2 segundos es lo normal, 10 es que se colgó. */
const ESPERA_MS = 10_000;

export type CuponRegistrado = {
  codigo: string;
  nombre: string;
  telefono: string;
  premio: string;
  usado: boolean;
};

type Respuesta = {
  ok: boolean;
  error?: string;
  cupon?: CuponRegistrado | null;
  yaEstaba?: boolean;
};

async function llamar(cuerpo: Record<string, unknown>): Promise<Respuesta> {
  if (!REGISTRO_ACTIVO) throw new Error("El registro de cupones no está configurado.");

  /* Apps Script contesta con un 302 al resultado ya calculado; fetch lo sigue
     solo. El POST se ejecuta igual en el primer pedido. */
  const r = await fetch(URL_APPS_SCRIPT!, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...cuerpo, token: TOKEN }),
    signal: AbortSignal.timeout(ESPERA_MS),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Apps Script respondió ${r.status}`);

  const d = (await r.json()) as Respuesta;
  if (!d.ok) throw new Error(d.error || "El registro rechazó el pedido");
  return d;
}

/** El cupón que ya tiene este teléfono, o null si nunca giró. */
export async function cuponDeTelefono(telefono: string): Promise<CuponRegistrado | null> {
  const d = await llamar({ accion: "buscar", telefono });
  return d.cupon ?? null;
}

/** Para la pantalla de validar: quién es el dueño de este código. */
export async function cuponDeCodigo(codigo: string): Promise<CuponRegistrado | null> {
  const d = await llamar({ accion: "porCodigo", codigo });
  return d.cupon ?? null;
}

/**
 * Anota el cupón recién sorteado.
 *
 * Puede devolver uno distinto al que se le mandó: si el mismo teléfono giró
 * dos veces en el mismo instante, del otro lado gana el primero y acá vuelve
 * ese. Es la respuesta correcta, no un error — hay que usar el que devuelve.
 */
export async function registrarCupon(datos: {
  nombre: string;
  telefono: string;
  codigo: string;
  premio: string;
  vence: number;
}): Promise<CuponRegistrado> {
  const d = await llamar({ accion: "registrar", ...datos });
  if (!d.cupon) throw new Error("El registro no devolvió el cupón");
  return d.cupon;
}
