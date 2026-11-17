import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Producto } from "@/lib/types";
import { BOX, PRECIO_BOX, tallesBox } from "@/lib/box";
import { precio } from "@/lib/whatsapp";
import { BOTON_BASE } from "./ui/Boton";

/**
 * La Mystery Box en la portada. Es un producto más, pero con un bloque propio
 * para que se vea: si no queda ninguna camiseta para armarla, no aparece.
 */
export function BannerBox({ productos }: { productos: Producto[] }) {
  if (tallesBox(productos, "cualquiera").length === 0) return null;

  return (
    <section aria-labelledby="mystery-box" className="mt-12">
      <Link
        href={BOX.ruta}
        className="group grid grid-cols-1 overflow-hidden rounded-xl bg-marino text-white sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      >
        <div className="relative aspect-[16/10] sm:aspect-auto sm:min-h-[300px]">
          <Image
            src={BOX.icono}
            alt=""
            fill
            sizes="(min-width: 640px) 480px, 100vw"
            className="object-contain transition duration-500 group-hover:scale-[1.04]"
          />
        </div>
        <div className="flex flex-col justify-center gap-3 px-5 py-6 sm:px-8">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-celeste">Nuevo · camiseta sorpresa</p>
          <h2 id="mystery-box" className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">
            {BOX.nombre}
          </h2>
          <p className="max-w-[44ch] text-[15px] leading-relaxed text-white/85">
            Elegís versión, tipo y talle, y nos decís qué equipos no querés. La camiseta la elegimos nosotros.
          </p>
          <p className="text-[15px] font-semibold">
            Fan {precio(PRECIO_BOX.fan)} · Player {precio(PRECIO_BOX.player)}
          </p>
          <span className={`${BOTON_BASE} mt-1 self-start bg-white text-marino group-hover:bg-celeste-suave`}>
            Armá tu box
            <ArrowRight className="h-5 w-5" strokeWidth={2.4} aria-hidden />
          </span>
        </div>
      </Link>
    </section>
  );
}
