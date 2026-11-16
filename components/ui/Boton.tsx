import type { ComponentProps, ReactNode } from "react";

type Variante = "whatsapp" | "acento" | "linea";
type Tamano = "md" | "lg";

/*
  Una sola regla de forma para todo el sitio: esquinas de 12 px y 48 px de alto
  como mínimo. El texto va en una línea; si no entra, se acorta el texto.
*/
export const BOTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 " +
  "text-[15px] font-bold leading-none transition-colors disabled:opacity-60";

export const BOTON_VARIANTE: Record<Variante, string> = {
  /* la acción principal: pedir. Azul vivo, siempre con el ícono de WhatsApp */
  whatsapp: "bg-wa text-white hover:bg-wa-dark",
  acento: "bg-marino text-white hover:bg-marino-2",
  /* secundaria: más suave, para que no le compita a la principal */
  linea: "bg-celeste-suave text-marino hover:bg-[#d3e6f9]",
};

const TAMANOS: Record<Tamano, string> = {
  md: "",
  lg: "sm:min-h-[52px] sm:px-7 sm:text-[16px]",
};

/** Siempre un enlace o un <button> real: con `href` sale <a>; sin `href`, <button>. */
export function Boton({
  variante = "acento",
  tamano = "md",
  className = "",
  children,
  ...resto
}: {
  variante?: Variante;
  tamano?: Tamano;
  children: ReactNode;
} & (ComponentProps<"a"> | ComponentProps<"button">)) {
  const clases = `${BOTON_BASE} ${BOTON_VARIANTE[variante]} ${TAMANOS[tamano]} ${className}`;
  if ("href" in resto && resto.href) {
    return (
      <a className={clases} {...(resto as ComponentProps<"a">)}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={clases} {...(resto as ComponentProps<"button">)}>
      {children}
    </button>
  );
}
