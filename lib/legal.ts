/**
 * Datos de las páginas legales. Viven acá para cambiarlos en un solo lugar.
 *
 * ⚠ A CONFIRMAR POR FACU antes de publicar: `responsable` (nombre y apellido o
 * razón social de quien responde por los datos) y `plazo` (cuánto se guardan).
 * Lo demás sale de cómo funciona hoy el sitio.
 */
export const LEGAL = {
  /** Cada cambio de fondo en la política sube este número: queda anotado cuál aceptó cada persona. */
  version: 1,
  vigencia: "16 de noviembre de 2026",
  responsable: "Rosario F Kits",
  /** Cuánto se guardan los datos de un pedido. */
  plazo: "dos años desde tu última compra",
} as const;
