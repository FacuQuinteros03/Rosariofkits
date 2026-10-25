import { ChevronDown } from "lucide-react";
import type { Pregunta } from "@/lib/faq";

/**
 * Preguntas frecuentes de la ficha.
 *
 * Server Component con <details>: se abre y cierra sin JavaScript, y las
 * respuestas están en el HTML aunque estén plegadas, que es lo que lee Google.
 */
export function PreguntasFrecuentes({ preguntas }: { preguntas: Pregunta[] }) {
  return (
    <section className="mt-14" aria-labelledby="preguntas">
      <h2
        id="preguntas"
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
        Preguntas frecuentes
      </h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {preguntas.map((q) => (
          <details key={q.pregunta} className="group">
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5
                         text-[14.5px] font-semibold text-ink transition-colors hover:bg-surface
                         focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2
                         focus-visible:outline-gold [&::-webkit-details-marker]:hidden"
            >
              {q.pregunta}
              <ChevronDown
                className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-muted">{q.respuesta}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
