/**
 * Gráficos del panel en SVG/HTML a mano: se dibujan en el servidor, no suman
 * librerías ni JavaScript al celular, y usan los colores de la web.
 */
import { plataCorta } from "../_lib/formato";

export const COLORES = {
  oro: "#e2b74a",
  verde: "#25d366",
  azul: "#5b8def",
  rojo: "#e5484d",
  violeta: "#a78bfa",
  gris: "#8b9aa8",
  linea: "#232c38",
};
const PALETA = [COLORES.oro, COLORES.azul, COLORES.verde, COLORES.violeta, "#f59e0b", "#38bdf8", COLORES.gris];

type Serie = { nombre: string; color: string; valores: number[] };

/** Barras agrupadas por mes, con una línea opcional encima (por ejemplo, la caja). */
export function BarrasMes({ etiquetas, series, linea }: { etiquetas: string[]; series: Serie[]; linea?: Serie }) {
  const W = 640, H = 240, izq = 48, abajo = 26, arriba = 12;
  const todos = [...series.flatMap((s) => s.valores), ...(linea?.valores ?? []), 0];
  const max = Math.max(...todos) * 1.1 || 1;
  const min = Math.min(...todos, 0) * 1.1;
  const y = (v: number) => arriba + ((max - v) / (max - min)) * (H - arriba - abajo);
  const ancho = (W - izq) / Math.max(etiquetas.length, 1);
  const barra = Math.min(36, (ancho * 0.7) / series.length);
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {marcas.map((m) => (
          <g key={m}>
            <line x1={izq} x2={W} y1={y(m)} y2={y(m)} stroke={COLORES.linea} strokeDasharray={m === 0 ? "" : "3 4"} />
            <text x={izq - 6} y={y(m) + 4} textAnchor="end" fontSize="13" fill={COLORES.gris}>{plataCorta(m)}</text>
          </g>
        ))}
        {etiquetas.map((e, i) => {
          const x0 = izq + ancho * i + (ancho - barra * series.length) / 2;
          return (
            <g key={e}>
              {series.map((s, j) => {
                const v = s.valores[i] ?? 0;
                return (
                  <rect key={s.nombre} x={x0 + j * barra + 1} width={barra - 2} rx="3"
                    y={Math.min(y(v), y(0))} height={Math.abs(y(0) - y(v))} fill={s.color}>
                    <title>{`${s.nombre} ${e}: ${plataCorta(v)}`}</title>
                  </rect>
                );
              })}
              <text x={izq + ancho * i + ancho / 2} y={H - 8} textAnchor="middle" fontSize="14" fill={COLORES.gris}>{e}</text>
            </g>
          );
        })}
        {linea && (
          <>
            <polyline fill="none" stroke={linea.color} strokeWidth="2.5" strokeLinejoin="round"
              points={linea.valores.map((v, i) => `${izq + ancho * i + ancho / 2},${y(v)}`).join(" ")} />
            {linea.valores.map((v, i) => (
              <circle key={i} cx={izq + ancho * i + ancho / 2} cy={y(v)} r="4" fill="#12171f" stroke={linea.color} strokeWidth="2.5">
                <title>{`${linea.nombre} ${etiquetas[i]}: ${plataCorta(v)}`}</title>
              </circle>
            ))}
          </>
        )}
      </svg>
      <Leyenda items={[...series, ...(linea ? [linea] : [])]} />
    </figure>
  );
}

/** Dona con el total en el medio. */
export function Dona({
  partes,
  centro,
  sub,
  formato = (n: number) => String(n),
}: {
  partes: { nombre: string; valor: number; color?: string }[];
  centro: string;
  sub: string;
  formato?: (n: number) => string;
}) {
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
  const r = 52, C = 2 * Math.PI * r;
  // Dónde arranca cada porción: la suma de las anteriores.
  const inicios = partes.map((_, i) => partes.slice(0, i).reduce((s, p) => s + (p.valor / total) * C, 0));
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0">
        <circle cx="70" cy="70" r={r} fill="none" stroke={COLORES.linea} strokeWidth="18" />
        {partes.map((p, i) => {
          const largo = (p.valor / total) * C;
          const el = (
            <circle key={p.nombre} cx="70" cy="70" r={r} fill="none" strokeWidth="18" transform="rotate(-90 70 70)"
              stroke={p.color ?? PALETA[i % PALETA.length]}
              strokeDasharray={`${Math.max(largo - 2, 0)} ${C}`} strokeDashoffset={-inicios[i]}>
              <title>{`${p.nombre}: ${formato(p.valor)}`}</title>
            </circle>
          );
          return el;
        })}
        <g>
          <text x="70" y="70" textAnchor="middle" fontSize="22" fontWeight="800" fill="#e9edf2" className="font-display">{centro}</text>
          <text x="70" y="88" textAnchor="middle" fontSize="10" fill={COLORES.gris}>{sub}</text>
        </g>
      </svg>
      <ul className="flex min-w-[150px] flex-1 flex-col gap-1.5 text-sm">
        {partes.map((p, i) => (
          <li key={p.nombre} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color ?? PALETA[i % PALETA.length] }} />
            <span className="truncate text-muted">{p.nombre}</span>
            <span className="ml-auto whitespace-nowrap pl-2 font-semibold">{formato(p.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranking en barras horizontales (equipos, talles, proveedores...). */
export function Ranking({
  filas,
  color = COLORES.oro,
  formato = (n: number) => String(n),
}: {
  filas: { nombre: string; valor: number; detalle?: string }[];
  color?: string;
  formato?: (n: number) => string;
}) {
  const max = Math.max(...filas.map((f) => f.valor), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {filas.map((f) => (
        <li key={f.nombre}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{f.nombre}</span>
            <span className="shrink-0 font-semibold">
              {formato(f.valor)}
              {f.detalle && <span className="ml-1.5 text-xs font-normal text-muted">{f.detalle}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-line">
            <div className="h-2 rounded-full" style={{ width: `${(f.valor / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Barra de avance: cuánto se recuperó de algo (por ejemplo, de un pedido). */
export function Avance({ valor, total, color = COLORES.verde }: { valor: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.min(valor / total, 1) : 0;
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
    </div>
  );
}

/** Linea finita sin ejes para las tarjetas de arriba. */
export function Chispa({ valores, color = COLORES.oro }: { valores: number[]; color?: string }) {
  if (valores.length < 2) return null;
  const W = 120, H = 32;
  const max = Math.max(...valores), min = Math.min(...valores);
  const pts = valores.map((v, i) => `${(i / (valores.length - 1)) * W},${H - 3 - ((v - min) / (max - min || 1)) * (H - 6)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-28" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={pts.join(" ")} />
    </svg>
  );
}

function Leyenda({ items }: { items: { nombre: string; color: string }[] }) {
  return (
    <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((s) => (
        <span key={s.nombre} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.nombre}
        </span>
      ))}
    </figcaption>
  );
}
