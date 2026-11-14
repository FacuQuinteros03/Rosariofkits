import Image from "next/image";
import { ArrowDown, MessageCircle, Plus, Ruler } from "lucide-react";
import { BarraAnuncios } from "@/components/ui/BarraAnuncios";
import { Boton } from "@/components/ui/Boton";
import { Insignia, type TipoInsignia } from "@/components/ui/Insignia";
import { SelectorAcento } from "./SelectorAcento";

/*
  Vidriera del sistema de diseño nuevo. No está enlazada desde ningún lado y
  va con noindex: es para aprobar paleta, tipografías y piezas base antes de
  aplicarlas al sitio. Los datos de las tarjetas son de muestra.
*/

const PALETA = [
  { nombre: "Noche", token: "noche", hex: "#070a11", uso: "Fondo del sitio" },
  { nombre: "Tribuna", token: "tribuna", hex: "#0d1420", uso: "Tarjetas y paneles" },
  { nombre: "Tribuna alta", token: "tribuna-2", hex: "#152033", uso: "Hover, campos" },
  { nombre: "Raya", token: "raya", hex: "#24324a", uso: "Bordes y divisores" },
  { nombre: "Marino", token: "marino", hex: "#0f2340", uso: "El azul del logo" },
  { nombre: "Marino luz", token: "marino-2", hex: "#1a3a68", uso: "Brillos, insignia Fan" },
  { nombre: "Celeste", token: "celeste", hex: "#7ccbf7", uso: "Marca, foco, Nuevo" },
  { nombre: "Tiza", token: "tiza", hex: "#f2f5f9", uso: "Texto principal" },
  { nombre: "Niebla", token: "niebla", hex: "#93a3b8", uso: "Texto secundario" },
  { nombre: "Acento", token: "acento", hex: "var", uso: "Botones que no son WhatsApp" },
  { nombre: "WhatsApp", token: "wa", hex: "#25d366", uso: "Solo para pedir por WhatsApp" },
  { nombre: "Bengala", token: "bengala", hex: "#ff5a47", uso: "Rebajas y urgencia" },
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

function Titulo({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end gap-3 border-b border-raya pb-3">
      <span className="font-titulo text-2xl font-extrabold italic leading-none text-celeste">{n}</span>
      <h2 className="font-titulo text-3xl font-extrabold uppercase italic leading-none sm:text-4xl">
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
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-raya bg-tribuna">
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={foto}
          alt={`${nombre}, vista de frente`}
          fill
          sizes="(min-width: 640px) 300px, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-0 top-3 flex flex-col items-start gap-1.5">
          {insignias.map((i) => (
            <Insignia key={i.texto} tipo={i.tipo} className="!pl-3 [clip-path:polygon(0_0,100%_0,calc(100%-0.7em)_100%,0_100%)]">
              {i.texto}
            </Insignia>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <h3 className="text-[14px] font-semibold leading-snug">{nombre}</h3>
        <div>
          {antes && (
            <p className="mb-1 flex flex-wrap items-center gap-x-2 text-[12.5px]">
              <s className="tabular-nums text-niebla">{antes.precio}</s>
              <span className="whitespace-nowrap font-bold tabular-nums text-bengala">Ahorrás {antes.ahorro}</span>
            </p>
          )}
          <p className="font-titulo text-[34px] font-extrabold italic leading-none tabular-nums">{precio}</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Talles disponibles">
          {talles.map((t, i) => (
            <button
              key={t}
              type="button"
              aria-pressed={i === 0}
              className={`min-h-9 min-w-10 rounded-md border px-2 text-[13px] font-bold ${
                i === 0 ? "border-celeste bg-celeste/15 text-tiza" : "border-raya text-niebla"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Boton variante="whatsapp" tamano="sm" href="#" className="w-full">
            <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} aria-hidden />
            Pedir<span className="max-[420px]:sr-only">por WhatsApp</span>
          </Boton>
          <Boton variante="linea" tamano="sm" className="w-full">
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
    <SelectorAcento>
      {/* ---------- muestra de portada ---------- */}
      <BarraAnuncios />
      <header className="reflectores relative overflow-hidden">
        <div className="cal absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-[1100px] px-4 pb-14 pt-6 sm:pb-20">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={40} height={40} className="h-9 w-9" />
            <span className="font-titulo text-xl font-extrabold uppercase italic tracking-wide">
              Rosario F Kits
            </span>
          </div>
          <p className="mt-14 font-titulo text-lg font-bold uppercase italic tracking-[0.14em] text-celeste sm:mt-20">
            Camisetas de fútbol · Rosario
          </p>
          <h1 className="mt-2 font-titulo text-[clamp(3.6rem,15vw,8.5rem)] font-black uppercase italic leading-[0.84] tracking-[-0.01em]">
            La que querés,
            <br />
            <span className="text-celeste">en mano.</span>
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-tiza/85">
            Stock real, talle por talle. Elegís, nos escribís y la tenés: entrega en Rosario o envío a
            todo el país.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Boton tamano="lg" href="#componentes" className="w-full sm:w-auto">
              Ver el stock
              <ArrowDown className="h-5 w-5" strokeWidth={2.8} aria-hidden />
            </Boton>
            <Boton tamano="lg" variante="linea" href="#componentes" className="w-full sm:w-auto">
              ¿Player o Fan?
            </Boton>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-16 px-4 py-14">
        {/* ---------- paleta ---------- */}
        <section>
          <Titulo n="01">Paleta</Titulo>
          <p className="mb-6 max-w-2xl text-[15px] leading-relaxed text-niebla">
            Un estadio de noche: fondo casi negro tirando a azul, el marino del logo como base y el
            celeste como luz. El verde queda reservado para WhatsApp. Probá los tres acentos con el
            selector de arriba.
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PALETA.map((c) => (
              <li key={c.token} className="overflow-hidden rounded-lg border border-raya bg-tribuna">
                <div className="h-16" style={{ background: `var(--color-${c.token})` }} />
                <div className="p-3">
                  <p className="text-[14px] font-bold">{c.nombre}</p>
                  {c.hex !== "var" && <p className="font-mono text-[12px] text-niebla">{c.hex}</p>}
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
              { v: "--fuente-barlow", n: "Barlow Condensed", nota: "La que propongo", it: true },
              { v: "--fuente-sofia", n: "Sofia Sans Extra Condensed", nota: "Alternativa: más apretada", it: true },
              { v: "--fuente-shoulders", n: "Big Shoulders", nota: "La actual, sin cursiva real", it: false },
            ].map((f) => (
              <div key={f.v} className="rounded-lg border border-raya bg-tribuna p-4">
                <p className="text-[12.5px] font-semibold text-celeste">{f.nota}</p>
                <p
                  className={`mt-2 text-[56px] font-black uppercase leading-[0.86] ${f.it ? "italic" : ""}`}
                  style={{ fontFamily: `var(${f.v})` }}
                >
                  Recién llegadas
                </p>
                <p
                  className={`mt-3 text-[34px] font-extrabold leading-none tabular-nums ${f.it ? "italic" : ""}`}
                  style={{ fontFamily: `var(${f.v})` }}
                >
                  $45.000
                </p>
                <p className="mt-3 text-[13px] text-niebla">{f.n}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-raya bg-tribuna p-4">
            <p className="text-[12.5px] font-semibold text-celeste">Texto: Archivo (la que ya usás)</p>
            <p className="mt-2 max-w-2xl text-[16px] leading-relaxed">
              Para leer se queda Archivo: es clara en pantallas chicas y ya está cargada. La versión
              Player es la que usan los jugadores: tela más liviana, calce al cuerpo y escudo
              termosellado. La Fan es la de la tribuna: más holgada y con el escudo bordado.
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
          <div className="mt-6 flex flex-wrap gap-2.5">
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
                  i === 0 ? "border-tiza bg-tiza text-noche" : "border-raya text-niebla"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* ---------- tarjetas ---------- */}
        <section>
          <Titulo n="04">Tarjeta de producto</Titulo>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
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

        {/* ---------- medidas ---------- */}
        <section>
          <Titulo n="05">Espacios y formas</Titulo>
          <ul className="grid gap-3 text-[14.5px] leading-relaxed text-tiza/90 sm:grid-cols-2">
            <li className="rounded-lg border border-raya bg-tribuna p-4">
              <b>La diagonal del logo.</b> Botones e insignias llevan el mismo corte inclinado que la
              RF. Es lo que hace que no parezca una plantilla.
            </li>
            <li className="rounded-lg border border-raya bg-tribuna p-4">
              <b>Escala de 4 px.</b> Separaciones de 4, 8, 12, 16, 24, 40 y 64. Entre secciones, 64 en
              celular y 96 en escritorio.
            </li>
            <li className="rounded-lg border border-raya bg-tribuna p-4">
              <b>Esquinas chicas.</b> 8 px en tarjetas y paneles, en vez de las redondeadas grandes de
              hoy: más deportivo, menos app.
            </li>
            <li className="rounded-lg border border-raya bg-tribuna p-4">
              <b>Todo se toca con el pulgar.</b> Ningún botón ni talle mide menos de 36 px de alto, y
              los de compra 44 o más.
            </li>
          </ul>
        </section>
      </main>
    </SelectorAcento>
  );
}
