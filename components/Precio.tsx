import { esLanzamiento, type Producto } from "@/lib/types";
import { precio } from "@/lib/whatsapp";

/**
 * El precio de un producto con stock. Si se rebajó, va el anterior tachado
 * arriba y el ahorro en pesos al lado: el número grande es siempre el que se paga.
 *
 * El precio de lanzamiento no muestra ni el tachado ni el porcentaje: los dos
 * dicen "bajó de precio", que es justo lo que no se quiere contar. Va solo el
 * rótulo, para que se lea como una oportunidad de entrada.
 *
 * Sin estado ni hooks, así sirve igual en la tarjeta (cliente) que en la
 * ficha y en "Recién llegadas" (servidor).
 */
export function Precio({
  producto,
  tamano = "text-3xl",
}: {
  producto: Pick<Producto, "precio" | "precioAntes" | "nuevo">;
  /** clase de tamaño del número grande */
  tamano?: string;
}) {
  const { precio: actual, precioAntes } = producto;
  /* El ahorro va en pesos y sale siempre de la resta de los dos precios:
     "$7.500" no admite discusión, un porcentaje redondeado sí. */
  const ahorro = precioAntes ? precioAntes - actual : 0;

  return (
    <span className="flex flex-col gap-1">
      {esLanzamiento(producto) ? (
        <span className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-gold">
          Precio de lanzamiento
        </span>
      ) : (
        precioAntes &&
        ahorro > 0 && (
          <span className="flex flex-wrap items-center gap-x-2 text-[12.5px]">
            <s className="font-semibold tabular-nums text-muted">{precio(precioAntes)}</s>
            <span className="whitespace-nowrap font-bold tabular-nums text-bengala">
              Ahorrás {precio(ahorro)}
            </span>
          </span>
        )
      )}
      <span className={`font-display ${tamano} font-extrabold leading-none tabular-nums text-navy`}>
        {precio(actual)}
      </span>
    </span>
  );
}
