/**
 * El API de la ruleta.
 *
 *   GET   ->  ¿este navegador ya giró? Devuelve el cupón si lo hay.
 *   POST  ->  gira con nombre y teléfono, y anota el cupón en la hoja CUPONES.
 *
 * El sorteo pasa acá y no en el navegador a propósito: si el cliente eligiera
 * el premio, alcanzaría con editar una variable en la consola para sacarse un
 * 15% cuando quiera. El navegador recibe el resultado ya cerrado y firmado, y
 * lo único que hace es frenar la rueda en el gajo que le dicen.
 *
 * Hay dos cerrojos, de distinta fuerza:
 *
 *   1. la cookie httpOnly, que el JS de la página no puede borrar. Frena el
 *      reintento fácil, pero no sobrevive a una ventana de incógnito;
 *   2. el teléfono en la hoja CUPONES, que sí. Un número que ya giró recibe
 *      siempre el mismo cupón, desde cualquier navegador. Y como el premio se
 *      canjea por WhatsApp desde ese número, inventar teléfonos tampoco sirve:
 *      queda un cupón que su dueño no puede usar.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { RULETA_ACTIVA, girar, verificar } from "@/lib/ruleta-server";
import { REGISTRO_ACTIVO, cuponDeTelefono, registrarCupon } from "@/lib/cupones";
import { normalizarTelefono } from "@/lib/telefono";
import type { Cupon } from "@/lib/ruleta";

/** Nada de esto se puede cachear: cada visita tiene su propia respuesta. */
export const dynamic = "force-dynamic";

const COOKIE = "rfk_giro";
/** La cookie es httpOnly: el JS de la página no la puede borrar para volver a girar. */
const DIAS = 120;

function respuesta(cupon: Cupon, nuevo: boolean) {
  return {
    activa: true,
    nuevo,
    cupon: {
      codigo: cupon.codigo,
      premio: cupon.premio.id,
      titulo: cupon.premio.titulo,
      frase: cupon.premio.frase,
      detalle: cupon.premio.detalle,
      gajo: cupon.gajo,
      vence: cupon.vence,
      vencido: cupon.vence <= Date.now(),
    },
  };
}

/** El cupón que ya tiene este navegador, si el de la cookie es de verdad. */
async function cuponGuardado(): Promise<Cupon | null> {
  const guardado = (await cookies()).get(COOKIE)?.value;
  if (!guardado) return null;
  const v = verificar(guardado);
  return v.estado === "invalido" ? null : v.cupon;
}

async function recordar(codigo: string) {
  (await cookies()).set(COOKIE, codigo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS * 24 * 3600,
  });
}

const error = (mensaje: string, status = 400) =>
  NextResponse.json({ activa: true, error: mensaje }, { status });

export async function GET() {
  if (!RULETA_ACTIVA) return NextResponse.json({ activa: false });
  const cupon = await cuponGuardado();
  return NextResponse.json(cupon ? respuesta(cupon, false) : { activa: true, cupon: null });
}

export async function POST(req: Request) {
  if (!RULETA_ACTIVA) return NextResponse.json({ activa: false }, { status: 503 });

  /* Ya giró en este navegador: se le devuelve lo mismo de siempre, sin premio
     nuevo y sin molestar a Google. */
  const previo = await cuponGuardado();
  if (previo) return NextResponse.json(respuesta(previo, false));

  const datos = await req.json().catch(() => ({}));
  const nombre = String(datos?.nombre ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
  const telefono = normalizarTelefono(String(datos?.telefono ?? ""));

  /* Del nombre solo se pide que tenga letras: no hay forma de saber si es el
     suyo, y pelearse con eso solo espanta gente. El que filtra es el teléfono. */
  if (nombre.length < 3 || !/\p{L}{2}/u.test(nombre)) {
    return error("Escribí tu nombre y apellido.");
  }
  if (!telefono) {
    return error("Ese número no parece un celular argentino. Ej: 341 617 8059.");
  }

  /* Sin registro configurado la ruleta anda igual, solo con la cookie: es el
     modo en el que se prueba la pantalla en localhost. */
  if (!REGISTRO_ACTIVO) {
    const cupon = girar();
    await recordar(cupon.codigo);
    return NextResponse.json(respuesta(cupon, true));
  }

  try {
    const yaTiene = await cuponDeTelefono(telefono);
    if (yaTiene) {
      const v = verificar(yaTiene.codigo);
      if (v.estado === "invalido") {
        /* El código anotado no cierra con la firma de hoy: pasa si se cambió
           RULETA_SECRET. Girar de nuevo dejaría dos cupones para la misma
           persona, así que es mejor que lo resuelva Facu a mano. */
        return error(
          "Ya tenés un cupón, pero no lo podemos leer. Escribinos y te lo pasamos.",
          409
        );
      }
      await recordar(v.cupon.codigo);
      return NextResponse.json(respuesta(v.cupon, false));
    }

    const cupon = girar();
    const anotado = await registrarCupon({
      nombre,
      telefono,
      codigo: cupon.codigo,
      premio: cupon.premio.titulo,
      vence: cupon.vence,
    });

    /* Puede volver otro código: son dos giros del mismo número en el mismo
       instante. Gana el que quedó anotado. */
    if (anotado.codigo !== cupon.codigo) {
      const v = verificar(anotado.codigo);
      if (v.estado !== "invalido") {
        await recordar(v.cupon.codigo);
        return NextResponse.json(respuesta(v.cupon, false));
      }
    }

    await recordar(cupon.codigo);
    return NextResponse.json(respuesta(cupon, true));
  } catch (e) {
    console.error("[ruleta] no se pudo hablar con el registro de cupones:", e);
    return error("La ruleta no está disponible en este momento. Probá en un rato.", 503);
  }
}
