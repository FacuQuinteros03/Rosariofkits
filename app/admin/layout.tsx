import type { Metadata } from "next";

/** El panel no se indexa ni entra al sitemap (también está en robots.ts). */
export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-16 pt-5 sm:px-6">{children}</div>;
}
