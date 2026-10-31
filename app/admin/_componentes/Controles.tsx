/** Piezas chicas del panel que sirven en el servidor y en el navegador. */

export function Tarjeta({
  titulo,
  accion,
  className = "",
  children,
}: {
  titulo?: string;
  accion?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(titulo || accion) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {titulo && (
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{titulo}</h2>
          )}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Chips({
  opciones,
  valor,
  onChange,
}: {
  opciones: string[];
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors
            ${valor === o ? "border-gold bg-gold/15 font-semibold text-gold" : "border-line text-muted hover:text-ink"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
