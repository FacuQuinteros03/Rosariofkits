"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

/**
 * Cambia el panel entre claro y oscuro. Lo guarda en una cookie para que el
 * servidor lo dibuje ya con el tema elegido (sin parpadeo al entrar).
 */
export function BotonTema({ inicial }: { inicial: boolean }) {
  const [oscuro, setOscuro] = useState(inicial);

  function cambiar() {
    const nuevo = !oscuro;
    document.querySelector("[data-panel]")?.classList.toggle("oscuro", nuevo);
    document.cookie = `panel_tema=${nuevo ? "oscuro" : "claro"}; path=/admin; max-age=31536000; samesite=lax`;
    setOscuro(nuevo);
  }

  return (
    <button type="button" onClick={cambiar} aria-label={oscuro ? "Pasar a modo claro" : "Pasar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"} className="rounded-lg p-2 text-muted hover:text-ink">
      {oscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
