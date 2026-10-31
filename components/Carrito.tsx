"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import {
  actualizarStock,
  cambiarCantidad,
  contarUnidades,
  linkPedido,
  quitar,
  useCarrito,
  vaciar,
  type StockActual,
} from "@/lib/carrito";
import { calcularTotales, PROMO_PAR } from "@/lib/promo";
import { precio } from "@/lib/whatsapp";

/** Lo dispara AgregarAlCarrito: el texto del aviso de "agregaste". */
export const EVENTO_AGREGADO = "rfk:agregado";

/**
 * Botón flotante abajo a la izquierda (a la derecha está la ruleta) y el panel
 * con el pedido. Solo aparece cuando hay algo en el carrito: un botón vacío es
 * una pregunta que nadie hizo.
 *
 * Al abrir el panel se vuelve a mirar el stock: lo que se agotó mientras tanto
 * sale, con un aviso, antes de que la persona mande un pedido que no se puede
 * cumplir.
 */
export function Carrito() {
  const items = useCarrito();
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [mirando, setMirando] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [agregado, setAgregado] = useState<string | null>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  const unidades = contarUnidades(items);
  const { lista, total, pares, ahorro } = calcularTotales(items);

  /** Abre el panel y vuelve a mirar el stock de lo que hay adentro. */
  async function abrir() {
    setAbierto(true);
    setAgregado(null);
    const skus = items.map((i) => i.sku);
    if (skus.length === 0) return;
    setMirando(true);
    try {
      const res = await fetch(`/api/stock?skus=${skus.join(",")}`, { cache: "no-store" });
      if (res.ok) setAvisos(actualizarStock((await res.json()) as Record<string, StockActual>));
    } catch {
      // sin conexión se manda igual: Facu confirma el stock al responder
    } finally {
      setMirando(false);
    }
  }

  /* "Agregaste ..." unos segundos, sin abrir el panel: se puede seguir eligiendo */
  useEffect(() => {
    let reloj: ReturnType<typeof setTimeout>;
    const alAgregar = (e: Event) => {
      setAgregado((e as CustomEvent<string>).detail);
      clearTimeout(reloj);
      reloj = setTimeout(() => setAgregado(null), 3500);
    };
    window.addEventListener(EVENTO_AGREGADO, alAgregar);
    return () => {
      window.removeEventListener(EVENTO_AGREGADO, alAgregar);
      clearTimeout(reloj);
    };
  }, []);

  /* Escape cierra, y el foco entra al panel al abrirlo */
  useEffect(() => {
    if (!abierto) return;
    cerrarRef.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto]);

  /* el panel y el validador de cupones son herramientas internas */
  if (ruta.startsWith("/admin") || ruta.startsWith("/cupon")) return null;

  return (
    <>
      <AnimatePresence>
        {unidades > 0 && !abierto && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-4 left-4 z-30 flex flex-col items-start gap-2"
          >
            {agregado && (
              <p
                role="status"
                className="max-w-[16rem] rounded-xl border border-line bg-surface px-3 py-2 text-[12.5px]
                           leading-snug text-ink shadow-lg shadow-black/40"
              >
                Agregaste {agregado}
              </p>
            )}
            <button
              type="button"
              onClick={() => void abrir()}
              className="flex items-center gap-2 rounded-full bg-wa px-4 py-3 text-[14px] font-bold
                         text-black/85 shadow-lg shadow-black/40 transition-colors hover:bg-wa-dark
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-wa"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={2.4} aria-hidden />
              Ver pedido
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-black/80 px-1.5 text-xs text-white tabular-nums">
                {unidades}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {abierto && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbierto(false)}
          >
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Tu pedido"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22, ease: [0.2, 0.7, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-full max-w-md flex-col border-l border-line bg-ground"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-display text-2xl font-extrabold uppercase leading-none">Tu pedido</h2>
                <button
                  ref={cerrarRef}
                  type="button"
                  onClick={() => setAbierto(false)}
                  aria-label="Cerrar"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-white/5 hover:text-ink"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {avisos.length > 0 && (
                  <ul className="mb-4 space-y-1 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-[12.5px] leading-snug text-gold">
                    {avisos.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}

                {items.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">
                    {mirando ? "Revisando el stock..." : "Tu pedido está vacío."}
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {items.map((i) => (
                      <li key={i.sku} className="flex gap-3 py-3">
                        <Link
                          href={`/producto/${i.productoId}`}
                          onClick={() => setAbierto(false)}
                          className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-surface"
                        >
                          {i.foto && <Image src={i.foto} alt="" fill sizes="64px" className="object-cover" />}
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <p className="text-[13.5px] font-semibold leading-snug">{i.nombre}</p>
                          <p className="text-[12px] text-muted">
                            {i.talle !== "ÚNICO" && <>Talle {i.talle} · </>}
                            {precio(i.precio)}
                          </p>
                          <div className="mt-auto flex items-center gap-2">
                            <div className="flex items-center rounded-lg border border-line">
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(i.sku, i.cantidad - 1)}
                                disabled={i.cantidad <= 1}
                                aria-label="Una menos"
                                className="grid h-8 w-8 place-items-center text-muted hover:text-ink disabled:opacity-30"
                              >
                                <Minus className="h-3.5 w-3.5" aria-hidden />
                              </button>
                              <span className="w-6 text-center text-sm font-bold tabular-nums">{i.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(i.sku, i.cantidad + 1)}
                                disabled={i.cantidad >= i.disponible}
                                aria-label="Una más"
                                title={i.cantidad >= i.disponible ? "No hay más de este talle" : undefined}
                                className="grid h-8 w-8 place-items-center text-muted hover:text-ink disabled:opacity-30"
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => quitar(i.sku)}
                              aria-label={`Sacar ${i.nombre}`}
                              className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {items.length > 0 && (
                <footer className="space-y-3 border-t border-line px-5 py-4">
                  <dl className="space-y-1 text-sm">
                    {pares > 0 && (
                      <>
                        <div className="flex justify-between text-muted">
                          <dt>Subtotal</dt>
                          <dd className="tabular-nums">{precio(lista)}</dd>
                        </div>
                        <div className="flex justify-between text-gold">
                          <dt>Promo 2 camisetas por {precio(PROMO_PAR)}</dt>
                          <dd className="tabular-nums">−{precio(ahorro)}</dd>
                        </div>
                      </>
                    )}
                    <div className="flex items-baseline justify-between">
                      <dt className="font-semibold">Total</dt>
                      <dd className="font-display text-3xl font-bold tabular-nums">{precio(total)}</dd>
                    </div>
                  </dl>

                  <a
                    href={linkPedido(items)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={mirando}
                    onClick={(e) => mirando && e.preventDefault()}
                    className="flex items-center justify-center gap-2.5 rounded-xl bg-wa px-5 py-3.5
                               text-[15px] font-bold text-black/85 transition-colors hover:bg-wa-dark
                               aria-disabled:opacity-60
                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                               focus-visible:outline-wa"
                  >
                    <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2.4} aria-hidden />
                    {mirando ? "Revisando el stock..." : "Enviar pedido por WhatsApp"}
                  </a>
                  <p className="text-center text-[11.5px] leading-snug text-muted">
                    No se cobra nada acá: te confirmamos stock, pago y entrega por WhatsApp.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      vaciar();
                      setAvisos([]);
                    }}
                    className="mx-auto block text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline"
                  >
                    Vaciar pedido
                  </button>
                </footer>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
