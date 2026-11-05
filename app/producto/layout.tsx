import type { ReactNode } from "react";
import { CyberCinta } from "@/components/CyberCinta";

/** Las fichas llevan arriba la cinta del Cyber Monday (se apaga sola, ver lib/cyber.ts). */
export default function LayoutProducto({ children }: { children: ReactNode }) {
  return (
    <>
      <CyberCinta />
      {children}
    </>
  );
}
