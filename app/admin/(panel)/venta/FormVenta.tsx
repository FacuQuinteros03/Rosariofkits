"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { cargarVenta, type VentaNueva } from "@/app/admin/acciones";
import { plata } from "@/app/admin/_lib/formato";
import { Chips, Tarjeta } from "@/app/admin/_componentes/Controles";

export type Producto = {
  sku: number;
  producto: string;
  categoria: string;
  precio: number;
  disponible: number;
  en_casa: number;
};
export type ClienteLista = {
  id: string;
  nombre: string;
  telefono: string | null;
  tipo: string;
  compras: number;
  saldo: number;
};

type Linea = Producto & { cantidad: number; precio_unit: number; motivo: string };

const ESTADOS = [
  { valor: "Reservada", titulo: "Reservada", ayuda: "No pagó nada todavía" },
  { valor: "Señada", titulo: "Señada", ayuda: "Dejó una parte" },
  { valor: "Pagada", titulo: "Pagada", ayuda: "Pagó todo, falta entregar" },
  { valor: "Entregada", titulo: "Entregada", ayuda: "Pagó y se la llevó" },
] as const;
const METODOS = ["Transferencia", "Efectivo", "Mercado Pago"];
const CANALES = ["WhatsApp", "Instagram", "En persona", "Web", "Grupo de stock"];

