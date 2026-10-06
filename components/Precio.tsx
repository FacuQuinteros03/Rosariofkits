import type { Producto } from "@/lib/types";
import { precio } from "@/lib/whatsapp";

/**
 * El precio de un producto con stock. Si se rebajó, va el anterior tachado
 * arriba y el porcentaje al lado: el número grande es siempre el que se paga.
 *
 * Sin estado ni hooks, así sirve igual en la tarjeta (cliente) que en la
 * ficha y en "Recién llegadas" (servidor).
 */
export function Precio({
  producto,
  tamano = "text-3xl",
}: {
  producto: Pick<Producto, "precio" | "precioAntes">;
  /** clase de tamaño del número grande */
  tamano?: string;
}) {
  const { precio: actual, precioAntes } = producto;
  const descuento = precioAntes ? Math.round((1 - actual / precioAntes) * 100) : 0;
  /* un porcentaje chico no le dice nada a nadie: "−8%" pasa de largo,
     "−$4.000" se entiende de una. Desde el 10% el porcentaje pega más. */
  const etiqueta =
    precioAntes && descuento < 10 ? `−${precio(precioAntes - actual)}` : `−${descuento}%`;

  return (
    <span className="flex flex-col gap-1">
      {precioAntes && (
        <span className="flex items-center gap-2">
          <s className="text-[13px] font-semibold tabular-nums text-muted decoration-red-400/80 decoration-2">
            {precio(precioAntes)}
          </s>
          <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums text-red-300 ring-1 ring-inset ring-red-400/30">
            {etiqueta}
          </span>
        </span>
      )}
      <span className={`font-display ${tamano} font-bold leading-none tabular-nums text-ink`}>
        {precio(actual)}
      </span>
    </span>
  );
}
