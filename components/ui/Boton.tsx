import type { ComponentProps, ReactNode } from "react";

type Variante = "whatsapp" | "acento" | "linea";
type Tamano = "sm" | "md" | "lg";

const BASE =
  "corte inline-flex items-center justify-center gap-2 font-titulo font-extrabold uppercase italic " +
  "tracking-[0.04em] leading-none transition-[transform,background-color] duration-150 " +
  "active:scale-[0.97]";

const VARIANTES: Record<Variante, string> = {
  /* el botón de pedir: el azul más vivo de la paleta, siempre con el ícono de WhatsApp */
  whatsapp: "bg-azul text-white hover:bg-azul-2",
  acento: "bg-marino text-white hover:bg-marino-2",
  /* sin borde: el corte diagonal se lo comería en los costados */
  linea: "bg-celeste-suave text-marino hover:bg-[#d3e6f9]",
};

const TAMANOS: Record<Tamano, string> = {
  sm: "min-h-11 px-3 text-[15px] whitespace-nowrap",
  md: "min-h-11 px-6 text-[17px]",
  lg: "min-h-[52px] px-8 text-xl",
};

/**
 * El botón del sistema nuevo. Siempre es un enlace o un <button> real: se le
 * pasa `href` y sale <a>; sin `href`, <button>.
 */
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
  const clases = `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`;
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
