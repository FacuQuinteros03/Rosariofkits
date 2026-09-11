import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import "./globals.css";
import { Ruleta } from "@/components/Ruleta";
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
    "Camisetas de fútbol retro y actuales en Rosario. Stock real con talles y precios, entrega en mano y envíos a todo el país.",
  keywords: ["camisetas de futbol", "Rosario", "camisetas retro", "indumentaria deportiva"],
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
        {children}
        {/* el boton flotante vive en todo el sitio, tambien en la ficha de producto */}
        <Ruleta />
      </body>
    </html>
  );
}
