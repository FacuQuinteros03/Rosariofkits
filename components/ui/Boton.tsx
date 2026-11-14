import type { ComponentProps, ReactNode } from "react";

type Variante = "whatsapp" | "acento" | "linea";
type Tamano = "sm" | "md" | "lg";

const BASE =
  "corte inline-flex items-center justify-center gap-2 font-titulo font-extrabold uppercase italic " +
  "tracking-[0.04em] leading-none transition-[filter,transform,background-color] duration-150 " +
  "active:scale-[0.97] hover:brightness-110";

const VARIANTES: Record<Variante, string> = {
  /* el verde queda solo para WhatsApp: es el color que la gente ya asocia a "escribir" */
  whatsapp: "bg-wa text-black",
  acento: "bg-acento text-acento-tinta",
  linea: "bg-white/[0.07] text-tiza ring-1 ring-inset ring-white/25 hover:bg-white/[0.12]",
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
