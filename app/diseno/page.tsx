import Image from "next/image";
import { ArrowDown, MessageCircle, Plus, Ruler } from "lucide-react";
import { BarraAnuncios } from "@/components/ui/BarraAnuncios";
import { Boton } from "@/components/ui/Boton";
import { HeroScroll } from "@/components/HeroScroll";
import { Insignia, type TipoInsignia } from "@/components/ui/Insignia";

/*
  Vidriera del sistema de diseño nuevo. No está enlazada desde ningún lado y
  va con noindex: es para aprobar paleta, tipografías y piezas base antes de
  aplicarlas al sitio. Los datos de las tarjetas son de muestra.
*/

const PALETA = [
  { nombre: "Fondo", token: "fondo", hex: "#f5f7fa", uso: "Fondo del sitio" },
  { nombre: "Panel", token: "panel", hex: "#ffffff", uso: "Tarjetas y paneles" },
  { nombre: "Raya", token: "raya", hex: "#d9e1ec", uso: "Bordes y divisores" },
  { nombre: "Celeste suave", token: "celeste-suave", hex: "#e3f0fc", uso: "Fondos de apoyo, hover" },
  { nombre: "Celeste", token: "celeste", hex: "#7cc4f5", uso: "Detalles y brillos" },
  { nombre: "Azul", token: "azul", hex: "#1a5fd0", uso: "Pedir por WhatsApp, enlaces" },
  { nombre: "Marino", token: "marino", hex: "#0f2340", uso: "El del logo: títulos y botones" },
  { nombre: "Tinta", token: "tinta", hex: "#0b1a2e", uso: "Texto principal" },
  { nombre: "Niebla", token: "niebla", hex: "#55637a", uso: "Texto secundario" },
  { nombre: "Bengala", token: "bengala", hex: "#cf2a17", uso: "Solo rebajas y urgencia" },
] as const;

const INSIGNIAS: { tipo: TipoInsignia; texto: string }[] = [
  { tipo: "nuevo", texto: "Nuevo" },
  { tipo: "lanzamiento", texto: "Lanzamiento" },
  { tipo: "rebajada", texto: "Rebajada" },
  { tipo: "ultima", texto: "Última unidad" },
  { tipo: "quedan", texto: "Quedan 2" },
  { tipo: "agotado", texto: "Agotado" },
  { tipo: "player", texto: "Player" },
  { tipo: "fan", texto: "Fan" },
];

/** El logo es un PNG blanco: se usa de máscara para pintarlo del color que haga falta. */
function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block [mask:url(/logo.png)_center/contain_no-repeat] ${className}`}
    />
  );
}

function Titulo({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end gap-3 border-b border-raya pb-3">
      <span className="font-titulo text-2xl font-extrabold italic leading-none text-azul">{n}</span>
      <h2 className="font-titulo text-3xl font-extrabold uppercase italic leading-none text-marino sm:text-4xl">
        {children}
      </h2>
    </div>
  );
}

function Tarjeta({
  foto,
  nombre,
  insignias,
  precio,
  antes,
  talles,
}: {
  foto: string;
  nombre: string;
  insignias: { tipo: TipoInsignia; texto: string }[];
  precio: string;
  antes?: { precio: string; ahorro: string };
  talles: string[];
}) {
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-lg border border-raya bg-panel
                 shadow-[0_1px_2px_rgb(15_35_64/0.06)] transition-shadow duration-300
                 hover:shadow-[0_14px_34px_-12px_rgb(15_35_64/0.28)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-panel-2">
        <Image
          src={foto}
          alt={`${nombre}, vista de frente`}
          fill
          sizes="(min-width: 1024px) 430px, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-0 top-3 flex flex-col items-start gap-1.5">
          {insignias.map((i) => (
            <Insignia
              key={i.texto}
              tipo={i.tipo}
              className="[clip-path:polygon(0_0,100%_0,calc(100%-0.7em)_100%,0_100%)]"
            >
              {i.texto}
            </Insignia>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3.5 lg:gap-4 lg:p-5">
        <h3 className="text-[14px] font-semibold leading-snug lg:text-[17px]">{nombre}</h3>
        <div>
          {antes && (
            <p className="mb-1 flex flex-wrap items-center gap-x-2 text-[12.5px] lg:text-[14px]">
              <s className="tabular-nums text-niebla">{antes.precio}</s>
              <span className="whitespace-nowrap font-bold tabular-nums text-bengala">
                Ahorrás {antes.ahorro}
              </span>
            </p>
          )}
          <p className="font-titulo text-[34px] font-extrabold italic leading-none tabular-nums text-marino lg:text-[44px]">
            {precio}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Talles disponibles">
          {talles.map((t, i) => (
            <button
              key={t}
              type="button"
              aria-pressed={i === 0}
              className={`min-h-9 min-w-10 rounded-md border px-2 text-[13px] font-bold ${
                i === 0
                  ? "border-marino bg-marino text-white"
                  : "border-raya bg-panel text-niebla hover:border-marino/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Boton variante="whatsapp" tamano="sm" href="#" className="w-full lg:min-h-[50px] lg:text-[18px]">
            <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} aria-hidden />
            <span>
              Pedir<span className="max-sm:sr-only"> por WhatsApp</span>
            </span>
          </Boton>
          <Boton variante="linea" tamano="sm" className="w-full lg:min-h-[50px] lg:text-[18px]">
            <Plus className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} aria-hidden />
            Al pedido
          </Boton>
        </div>
      </div>
    </article>
  );
}

