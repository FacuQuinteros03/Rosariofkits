import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Carrito } from "@/components/Carrito";
import { Ruleta } from "@/components/Ruleta";
import { jsonLdSitio, jsonLdTienda } from "@/lib/seo";
import { SITIO } from "@/lib/site";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--fuente-sans",
  display: "swap",
});

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--fuente-display",
  display: "swap",
  fallback: ["Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: {
    default: "Rosario F Kits · Camisetas de fútbol en Rosario",
    template: "%s · Rosario F Kits",
  },
  description:
    "Camisetas de fútbol en Rosario: clubes, selecciones y retro, con stock real por talle y precio. Entrega en mano en Rosario y envíos a todo el país. Efectivo o transferencia, sin recargo.",
  keywords: [
    "camisetas de futbol",
    "camisetas de futbol Rosario",
    "camisetas retro",
    "camisetas de clubes",
    "camisetas de selecciones",
  ],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Rosario F Kits",
    title: "Rosario F Kits · Camisetas de fútbol en Rosario",
    description: "Lo que hay en mano hoy, con talles y precios.",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0a0c10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${archivo.variable} ${bigShoulders.variable}`}>
      <body className="min-h-dvh bg-ground font-sans text-ink antialiased">
        {/* quién vende: lo citan por @id las ofertas de cada ficha (lib/seo.ts) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLdTienda, jsonLdSitio]) }}
        />
        {children}
        {/* el boton flotante vive en todo el sitio, tambien en la ficha de producto */}
        <Ruleta />
        {/* el pedido de varias camisetas, abajo a la izquierda (la ruleta está a la derecha) */}
        <Carrito />
        {/*
          Visitas, de donde vienen y con que entran. Es de Vercel, sin cookies y
          sin seguir a nadie de un sitio a otro: cuenta paginas vistas, no
          personas. Los numeros salen en el panel de Vercel, pestaña Analytics,
          y hay que prenderlo ahi una vez.

          Va aca y no en la ruleta porque son dos preguntas distintas: esto mide
          TODA la web, la ruleta solo mide a los que se animan a girar (que en
          los numeros de hoy son siete).
        */}
        <Analytics />
      </body>
    </html>
  );
}
