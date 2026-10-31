"use client";

import { useSyncExternalStore } from "react";
import type { CategoriaReal, Producto, Variante } from "./types";
import { calcularTotales, PROMO_PAR } from "./promo";
import { precio, WHATSAPP } from "./whatsapp";

/**
 * El carrito vive en el navegador (localStorage) y nada más. No cobra ni
 * reserva: junta lo elegido y lo manda en un solo mensaje de WhatsApp, y la
 * venta la sigue confirmando Facu. Por eso no hace falta guardarlo en ningún
 * lado: si se pierde, se vuelve a armar en un minuto.
 */

export interface ItemCarrito {
  sku: string;
  /** slug de la ficha, para el link */
  productoId: string;
  nombre: string;
  talle: string;
  categoria: CategoriaReal;
  precio: number;
  precioAntes: number | null;
  foto: string | null;
  cantidad: number;
  /** unidades en mano la última vez que se miró; tope de la cantidad */
  disponible: number;
}

const CLAVE = "rfk_carrito_v1";
const VACIO: ItemCarrito[] = [];

let items: ItemCarrito[] = VACIO;
let cargado = false;
const oyentes = new Set<() => void>();

function leer(): ItemCarrito[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const datos = crudo ? JSON.parse(crudo) : null;
    return Array.isArray(datos) ? (datos as ItemCarrito[]) : VACIO;
  } catch {
    return VACIO; // modo incógnito, cookies bloqueadas o un JSON roto
  }
}

function guardar(nuevos: ItemCarrito[]) {
  items = nuevos;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nuevos));
  } catch {
    // sin almacenamiento el carrito anda igual mientras la pestaña esté abierta
  }
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  // otra pestaña cambió el carrito: que esta se entere
  const deOtraPestana = (e: StorageEvent) => {
    if (e.key === CLAVE) {
      items = leer();
      oyente();
    }
  };
  window.addEventListener("storage", deOtraPestana);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", deOtraPestana);
  };
}

function instantanea(): ItemCarrito[] {
  if (!cargado) {
    items = leer();
    cargado = true;
  }
  return items;
}

/** El carrito, reactivo. En el servidor siempre está vacío. */
export function useCarrito(): ItemCarrito[] {
  return useSyncExternalStore(suscribir, instantanea, () => VACIO);
}

export function agregar(producto: Producto, variante: Variante) {
  const actuales = instantanea();
  const ya = actuales.find((i) => i.sku === variante.sku);
  if (ya) {
    cambiarCantidad(variante.sku, ya.cantidad + 1);
    return;
  }
  guardar([
    ...actuales,
    {
      sku: variante.sku,
      productoId: producto.id,
      nombre: producto.nombre,
      talle: variante.talle,
      categoria: producto.categoria,
      precio: producto.precio,
      precioAntes: producto.precioAntes,
      foto: producto.foto,
      cantidad: 1,
      disponible: variante.disponible,
    },
  ]);
}

/** Entre 1 y lo que hay en mano. Para sacar un item, `quitar`. */
export function cambiarCantidad(sku: string, cantidad: number) {
  guardar(
    instantanea().map((i) =>
      i.sku === sku ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.disponible)) } : i
    )
  );
}

export function quitar(sku: string) {
  guardar(instantanea().filter((i) => i.sku !== sku));
}

export function vaciar() {
  guardar(VACIO);
}

/** Lo que devuelve /api/stock por cada SKU: lo que hay hoy y a qué precio. */
export interface StockActual {
  disponible: number;
  precio: number;
  precioAntes: number | null;
}

/**
 * Pone el carrito al día con el stock real. Devuelve qué cambió, para avisarle a
 * la persona: lo que se agotó sale, lo que bajó de cantidad se ajusta, y si
 * cambió el precio se toma el nuevo (el del ERP es el que vale).
 */
export function actualizarStock(actual: Record<string, StockActual>): string[] {
  const avisos: string[] = [];
  const nuevos: ItemCarrito[] = [];

  for (const i of instantanea()) {
    const s = actual[i.sku];
    const quien = `${i.nombre} (${i.talle})`;
    if (!s || s.disponible <= 0) {
      avisos.push(`${quien} se agotó y la sacamos del carrito.`);
      continue;
    }
    const cantidad = Math.min(i.cantidad, s.disponible);
    if (cantidad < i.cantidad) {
      avisos.push(`De ${quien} quedan ${s.disponible}: ajustamos la cantidad.`);
    }
    if (s.precio !== i.precio) {
      avisos.push(`${quien} cambió de precio: ahora sale ${precio(s.precio)}.`);
    }
    nuevos.push({ ...i, cantidad, disponible: s.disponible, precio: s.precio, precioAntes: s.precioAntes });
  }

  guardar(nuevos);
  return avisos;
}

/** Unidades totales, para el número del botón. */
export const contarUnidades = (lista: ItemCarrito[]) => lista.reduce((s, i) => s + i.cantidad, 0);

/** "Camiseta Boca ..." -> "Boca ...": en la lista del mensaje el tipo sobra. */
const sinTipo = (nombre: string) => nombre.replace(/^(camisetas?|shorts?)\s+/i, "").trim();

/**
 * El mensaje de WhatsApp con todo el pedido. Lleva SKU para que Facu lo cargue
 * en el ERP sin adivinar cuál es, y el total con la promo ya aplicada para que
 * no haya sorpresas al confirmar.
 */
export function mensajePedido(lista: ItemCarrito[], ahora = Date.now()): string {
  const { total, pares, ahorro } = calcularTotales(lista, ahora);
  const lineas = lista.map((i) => {
    const tipo = i.categoria === "Shorts" ? "Short" : "Camiseta";
    const talle = i.talle !== "ÚNICO" ? ` · talle ${i.talle}` : "";
    const cant = i.cantidad > 1 ? `${i.cantidad} × ` : "";
    return `• ${cant}${tipo} ${sinTipo(i.nombre)}${talle} — ${precio(i.precio)} [SKU ${i.sku}]`;
  });

  const partes = ["¡Hola Rosario F Kits! Quiero hacer este pedido:", "", ...lineas, ""];
  if (pares > 0) {
    partes.push(`Promo 2 camisetas por ${precio(PROMO_PAR)}: −${precio(ahorro)}`);
  }
  partes.push(`Total: ${precio(total)}`, "", "¿Me confirman stock y cómo seguimos con el pago y la entrega?");
  return partes.join("\n");
}

export function linkPedido(lista: ItemCarrito[]): string {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensajePedido(lista))}`;
}
