import { HandCoins, MapPin, Truck } from "lucide-react";

const ITEMS = [
  { Icono: MapPin, titulo: "Entrega en mano", detalle: "En Rosario, a coordinar" },
  { Icono: Truck, titulo: "Envíos a todo el país", detalle: "Correo Argentino y Andreani" },
  { Icono: HandCoins, titulo: "Efectivo o transferencia", detalle: "Sin recargo" },
] as const;

export function TrustBar() {
  return (
    <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
      {ITEMS.map(({ Icono, titulo, detalle }) => (
        <li key={titulo} className="flex items-center gap-3 bg-surface px-4 py-3.5">
          <Icono className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight text-ink">{titulo}</p>
            <p className="mt-0.5 text-[11.5px] leading-tight text-muted">{detalle}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
