import type { Metadata } from "next";
import { Barlow_Condensed, Big_Shoulders, Sofia_Sans_Extra_Condensed } from "next/font/google";

/*
  Las tres candidatas a tipografía de títulos se cargan SOLO acá, para poder
  compararlas. La que quede aprobada pasa a app/layout.tsx y las otras se van.
*/
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--fuente-barlow",
  display: "swap",
});
const sofia = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--fuente-sofia",
  display: "swap",
});
const shoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--fuente-shoulders",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistema de diseño",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`rfk ${barlow.variable} ${sofia.variable} ${shoulders.variable} bg-noche text-tiza`}
      style={{ ["--font-titulo" as string]: 'var(--fuente-barlow), "Arial Narrow", sans-serif' }}
    >
      {children}
    </div>
  );
}
