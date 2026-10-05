"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Shirt } from "lucide-react";
import { useDeslizar } from "@/lib/deslizar";

/**
 * Las fotos de una tarjeta del catálogo, con puntitos y deslizar.
 *
 * Por qué existe: el proveedor manda 4 a 8 fotos por modelo, y antes la
 * tarjeta solo sabía mostrar dos — la de frente y, al pasar el mouse, la de
 * atrás. De la tercera en adelante no había forma de llegar salvo entrando a
 * la ficha. En el celular, que es de donde viene casi todo el tráfico,
 * directamente no había hover.
 *
 * **Va por encima del enlace estirado de la tarjeta.** El `<Link>` del título
 * lleva un `::after` que cubre la tarjeta entera en `z-[1]`, así que cualquier
 * gesto sobre la foto se lo come ese overlay. Por eso este bloque se monta en
 * `z-[2]` y se hace cargo él del tap: adentro tiene su propio `<Link>` a la
 * ficha, y las flechas y los puntitos quedan por arriba de ese.
 */

export function CarruselFotos({
  fotos,
  alt,
  href,
  prioridad = false,
  apagado = "",
  children,
}: {
  fotos: string[];
  alt: string;
  /** La ficha del producto. El tap sobre la foto lleva acá. */
  href: string;
  prioridad?: boolean;
  /** Clases extra para la imagen: así el agotado se sigue viendo apagado. */
  apagado?: string;
  /** Las chapitas de "Última unidad" y "Agotado", que van arriba de todo. */
  children?: React.ReactNode;
}) {
  const [indice, setIndice] = useState(0);
  /*
    Qué fotos ya se bajaron. Montar las ocho de cada tarjeta multiplicaría por
    ocho las descargas de una grilla que puede tener 40 modelos, y casi nadie
    va a mirarlas todas. Se monta la actual y sus vecinas, y lo ya montado no
    se desmonta para no volver a pedirlo al pasar.
  */
  const [montadas, setMontadas] = useState<Set<number>>(() => new Set([0]));

  const varias = fotos.length > 1;

  /** Deja montada la foto n y sus vecinas, para que pasar no muestre un hueco. */
  function mostrar(n: number) {
    setIndice(n);
    setMontadas((m) =>
      new Set(m)
        .add(n)
        .add((n + 1) % fotos.length)
        .add((n - 1 + fotos.length) % fotos.length)
    );
  }

  const mover = (paso: number) =>
    setIndice((i) => {
      const n = (i + paso + fotos.length) % fotos.length;
      mostrar(n);
      return n;
    });

  const deslizar = useDeslizar(mover, varias);

  if (!fotos.length) {
    return (
      <div className="relative aspect-square overflow-hidden bg-navy">
        <div className="grid h-full place-items-center text-navy-2">
          <Shirt className="h-12 w-12" strokeWidth={1.25} aria-hidden />
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className="group/foto relative z-[2] aspect-square overflow-hidden bg-navy"
      {...deslizar}
    >
      {fotos.map((f, i) =>
        montadas.has(i) ? (
          <Image
            key={f}
            src={f}
            alt={i === 0 ? alt : ""}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
            priority={prioridad && i === 0}
            aria-hidden={i !== indice}
            className={[
              "object-cover transition-[opacity,transform] duration-300",
              "group-hover:scale-[1.05]",
              i === indice ? "opacity-100" : "opacity-0",
              apagado,
            ].join(" ")}
          />
        ) : null
      )}

      {/* el tap abre la ficha, igual que antes de que esto existiera */}
      <Link href={href} aria-label={alt} className="absolute inset-0 z-[3]" tabIndex={-1} />

      {varias && (
        <>
          {/* en escritorio no hay dedo: flechas al pasar el mouse */}
          {[
            { paso: -1, Icono: ChevronLeft, lado: "left-1.5", texto: "Foto anterior" },
            { paso: 1, Icono: ChevronRight, lado: "right-1.5", texto: "Foto siguiente" },
          ].map(({ paso, Icono, lado, texto }) => (
            <button
              key={texto}
              type="button"
              onClick={() => mover(paso)}
              aria-label={texto}
              className={[
                "absolute top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 place-items-center",
                "rounded-full bg-black/55 text-white/90 backdrop-blur-sm transition-colors",
                "hover:bg-black/80 focus-visible:outline focus-visible:outline-2",
                "focus-visible:outline-white sm:grid sm:opacity-0 sm:group-hover/foto:opacity-100",
                lado,
              ].join(" ")}
            >
              <Icono className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            </button>
          ))}

          {/*
            Los puntitos. Son el único aviso de que hay más fotos: sin ellos
            nadie adivina que la tarjeta se desliza. Con muchas fotos el ancho
            se iría de la tarjeta, así que a partir de seis se achican.
          */}
          {/* un velo apenas, para que los puntitos se vean tanto sobre el pasto
              verde como sobre una camiseta blanca */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[9] h-10
                       bg-gradient-to-t from-black/45 to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1"
            role="group"
            aria-label={`Foto ${indice + 1} de ${fotos.length}`}
          >
            {fotos.map((f, i) => (
              <button
                key={f}
                type="button"
                onClick={() => mostrar(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === indice}
                className={[
                  "rounded-full transition-all",
                  fotos.length > 6 ? "h-1 w-1" : "h-1.5 w-1.5",
                  i === indice
                    ? "bg-white shadow-sm " + (fotos.length > 6 ? "w-3" : "w-4")
                    : "bg-white/55 hover:bg-white/80",
                ].join(" ")}
              />
            ))}
          </div>
        </>
      )}

      {children}
    </div>
  );
}
