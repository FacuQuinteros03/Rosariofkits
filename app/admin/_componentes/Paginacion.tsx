import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Anterior / siguiente por URL (?p=2), así se puede volver atrás con el navegador. */
export function Paginacion({
  pagina,
  paginas,
  href,
}: {
  pagina: number;
  paginas: number;
  href: (p: number) => string;
}) {
  if (paginas <= 1) return null;
  const boton = "inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm";
  return (
    <nav className="flex items-center justify-center gap-3 pt-2">
      {pagina > 1 ? (
        <Link href={href(pagina - 1)} className={`${boton} hover:border-muted`}><ChevronLeft className="h-4 w-4" /> Anterior</Link>
      ) : (
        <span className={`${boton} opacity-30`}><ChevronLeft className="h-4 w-4" /> Anterior</span>
      )}
      <span className="text-sm text-muted">{pagina} de {paginas}</span>
      {pagina < paginas ? (
        <Link href={href(pagina + 1)} className={`${boton} hover:border-muted`}>Siguiente <ChevronRight className="h-4 w-4" /></Link>
      ) : (
        <span className={`${boton} opacity-30`}>Siguiente <ChevronRight className="h-4 w-4" /></span>
      )}
    </nav>
  );
}

/** Lee ?p= y lo deja entre 1 y la última página. */
export function paginar<T>(lista: T[], p: string | undefined, porPagina: number) {
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const pagina = Math.min(Math.max(1, Number(p) || 1), paginas);
  return { pagina, paginas, items: lista.slice((pagina - 1) * porPagina, pagina * porPagina) };
}
