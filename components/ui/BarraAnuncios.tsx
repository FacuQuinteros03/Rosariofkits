import { HandCoins, PackageSearch, Truck } from "lucide-react";

const ANUNCIOS = [
  { Icono: Truck, texto: "Envíos a todo el país por Correo Argentino y Andreani" },
  { Icono: HandCoins, texto: "Efectivo o transferencia, sin recargo" },
  { Icono: PackageSearch, texto: "¿No está la tuya? La traemos por encargue" },
] as const;

/**
 * La barra de arriba de todo. Los tres mensajes se turnan con CSS (nada de
 * JS): con movimiento reducido queda fijo el primero. Los lectores de
 * pantalla reciben la lista completa, sin esperar turnos.
 */
export function BarraAnuncios() {
  return (
    <div className="relative h-9 overflow-hidden bg-marino text-white">
      <ul className="sr-only">
        {ANUNCIOS.map((a) => (
          <li key={a.texto}>{a.texto}</li>
        ))}
      </ul>
      <div aria-hidden className="relative mx-auto h-full max-w-[1280px]">
        {ANUNCIOS.map(({ Icono, texto }, i) => (
          <p
            key={texto}
            className="anuncio absolute inset-0 flex items-center justify-center gap-2 px-4 text-center
                       text-[12.5px] font-semibold"
            style={{ animationDelay: `${i * 4}s` }}
          >
            <Icono className="h-4 w-4 shrink-0 text-celeste" strokeWidth={2} />
            {texto}
          </p>
        ))}
      </div>
    </div>
  );
}
