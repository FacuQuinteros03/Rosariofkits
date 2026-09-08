/**
 * Glifo de Instagram.
 *
 * Va a mano porque lucide-react sacó los íconos de marcas en la v1 y no hay
 * reemplazo. Sigue la misma geometría que el resto del set —caja de 24,
 * trazo de currentColor, puntas redondeadas— para que no desentone al lado
 * de los otros íconos.
 */
export function IconoInstagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