/** Sin tildes ni mayúsculas, para buscar "japon" y encontrar "Japón". */
const normal = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function FormVenta({ productos, clientes, hoy }: { productos: Producto[]; clientes: ClienteLista[]; hoy: string }) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Cliente: uno de la lista o uno nuevo.
  const [busqCliente, setBusqCliente] = useState("");
  const [cliente, setCliente] = useState<ClienteLista | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", telefono: "", tipo: "Minorista" });
  const [esNuevo, setEsNuevo] = useState(false);

  // Productos.
  const [busq, setBusq] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);

  const [estado, setEstado] = useState<VentaNueva["estado"]>("Pagada");
  const [metodo, setMetodo] = useState("Transferencia");
  const [montoSena, setSena] = useState(0);
  const [canal, setCanal] = useState<string | null>("WhatsApp");
  const [fecha, setFecha] = useState(hoy);
  const [notas, setNotas] = useState("");

  const sugeridosCliente = useMemo(() => {
    const q = normal(busqCliente.trim());
    if (!q) return [];
    return clientes.filter((c) => normal(c.nombre).includes(q) || (c.telefono ?? "").includes(q)).slice(0, 6);
  }, [busqCliente, clientes]);

  const resultados = useMemo(() => {
    const palabras = normal(busq.trim()).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    return productos
      .filter((p) => {
        const texto = normal(`${p.sku} ${p.producto} ${p.categoria}`);
        return palabras.every((w) => texto.includes(w));
      })
      .slice(0, 8);
  }, [busq, productos]);

  const total = lineas.reduce((s, l) => s + l.cantidad * l.precio_unit, 0);
  const unidades = lineas.reduce((s, l) => s + l.cantidad, 0);
  const llegaDespues = lineas.filter((l) => l.en_casa < l.cantidad);
  const montoPago = estado === "Señada" ? montoSena : estado === "Reservada" ? 0 : total;

  function agregar(p: Producto) {
    setLineas((ls) =>
      ls.some((l) => l.sku === p.sku)
        ? ls.map((l) => (l.sku === p.sku ? { ...l, cantidad: Math.min(l.cantidad + 1, p.disponible) } : l))
        : [...ls, { ...p, cantidad: 1, precio_unit: Number(p.precio), motivo: "" }],
    );
    setBusq("");
  }
  const cambiar = (sku: number, cambio: Partial<Linea>) =>
    setLineas((ls) => ls.map((l) => (l.sku === sku ? { ...l, ...cambio } : l)));

  const faltaCliente = !cliente && !(esNuevo && nuevo.nombre.trim());
  const faltaMotivo = lineas.some((l) => l.precio_unit < Number(l.precio) && !l.motivo.trim());
  const faltaSena = estado === "Señada" && (montoSena <= 0 || montoSena >= total);
  const entregadaSinLlegar = estado === "Entregada" && llegaDespues.length > 0;
  const bloqueo = faltaCliente
    ? "Elegí o creá el cliente"
    : lineas.length === 0
      ? "Agregá al menos un producto"
      : faltaMotivo
        ? "Hay un precio rebajado sin motivo"
        : faltaSena
          ? "Poné cuánto dejó de seña (menos que el total)"
          : entregadaSinLlegar
            ? "Hay productos que todavía no llegaron: no se pueden entregar"
            : null;

  function guardar() {
    if (bloqueo) return;
    setError(null);
    const venta: VentaNueva = {
      cliente: cliente
        ? { id: cliente.id }
        : { nombre: nuevo.nombre.trim(), telefono: nuevo.telefono, tipo: nuevo.tipo },
      items: lineas.map((l) => ({
        sku: l.sku,
        cantidad: l.cantidad,
        precio_unit: l.precio_unit,
        motivo_descuento: l.precio_unit < Number(l.precio) ? l.motivo.trim() : undefined,
      })),
      estado,
      pago: montoPago > 0 ? { monto: montoPago, metodo, tipo: estado === "Señada" ? "Seña" : "Total" } : null,
      canal,
      fecha,
      notas: notas.trim() || null,
    };
    iniciar(async () => {
      const r = await cargarVenta(venta);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/admin?cargada=${r.id}`);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
      <div className="flex flex-col gap-5">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Nueva venta</p>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Cargar venta</h1>
        </header>

        {/* 1. Cliente */}
        <Tarjeta titulo="1 · Cliente">
          {cliente ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2.5">
              <div>
                <p className="font-semibold">{cliente.nombre}</p>
                <p className="text-xs text-muted">
                  {cliente.tipo} · {cliente.compras} {cliente.compras === 1 ? "compra" : "compras"}
                  {Number(cliente.saldo) > 0 && <span className="text-gold"> · ya debe {plata(cliente.saldo)}</span>}
                </p>
              </div>
              <button onClick={() => setCliente(null)} aria-label="Cambiar cliente" className="p-1 text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : esNuevo ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Campo etiqueta="Nombre" valor={nuevo.nombre} onChange={(v) => setNuevo({ ...nuevo, nombre: v })} autoFocus />
              <Campo etiqueta="Teléfono (opcional)" valor={nuevo.telefono} tipo="tel"
                onChange={(v) => setNuevo({ ...nuevo, telefono: v })} />
              <div className="sm:col-span-2">
                <Chips opciones={["Minorista", "Mayorista"]} valor={nuevo.tipo} onChange={(v) => setNuevo({ ...nuevo, tipo: v })} />
              </div>
              <button onClick={() => setEsNuevo(false)} className="justify-self-start text-xs text-muted underline">
                Buscar uno que ya existe
              </button>
            </div>
          ) : (
            <div className="relative">
              <Buscador valor={busqCliente} onChange={setBusqCliente} placeholder="Nombre o teléfono" />
              {sugeridosCliente.length > 0 && (
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {sugeridosCliente.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => { setCliente(c); setBusqCliente(""); }}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-white/5"
                      >
                        <span>{c.nombre}</span>
                        <span className="text-xs text-muted">{c.compras} compras</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => { setEsNuevo(true); setNuevo({ ...nuevo, nombre: busqCliente }); }}
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-gold"
              >
                <UserPlus className="h-4 w-4" /> Cliente nuevo{busqCliente.trim() ? `: ${busqCliente.trim()}` : ""}
              </button>
            </div>
          )}
        </Tarjeta>

        {/* 2. Productos */}
        <Tarjeta titulo="2 · Productos">
          <Buscador valor={busq} onChange={setBusq} placeholder="Equipo, año, talle o SKU (ej: arsenal L)" />
          {resultados.length > 0 && (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
              {resultados.map((p) => (
                <li key={p.sku}>
                  <button onClick={() => agregar(p)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{p.producto}</span>
                      <span className="text-xs text-muted">
                        SKU {p.sku} · {p.en_casa > 0 ? `${p.disponible} disponibles` : "llega con el pedido"}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">{plata(p.precio)}</span>
                    <Plus className="h-4 w-4 text-gold" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {busq.trim() && resultados.length === 0 && (
            <p className="mt-2 text-sm text-muted">No hay nada disponible con eso.</p>
          )}

          {lineas.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {lineas.map((l) => {
                const rebajado = l.precio_unit < Number(l.precio);
                return (
                  <li key={l.sku} className="rounded-lg border border-line bg-ground/60 p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">{l.producto}</p>
                        <p className="mt-0.5 text-xs">
                          {l.en_casa >= l.cantidad ? (
                            <span className="text-wa">En casa</span>
                          ) : (
                            <span className="text-gold">Se entrega cuando llegue</span>
                          )}
                          <span className="text-muted"> · lista {plata(l.precio)}</span>
                        </p>
                      </div>
                      <button onClick={() => setLineas((ls) => ls.filter((x) => x.sku !== l.sku))}
                        aria-label="Sacar" className="p-1 text-muted hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-lg border border-line">
                        <button className="p-2 disabled:opacity-30" disabled={l.cantidad <= 1}
                          onClick={() => cambiar(l.sku, { cantidad: l.cantidad - 1 })} aria-label="Menos">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{l.cantidad}</span>
                        <button className="p-2 disabled:opacity-30" disabled={l.cantidad >= l.disponible}
                          onClick={() => cambiar(l.sku, { cantidad: l.cantidad + 1 })} aria-label="Más">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <label className="flex flex-1 items-center gap-1 rounded-lg border border-line px-3 py-2 focus-within:border-gold">
                        <span className="text-sm text-muted">$</span>
                        <input
                          inputMode="numeric"
                          value={l.precio_unit ? l.precio_unit.toLocaleString("es-AR") : ""}
                          onChange={(e) => cambiar(l.sku, { precio_unit: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                          className="w-full bg-transparent text-sm font-semibold outline-none"
                          aria-label="Precio por unidad"
                        />
                      </label>
                    </div>
                    {rebajado && (
                      <input
                        value={l.motivo}
                        onChange={(e) => cambiar(l.sku, { motivo: e.target.value })}
                        placeholder="¿Por qué más barata? (mayorista, amigo, promo...)"
                        className={`mt-2 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-gold
                          ${l.motivo.trim() ? "border-line" : "border-gold/60"}`}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        {/* 3. Estado y cobro */}
        <Tarjeta titulo="3 · ¿Cómo quedó?">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ESTADOS.map((e) => {
              const deshabilitado = e.valor === "Entregada" && llegaDespues.length > 0;
              return (
                <button
                  key={e.valor}
                  disabled={deshabilitado}
                  onClick={() => setEstado(e.valor)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-35
                    ${estado === e.valor ? "border-gold bg-gold/10" : "border-line hover:border-muted"}`}
                >
                  <span className="block text-sm font-semibold">{e.titulo}</span>
                  <span className="block text-[11px] leading-tight text-muted">{e.ayuda}</span>
                </button>
              );
            })}
          </div>
          {llegaDespues.length > 0 && (
            <p className="mt-2 text-xs text-gold">
              {llegaDespues.length === 1 ? "Un producto todavía no llegó" : `${llegaDespues.length} productos todavía no llegaron`}:
              queda en &quot;Para entregar&quot; y te avisa cuando llegue el pedido.
            </p>
          )}

          {estado !== "Reservada" && (
            <div className="mt-4 flex flex-col gap-3">
              {estado === "Señada" && (
                <label className="flex items-center gap-1 rounded-lg border border-line px-3 py-2.5 focus-within:border-gold">
                  <span className="shrink-0 whitespace-nowrap text-sm text-muted">Seña $</span>
                  <input inputMode="numeric" autoFocus value={montoSena ? montoSena.toLocaleString("es-AR") : ""}
                    onChange={(e) => setSena(Number(e.target.value.replace(/\D/g, "")) || 0)} className="w-full bg-transparent font-semibold outline-none" />
                </label>
              )}
              <Chips opciones={METODOS} valor={metodo} onChange={setMetodo} />
            </div>
          )}
        </Tarjeta>

        {/* 4. Detalles */}
        <Tarjeta titulo="4 · Detalles">
          <p className="mb-2 text-xs text-muted">¿Por dónde vino?</p>
          <Chips opciones={CANALES} valor={canal ?? ""} onChange={(v) => setCanal(v === canal ? null : v)} />
          <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Fecha</span>
              <input type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)}
                className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-gold" />
            </label>
            <Campo etiqueta="Notas (opcional)" valor={notas} onChange={setNotas} />
          </div>
        </Tarjeta>
      </div>

      {/* Resumen: abajo en el celu, al costado en la compu. */}
      <aside className="sticky bottom-0 -mx-4 border-t border-line bg-ground/95 px-4 pb-4 pt-3 backdrop-blur
                        lg:top-5 lg:mx-0 lg:rounded-2xl lg:border lg:bg-surface lg:p-5">
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted lg:block">Resumen</p>
        <div className="hidden lg:mt-3 lg:flex lg:flex-col lg:gap-1.5 lg:text-sm">
          <Fila a="Cliente" b={cliente?.nombre || (esNuevo ? nuevo.nombre : "") || "—"} />
          <Fila a="Unidades" b={String(unidades)} />
          <Fila a="Estado" b={estado} />
          {montoPago > 0 && <Fila a={`Cobrás (${metodo})`} b={plata(montoPago)} />}
          {total - montoPago > 0 && lineas.length > 0 && <Fila a="Queda debiendo" b={plata(total - montoPago)} />}
        </div>
        <div className="flex items-end justify-between lg:mt-4 lg:border-t lg:border-line lg:pt-4">
          <div>
            <p className="text-xs text-muted">Total · {unidades} u.</p>
            <p className="font-display text-3xl font-extrabold leading-none tracking-tight">{plata(total)}</p>
          </div>
          <button
            onClick={guardar}
            disabled={!!bloqueo || enviando}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-gold px-5 font-semibold text-ground transition-opacity disabled:opacity-40"
          >
            <Check className="h-5 w-5" /> {enviando ? "Guardando..." : "Guardar"}
          </button>
        </div>
        {(error || bloqueo) && (
          <p className={`mt-2 text-xs ${error ? "text-red-300" : "text-muted"}`}>{error ?? bloqueo}</p>
        )}
      </aside>
    </div>
  );
}

function Buscador({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 focus-within:border-gold">
      <Search className="h-4 w-4 text-muted" />
      <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70" />
      {valor && (
        <button onClick={() => onChange("")} aria-label="Borrar"><X className="h-4 w-4 text-muted" /></button>
      )}
    </label>
  );
}

function Campo({ etiqueta, valor, onChange, tipo = "text", autoFocus }: {
  etiqueta: string; valor: string; onChange: (v: string) => void; tipo?: string; autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{etiqueta}</span>
      <input type={tipo} value={valor} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-gold" />
    </label>
  );
}

function Fila({ a, b }: { a: string; b: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-muted">{a}</span>
      <span className="truncate text-right">{b}</span>
    </p>
  );
}
