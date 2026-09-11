/**
 * Sorteo y firma de los cupones. Server-only: usa `node:crypto` y el secreto,
 * así que nada de esto entra en el bundle del navegador.
 *
 * La idea de fondo: el cupón no se guarda en ningún lado. El código *es* el
 * comprobante — lleva adentro el premio y la fecha, y una firma que solo se
 * puede calcular con RULETA_SECRET. Inventarse un "RFK-15-..." a mano no
 * sirve de nada porque la firma no va a cerrar.
 */

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import {
  GAJOS,
  PREMIOS,
  VIGENCIA_HORAS,
  premioPorSigla,
  type Cupon,
  type Premio,
  type PremioId,
} from "./ruleta";

/**
 * Probabilidades, en partes de 100. Cambiar acá cambia el juego entero.
 * Ojo con subir el 15%: sobre una camiseta de $34.999 son $5.250, lo mismo
 * que la promo del short.
 *
 * El 2x1 está en la rueda pero su peso es 0: se ve y no sale. Es una decisión
 * del negocio, no un descuido — ponerle 1 lo vuelve real (uno de cada cien) y
 * el resto del código ya está listo para emitirlo.
 */
const PESOS: Record<PremioId, number> = {
  "5": 55,
  "10": 28,
  "15": 14,
  envio: 3,
  "2x1": 0,
};

const SECRETO = process.env.RULETA_SECRET?.trim();
const SECRETO_DEV = "rfk-desarrollo-no-usar-en-produccion";

/**
 * Sin secreto en producción la ruleta no arranca: emitir cupones firmados con
 * una clave pública que está en el repo es lo mismo que no firmarlos.
 */
export const RULETA_ACTIVA = Boolean(SECRETO) || process.env.NODE_ENV !== "production";

const clave = SECRETO || SECRETO_DEV;

/** Crockford: sin I, L, O ni U, para que nadie lea un 1 donde hay una I. */
const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function firmar(carga: string): string {
  const bytes = createHmac("sha256", clave).update(carga).digest();
  let bits = 0;
  let acumulado = 0;
  let salida = "";
  for (const byte of bytes) {
    acumulado = (acumulado << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO[(acumulado >>> (bits - 5)) & 31];
      bits -= 5;
      if (salida.length === 6) return salida;
    }
  }
  return salida;
}

/** Minutos desde epoch en base 36: cinco caracteres hasta el año 4000. */
const aMinutos = (ms: number) => Math.floor(ms / 60000).toString(36).toUpperCase();

/**
 * Cuatro caracteres al azar dentro del código.
 *
 * Sin esto, dos personas que giran en el mismo minuto y sacan el mismo premio
 * se llevan el mismo código — el resto del código solo depende del premio y de
 * la hora. Pasó en la primera prueba con dos teléfonos distintos.
 */
function alAzar(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

function sortear(): Premio {
  const total = Object.values(PESOS).reduce((s, n) => s + n, 0);
  let tirada = randomInt(total);
  for (const premio of PREMIOS) {
    tirada -= PESOS[premio.id];
    if (tirada < 0) return premio;
  }
  return PREMIOS[0];
}

/**
 * Qué gajo de la rueda le toca a este cupón.
 *
 * Sale de la propia firma en vez de sortearse aparte: así el mismo código
 * frena siempre en el mismo lugar, aunque la página se recargue en medio del
 * giro. El 5% ocupa cuatro gajos y hay que elegir uno.
 */
function gajoDe(codigo: string, premio: Premio): number {
  const posiciones = GAJOS.flatMap((id, i) => (id === premio.id ? [i] : []));
  const semilla = [...codigo].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  return posiciones[semilla % posiciones.length];
}

function armar(premio: Premio, emitido: number): Cupon {
  const ts = aMinutos(emitido);
  const azar = alAzar();
  const codigo = `RFK-${premio.sigla}-${ts}-${azar}-${firmar(`${premio.sigla}.${ts}.${azar}`)}`;
  return {
    codigo,
    premio,
    gajo: gajoDe(codigo, premio),
    vence: emitido + VIGENCIA_HORAS * 3600_000,
  };
}

/** Un giro. Devuelve el cupón ya firmado. */
export function girar(): Cupon {
  return armar(sortear(), Date.now());
}

export type Validacion =
  | { estado: "valido"; cupon: Cupon }
  | { estado: "vencido"; cupon: Cupon }
  | { estado: "invalido" };

/**
 * Verifica un código. Lo usa la página /cupon/... y también el GET del API,
 * que reconstruye el cupón a partir de la cookie en vez de guardarlo.
 */
export function verificar(entrada: string): Validacion {
  const codigo = entrada.trim().toUpperCase().replace(/\s+/g, "");
  const partes = /^RFK-(5|10|15|ENV|2X1)-([0-9A-Z]{1,8})-([0-9A-Z]{4})-([0-9A-Z]{6})$/.exec(codigo);
  if (!partes) return { estado: "invalido" };

  const [, sigla, ts, azar, firma] = partes;
  const premio = premioPorSigla(sigla);
  if (!premio) return { estado: "invalido" };

  const esperada = Buffer.from(firmar(`${sigla}.${ts}.${azar}`));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
    return { estado: "invalido" };
  }

  const minutos = parseInt(ts, 36);
  if (!Number.isFinite(minutos)) return { estado: "invalido" };

  const emitido = minutos * 60000;
  const cupon: Cupon = {
    codigo,
    premio,
    gajo: gajoDe(codigo, premio),
    vence: emitido + VIGENCIA_HORAS * 3600_000,
  };
  return { estado: cupon.vence > Date.now() ? "valido" : "vencido", cupon };
}