export default function Page() {
  return (
    <>
      {/* ---------- muestra de portada ---------- */}
      <BarraAnuncios />
      <section className="hero-scroll relative bg-fondo" aria-label="Portada">
        <div className="hero-escenario overflow-hidden lg:grid lg:grid-cols-[1.05fr_0.95fr]">
          {/* la camiseta: fondo entero en celular, panel con el corte del logo en escritorio */}
          <div className="absolute inset-0 lg:relative lg:order-2 lg:[clip-path:polygon(16%_0,100%_0,100%_100%,0_100%)]">
            <HeroScroll alt="Tela de una camiseta azul, vista de cerca" />
            {/* velo: en celular el texto va encima de la tela */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-marino via-marino/70 via-45% to-marino/10 lg:hidden"
            />
          </div>

          <div className="resplandor-lg relative flex h-full flex-col px-5 pb-24 pt-5 text-white lg:order-1 lg:px-12 lg:pb-12 lg:pt-8 lg:text-marino xl:px-20">
            <div className="flex items-center gap-3">
              <Logo className="h-9 w-9 bg-white lg:bg-marino" />
              <span className="font-titulo text-xl font-extrabold uppercase italic tracking-wide">
                Rosario F Kits
              </span>
            </div>

            <div className="mt-auto lg:my-auto">
              {/* la línea de arriba del título cambia con el recorrido */}
              <p className="relative h-7 font-titulo text-lg font-bold uppercase italic tracking-[0.14em] text-celeste lg:text-azul">
                <span className="hero-etapa absolute inset-0" data-n="1">Camisetas de fútbol · Rosario</span>
                <span className="hero-etapa absolute inset-0" data-n="2" aria-hidden>Mirala de cerca</span>
                <span className="hero-etapa absolute inset-0" data-n="3" aria-hidden>Así te llega</span>
              </p>
              <h1 className="mt-1 font-titulo text-[clamp(3.4rem,15vw,6rem)] font-black xl:text-[6.6rem] uppercase italic leading-[0.84] tracking-[-0.01em]">
                La que querés,
                <br />
                <span className="text-celeste lg:text-azul">en mano.</span>
              </h1>
              <p className="mt-4 max-w-md text-[16.5px] leading-relaxed text-white/90 lg:text-tinta/80">
                Stock real, talle por talle. Elegís, nos escribís y la tenés: entrega en Rosario o
                envío a todo el país.
              </p>
              <div className="mt-6 flex gap-2.5 sm:gap-3">
                <Boton tamano="lg" variante="claro" href="#componentes" className="flex-1 !px-4 sm:flex-none sm:!px-8 lg:!bg-marino lg:!text-white">
                  Ver el stock
                  <ArrowDown className="h-5 w-5" strokeWidth={2.8} aria-hidden />
                </Boton>
                <Boton tamano="lg" variante="whatsapp" href="#componentes" className="flex-1 !px-4 sm:flex-none sm:!px-8">
                  <MessageCircle className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                  Escribinos
                </Boton>
              </div>
            </div>
          </div>

          <div aria-hidden className="hero-barra absolute inset-x-0 bottom-0 h-1 bg-celeste" />
        </div>
      </section>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-16 px-4 py-14">
        {/* ---------- paleta ---------- */}
        <section>
          <Titulo n="01">Paleta</Titulo>
          <p className="mb-6 max-w-2xl text-[15px] leading-relaxed text-niebla">
            Blanco con azules: el marino del logo para títulos y botones, un azul más vivo para pedir
            y el celeste para los detalles. El rojo aparece solo en rebajas y últimas unidades.
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {PALETA.map((c) => (
              <li key={c.token} className="overflow-hidden rounded-lg border border-raya bg-panel">
                <div className="h-16 border-b border-raya" style={{ background: `var(--color-${c.token})` }} />
                <div className="p-3">
                  <p className="text-[14px] font-bold">{c.nombre}</p>
                  <p className="font-mono text-[12px] text-niebla">{c.hex}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-niebla">{c.uso}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- tipografía ---------- */}
        <section>
          <Titulo n="02">Tipografías</Titulo>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { v: "--fuente-barlow", n: "A · Barlow Condensed", nota: "La que está puesta", it: true },
              { v: "--fuente-sofia", n: "B · Sofia Sans Extra Condensed", nota: "Más apretada", it: true },
              { v: "--fuente-shoulders", n: "C · Big Shoulders", nota: "La del sitio actual", it: false },
            ].map((f) => (
              <div key={f.v} className="rounded-lg border border-raya bg-panel p-4">
                <p className="text-[12.5px] font-semibold text-azul">{f.nota}</p>
                <p
                  className={`mt-2 text-[56px] font-black uppercase leading-[0.86] text-marino ${f.it ? "italic" : ""}`}
                  style={{ fontFamily: `var(${f.v})` }}
                >
                  Recién llegadas
                </p>
                <p
                  className={`mt-3 text-[34px] font-extrabold leading-none tabular-nums text-marino ${f.it ? "italic" : ""}`}
                  style={{ fontFamily: `var(${f.v})` }}
                >
                  $45.000
                </p>
                <p className="mt-3 text-[13px] text-niebla">{f.n}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-raya bg-panel p-4">
            <p className="text-[12.5px] font-semibold text-azul">Texto: Archivo (la que ya usás)</p>
            <p className="mt-2 max-w-2xl text-[16px] leading-relaxed">
              Para leer se queda Archivo: es clara en pantallas chicas y ya está cargada. Así se ve un
              párrafo de descripción de producto, con el largo de línea que va a tener en la ficha.
            </p>
            <p className="mt-2 text-[13.5px] text-niebla">
              Secundario en Niebla · 13,5 px · para aclaraciones, talles agotados y letra chica.
            </p>
          </div>
        </section>

        {/* ---------- componentes ---------- */}
        <section id="componentes" className="scroll-mt-16">
          <Titulo n="03">Botones e insignias</Titulo>
          <div className="flex flex-wrap items-center gap-3">
            <Boton variante="whatsapp" tamano="lg" href="#componentes">
              <MessageCircle className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              Pedir por WhatsApp
            </Boton>
            <Boton tamano="lg">Ver el stock</Boton>
            <Boton variante="linea" tamano="lg">
              <Ruler className="h-5 w-5" strokeWidth={2.2} aria-hidden />
              Guía de talles
            </Boton>
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5 rounded-lg bg-marino-2/90 p-4">
            {INSIGNIAS.map((i) => (
              <Insignia key={i.texto} tipo={i.tipo}>
                {i.texto}
              </Insignia>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtro de muestra">
            {["Todas", "Clubes", "Selecciones", "Retro", "Shorts"].map((c, i) => (
              <button
                key={c}
                type="button"
                aria-pressed={i === 0}
                className={`min-h-10 rounded-full border px-4 text-[14px] font-semibold ${
                  i === 0
                    ? "border-marino bg-marino text-white"
                    : "border-raya bg-panel text-niebla hover:border-marino/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* ---------- tarjetas ---------- */}
        <section className="lg:-mx-[110px]">
          <Titulo n="04">Tarjeta de producto</Titulo>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6">
            <Tarjeta
              foto="/fotos/3029.jpg"
              nombre="Camiseta Argentina titular con dorsal Messi 10"
              insignias={[{ tipo: "player", texto: "Player" }, { tipo: "nuevo", texto: "Nuevo" }]}
              precio="$52.500"
              talles={["M", "L", "XL"]}
            />
            <Tarjeta
              foto="/fotos/6001.jpg"
              nombre="Camiseta River Plate tricolor"
              insignias={[{ tipo: "rebajada", texto: "Rebajada" }, { tipo: "quedan", texto: "Quedan 2" }]}
              precio="$45.000"
              antes={{ precio: "$52.500", ahorro: "$7.500" }}
              talles={["L", "XL"]}
            />
            <Tarjeta
              foto="/fotos/3036.jpg"
              nombre="Camiseta Tottenham alternativa"
              insignias={[{ tipo: "fan", texto: "Fan" }, { tipo: "ultima", texto: "Última unidad" }]}
              precio="$42.500"
              talles={["XL"]}
            />
          </div>
          <p className="mt-4 text-[13px] text-niebla">
            Nombres, precios y etiquetas de muestra. Las fotos son las tuyas, tal cual están hoy.
          </p>
        </section>
      </main>
    </>
  );
}
