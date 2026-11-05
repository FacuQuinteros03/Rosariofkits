"use client";

import { useEffect, useState } from "react";

/**
 * Cuánto falta para que termine el Cyber, en días, horas, minutos y segundos.
 *
 * No se dibuja en el servidor: la hora del servidor y la del navegador nunca
 * coinciden, y el número distinto haría saltar la hidratación. Hasta que monta
 * ocupa su lugar con guiones, así la tarjeta no cambia de alto.
 */
export function CuentaRegresiva({
  hasta,
  chico = false,
}: {
  hasta: number;
  chico?: boolean;
}) {
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    const tic = () => setAhora(Date.now());
    const primero = setTimeout(tic, 0);
    const id = setInterval(tic, 1000);
    return () => {
      clearTimeout(primero);
      clearInterval(id);
    };
  }, []);

  const resto = ahora === null ? null : Math.max(0, hasta - ahora);
  const partes: [string, number | null][] = [
    ["días", resto === null ? null : Math.floor(resto / 86_400_000)],
    ["hs", resto === null ? null : Math.floor(resto / 3_600_000) % 24],
    ["min", resto === null ? null : Math.floor(resto / 60_000) % 60],
    ["seg", resto === null ? null : Math.floor(resto / 1000) % 60],
  ];

  return (
    <span
      className="flex gap-1.5"
      role="timer"
      aria-label="Tiempo que falta para que termine el Cyber Monday"
    >
      {partes.map(([nombre, n]) => (
        <span
          key={nombre}
          className={`flex flex-col items-center rounded-lg bg-black/45 ring-1 ring-inset ring-cyan-300/25
                      ${chico ? "min-w-[2.6rem] px-1.5 py-1" : "min-w-[3.4rem] px-2 py-1.5"}`}
        >
          <span
            className={`font-display font-bold leading-none tabular-nums text-white
                        ${chico ? "text-xl" : "text-3xl"}`}
          >
            {n === null ? "--" : String(n).padStart(2, "0")}
          </span>
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200/80">
            {nombre}
          </span>
        </span>
      ))}
    </span>
  );
}
