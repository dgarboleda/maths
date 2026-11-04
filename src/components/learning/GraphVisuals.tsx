"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { MathText } from "@/components/MathText";

/** Formato de números para leer en voz alta y en pantalla (signo menos tipográfico). */
export const num = (x: number) =>
  (x < 0 ? "−" : "") +
  // Miles con espacio fijo: con coma decimal, «12.000» parecería un decimal.
  Math.abs(x).toLocaleString("es", { maximumFractionDigits: 2 }).replace(/\./g, "\u00a0");

export interface Scale {
  sx: (x: number) => number;
  sy: (y: number) => number;
  /** Inversas: de coordenadas del SVG a coordenadas matemáticas. */
  ix: (px: number) => number;
  iy: (py: number) => number;
  /** Rango visible, en coordenadas matemáticas. */
  bounds: { x: [number, number]; y: [number, number] };
}

/** Paso «redondo» (1, 2 o 5 por una potencia de 10) para unas 6 marcas. */
export function niceStep(span: number, target = 6): number {
  if (!(span > 0)) return 1;
  const raw = span / target,
    p = 10 ** Math.floor(Math.log10(raw)),
    m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** Rango del eje que contiene todos los valores, con margen y extremos en
 *  múltiplos del paso. Incluye el 0 salvo que se pida lo contrario. */
export function niceRange(values: number[], { includeZero = true, target = 6 } = {}): { range: [number, number]; step: number } {
  const finite = values.filter(Number.isFinite);
  let lo = Math.min(...finite, ...(includeZero ? [0] : [])),
    hi = Math.max(...finite, ...(includeZero ? [0] : []));
  if (!finite.length) [lo, hi] = [0, 1];
  if (lo === hi) [lo, hi] = [lo - 1, hi + 1];
  const step = niceStep((hi - lo) * 1.1, target);
  return { range: [Math.floor(lo / step) * step, Math.ceil((hi + (hi - lo) * 0.05) / step) * step], step };
}

/**
 * Estado anterior al último cambio, para dibujarlo en gris y comparar.
 * Mientras el control se mueve (ráfaga de cambios) se conserva el estado de
 * antes de empezar; al quedarse quieto, ese estado pasa a ser la referencia
 * del siguiente cambio.
 */
export function useGhost<T>(value: T, idle = 1200): T | undefined {
  const key = JSON.stringify(value);
  const [state, setState] = useState<{ key: string; value: T; ghost?: T; moving: boolean }>({ key, value, moving: false });
  let current = state;
  if (state.key !== key) {
    current = { key, value, ghost: state.moving ? state.ghost : state.value, moving: true };
    setState(current);
  }
  useEffect(() => {
    if (!current.moving) return;
    const timer = setTimeout(() => setState((s) => (s.key === current.key ? { ...s, moving: false } : s)), idle);
    return () => clearTimeout(timer);
  }, [current.key, current.moving, idle]);
  return current.ghost;
}

/** Ajusta un valor arrastrado al paso y al rango de su control deslizante. */
export const snap = (v: number, min: number, max: number, step = 1) =>
  Math.min(max, Math.max(min, Math.round(v / step) * step));

/** Punto que se arrastra con puntero (ratón, lápiz o dedo). Entrega la
 *  posición en coordenadas del SVG. Es un atajo visual: el control
 *  deslizante equivalente sigue siendo la vía accesible por teclado, por eso
 *  el punto no recibe foco ni se anuncia. */
export function Handle({
  x,
  y,
  onDrag,
  className = "fill-amber-300",
  r = 6,
  shape = "circle",
}: {
  x: number;
  y: number;
  onDrag: (px: number, py: number) => void;
  className?: string;
  r?: number;
  /** La forma distingue dos puntos sin depender solo del color. */
  shape?: "circle" | "square";
}) {
  const move = (e: React.PointerEvent<SVGGElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const m = e.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    onDrag(p.x, p.y);
  };
  return (
    <g aria-hidden="true" data-handle="" className="cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={move}
      onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}>
      <circle cx={x} cy={y} r={r + 10} fill="transparent" />
      {shape === "square"
        ? <rect x={x - r} y={y - r} width={2 * r} height={2 * r} rx={1.5} strokeWidth={2} className={`${className} stroke-slate-950`} />
        : <circle cx={x} cy={y} r={r} strokeWidth={2} className={`${className} stroke-slate-950`} />}
    </g>
  );
}

const W = 320,
  H = 240,
  PAD = 28;

/** Plano cartesiano en SVG: cuadrícula, ejes y marcas. El contenido recibe
 *  las escalas para dibujar en coordenadas matemáticas. */
export function Plane({
  x: [x0, x1],
  y: [y0, y1],
  xStep,
  yStep,
  xLabel,
  yLabel,
  label,
  children,
}: {
  x: [number, number];
  y: [number, number];
  /** Sin paso, se elige uno redondo para unas 6 marcas. */
  xStep?: number;
  yStep?: number;
  /** Nombre de cada eje (variable o magnitud), al final del eje. */
  xLabel?: string;
  yLabel?: string;
  label: string;
  children: (scale: Scale) => ReactNode;
}) {
  const stepX = xStep ?? niceStep(x1 - x0, 8),
    stepY = yStep ?? niceStep(y1 - y0, 6);
  // El margen izquierdo crece con la etiqueta más larga del eje y («12 mil»).
  const yTexts = Array.from({ length: Math.floor((y1 - y0) / stepY) + 1 }, (_, i) => compact(Math.ceil(y0 / stepY) * stepY + i * stepY));
  const padL = Math.max(PAD, 10 + 7.6 * Math.max(...yTexts.map((t) => t.length)));
  const sx = (x: number) => padL + ((x - x0) / (x1 - x0)) * (W - padL - PAD),
    sy = (y: number) => H - PAD - ((y - y0) / (y1 - y0)) * (H - 2 * PAD),
    ix = (px: number) => x0 + ((px - padL) / (W - padL - PAD)) * (x1 - x0),
    iy = (py: number) => y0 + ((H - PAD - py) / (H - 2 * PAD)) * (y1 - y0);
  const ticks = (a: number, b: number, step: number) =>
    Array.from(
      { length: Math.floor((b - a) / step) + 1 },
      (_, i) => Number((Math.ceil(a / step - 1e-9) * step + i * step).toPrecision(12)),
    ).filter((t) => t <= b + 1e-9);
  const xs = ticks(x0, x1, stepX),
    ys = ticks(y0, y1, stepY);
  // Con muchas marcas se rotula una de cada dos (siempre el 0) para que los
  // números no se monten en un móvil.
  const every = (list: number[], max: number) => (list.length > max ? 2 : 1);
  // Se rotulan múltiplos regulares (…, −4, 0, 4, …), no posiciones alternas.
  const shown = (list: number[], step: number, t: number, max: number) => Math.round(t / step) % every(list, max) === 0;
  const clipId = `plano${useId().replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-md rounded-xl bg-slate-950"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={padL} y={PAD} width={W - padL - PAD} height={H - 2 * PAD} />
        </clipPath>
      </defs>
      {xs.map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={PAD} y2={H - PAD} className="stroke-slate-800" />
          {shown(xs, stepX, t, 9) && (
            <text x={sx(t)} y={H - PAD + 15} textAnchor="middle" className="fill-slate-300 text-[13px] tabular-nums">
              {num(t)}
            </text>
          )}
        </g>
      ))}
      {ys.map((t) => (
        <g key={`y${t}`}>
          <line x1={padL} x2={W - PAD} y1={sy(t)} y2={sy(t)} className="stroke-slate-800" />
          {shown(ys, stepY, t, 7) && (
            <text x={padL - 4} y={sy(t) + 4} textAnchor="end" className="fill-slate-300 text-[13px] tabular-nums">
              {compact(t)}
            </text>
          )}
        </g>
      ))}
      {xLabel && (
        <text x={W - 4} y={H - PAD - 6} textAnchor="end" className="fill-cyan-100 text-[13px] font-bold">{xLabel}</text>
      )}
      {yLabel && (
        <text x={padL + 4} y={PAD - 8} className="fill-cyan-100 text-[13px] font-bold">{yLabel}</text>
      )}
      {x0 <= 0 && x1 >= 0 && (
        <line x1={sx(0)} x2={sx(0)} y1={PAD} y2={H - PAD} className="stroke-slate-400" />
      )}
      {y0 <= 0 && y1 >= 0 && (
        <line x1={padL} x2={W - PAD} y1={sy(0)} y2={sy(0)} className="stroke-slate-400" />
      )}
      <g clipPath={`url(#${clipId})`}>{children({ sx, sy, ix, iy, bounds: { x: [x0, x1], y: [y0, y1] } })}</g>
    </svg>
  );
}

/** Traza una función muestreada como una sola línea. */
export function curve(f: (x: number) => number, [a, b]: [number, number], { sx, sy }: Scale, samples = 120) {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const x = a + ((b - a) * i) / samples,
      y = f(x);
    return `${i === 0 ? "M" : "L"}${sx(x).toFixed(1)},${sy(Math.max(-1e4, Math.min(1e4, y))).toFixed(1)}`;
  }).join(" ");
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string;
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <>
      <label htmlFor={id} className="block text-sm">
        {label}: <strong>{num(value)}</strong>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="min-h-8 w-full accent-cyan-300" />
    </>
  );
}

export function Toggle({
  options,
  value,
  onChange,
  label,
}: {
  options: [string, string][];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([key, text]) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}
          className={`min-h-11 min-w-11 rounded-xl border px-4 text-sm font-semibold ${value === key ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-600 bg-slate-900 text-slate-100"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** Números de los ejes en poco espacio: 12 000 → «12 mil». */
export const compact = (x: number) =>
  Math.abs(x) >= 10_000 || (Math.abs(x) >= 1000 && x % 1000 === 0) ? `${num(x / 1000)} mil` : num(x);

/** Muestras de línea para la leyenda: el trazo (continuo, discontinuo) y la
 *  forma distinguen las series además del color. */
export function Legend({ items }: { items: { label: string; className: string; dash?: string; marker?: "dot" | "square" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-200" aria-label="Leyenda">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <svg aria-hidden="true" width="28" height="12" viewBox="0 0 28 12">
            <line x1={1} x2={27} y1={6} y2={6} strokeWidth={2.5} strokeDasharray={item.dash} className={item.className} />
            {item.marker === "dot" && <circle cx={14} cy={6} r={3.5} className={item.className.replace("stroke-", "fill-")} />}
            {item.marker === "square" && <rect x={10.5} y={2.5} width={7} height={7} className={item.className.replace("stroke-", "fill-")} />}
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export interface DataPoint { x: number; y: number; label: string }

/**
 * Puntos que se pueden leer: al tocar uno (o elegirlo con `PointReader`) se
 * dibujan guías hasta los ejes y una etiqueta con su valor. Los puntos son un
 * atajo visual; la vía accesible es el control de `PointReader`.
 */
export function PointMarks({ points, scale: s, selected, onSelect, className = "fill-cyan-300", shape = "circle" }: {
  points: DataPoint[];
  scale: Scale;
  selected: number | null;
  onSelect: (index: number) => void;
  className?: string;
  shape?: "circle" | "square";
}) {
  const pick = selected === null ? undefined : points[selected];
  const [bx0, bx1] = s.bounds.x,
    [by0, by1] = s.bounds.y;
  const baseY = by0 <= 0 && by1 >= 0 ? 0 : by0,
    baseX = bx0 <= 0 && bx1 >= 0 ? 0 : bx0;
  return (
    <>
      {points.map((p, i) => {
        const cx = s.sx(p.x),
          cy = s.sy(Math.max(by0 - 1e3, Math.min(by1 + 1e3, p.y)));
        return (
          <g key={i} aria-hidden="true" className="cursor-pointer" onPointerDown={() => onSelect(i)}>
            <circle cx={cx} cy={cy} r={12} fill="transparent" />
            {shape === "square"
              ? <rect x={cx - 4} y={cy - 4} width={8} height={8} className={`${className} ${i === selected ? "stroke-white" : "stroke-slate-950"}`} strokeWidth={i === selected ? 2.5 : 1} />
              : <circle cx={cx} cy={cy} r={i === selected ? 6 : 4} className={`${className} ${i === selected ? "stroke-white" : "stroke-slate-950"}`} strokeWidth={i === selected ? 2.5 : 1} />}
          </g>
        );
      })}
      {pick && (() => {
        const cx = s.sx(pick.x),
          cy = s.sy(pick.y),
          w = Math.max(48, pick.label.length * 7.2 + 14),
          // Dentro del área visible (el contenido del plano se recorta).
          left = Math.min(s.sx(bx1) - w - 2, Math.max(s.sx(bx0) + 2, cx - w / 2)),
          top = cy - 34 < PAD ? cy + 12 : cy - 34;
        return (
          <g aria-hidden="true" pointerEvents="none">
            <path d={`M${cx},${cy} V${s.sy(baseY)} M${cx},${cy} H${s.sx(baseX)}`} className="stroke-white/60" strokeDasharray="3 3" />
            <rect x={left} y={top} width={w} height={22} rx={6} className="fill-slate-100" />
            <text x={left + w / 2} y={top + 15} textAnchor="middle" className="fill-slate-950 text-[13px] font-bold">{pick.label}</text>
          </g>
        );
      })()}
    </>
  );
}

/** Control accesible para recorrer los puntos de una gráfica y leer su valor. */
export function PointReader({ id, points, selected, onSelect, noun = "punto" }: {
  id: string;
  points: DataPoint[];
  selected: number | null;
  onSelect: (index: number) => void;
  noun?: string;
}) {
  const value = selected ?? 0;
  return (
    <div className="rounded-xl bg-slate-900/70 p-3">
      <label htmlFor={id} className="block text-sm">Lee un {noun} de la gráfica</label>
      <input id={id} type="range" min={0} max={points.length - 1} value={value}
        aria-valuetext={points[value]?.label}
        onChange={(e) => onSelect(Number(e.target.value))} onFocus={() => onSelect(value)}
        className="min-h-8 w-full accent-amber-300" />
      <p aria-live="polite" className="text-sm font-semibold text-amber-100">
        {selected === null ? `Toca un ${noun} o mueve este control para leer su valor.` : points[selected].label}
      </p>
    </div>
  );
}

/** Tabla de valores plegable bajo una gráfica (también útil sin vista). */
export function ValueTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-bold text-cyan-200">Ver la tabla de valores</summary>
      <table className="mt-2 w-full text-left text-sm tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{headers.map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-700">{row.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Aviso bajo la gráfica cuando se dibuja en gris el estado anterior. */
export function GhostNote({ show }: { show: boolean }) {
  return show ? <p className="text-xs text-slate-400">En gris, cómo era antes del último cambio: compara qué cambió y qué se mantuvo.</p> : null;
}

/**
 * Reto sobre la gráfica: una meta que se comprueba sola al mover los
 * controles. Es exploración: no da estrellas ni cuenta como respuesta.
 */
export function Challenge({ goals }: { goals: { text: string; met: boolean; hint?: string }[] }) {
  const [index, setIndex] = useState(0);
  const goal = goals[index % goals.length];
  return (
    <div className={`rounded-xl border p-3 ${goal.met ? "border-emerald-300/60 bg-emerald-950/40" : "border-amber-300/40 bg-amber-950/20"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Reto {index % goals.length + 1} de {goals.length}</p>
      <p className="mt-1 font-semibold text-white">{goal.text}</p>
      <p aria-live="polite" className={`mt-1 text-sm ${goal.met ? "text-emerald-200" : "text-slate-300"}`}>
        {goal.met ? "¡Conseguido! Explica por qué funciona." : goal.hint ?? "Predice el valor que hace falta y compruébalo moviendo los controles."}
      </p>
      {goals.length > 1 && (
        <button type="button" onClick={() => setIndex((i) => i + 1)}
          className="mt-2 min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-100">
          Otro reto
        </button>
      )}
    </div>
  );
}

export function LinearVisual({ id }: { id: string }) {
  const [slope, setSlope] = useState(3);
  const [intercept, setIntercept] = useState(2);
  const [pick, setPick] = useState<number | null>(null);
  const ghost = useGhost({ slope, intercept });
  const f = (x: number) => slope * x + intercept;
  const points = [2, 3, 4].map((x) => ({ x, y: f(x), label: `x = ${num(x)} → y = ${num(f(x))}` }));
  return (
    <>
      <Slider id={`${id}-m`} label="Cambio por unidad (pendiente)" value={slope} min={-4} max={6} onChange={setSlope} />
      <Slider id={`${id}-b`} label="Valor inicial (x = 0)" value={intercept} min={-5} max={10} onChange={setIntercept} />
      <p className="text-lg font-semibold">y = {num(slope)}x {intercept < 0 ? "−" : "+"} {Math.abs(intercept)}</p>
      <Plane x={[-1, 5]} y={[-20, 35]} yStep={5} xLabel="x" yLabel="y"
        label={`Recta y = ${num(slope)}x ${intercept < 0 ? "menos" : "más"} ${Math.abs(intercept)}: corta el eje y en ${num(intercept)} y sube ${num(slope)} por cada unidad de x`}>
        {(s) => (
          <>
            {ghost && <path d={curve((x) => ghost.slope * x + ghost.intercept, [-1, 5], s, 2)} className="fill-none stroke-slate-500" strokeWidth={2} strokeDasharray="4 4" />}
            <path d={curve(f, [-1, 5], s, 2)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            {/* Triángulo de pendiente: avanzar 1 y subir (o bajar) la pendiente. */}
            <path d={`M${s.sx(1)},${s.sy(f(1))} H${s.sx(2)} V${s.sy(f(2))}`} className="fill-none stroke-amber-300" strokeWidth={2} strokeDasharray="4 3" />
            <text x={s.sx(1.5)} y={s.sy(f(1)) + (slope >= 0 ? 14 : -6)} textAnchor="middle" className="fill-amber-200 text-[13px] font-bold">+1</text>
            <text x={s.sx(2) + 4} y={(s.sy(f(1)) + s.sy(f(2))) / 2 + 4} className="fill-amber-200 text-[13px] font-bold">{slope >= 0 ? "+" : ""}{num(slope)}</text>
            <PointMarks points={points} scale={s} selected={pick} onSelect={setPick} />
            <Handle x={s.sx(0)} y={s.sy(intercept)} className="fill-rose-300" shape="square"
              onDrag={(_, py) => setIntercept(snap(s.iy(py), -5, 10))} />
            <Handle x={s.sx(1)} y={s.sy(f(1))}
              onDrag={(_, py) => setSlope(snap(s.iy(py) - intercept, -4, 6))} />
          </>
        )}
      </Plane>
      <GhostNote show={Boolean(ghost)} />
      <PointReader id={`${id}-pt`} points={points} selected={pick} onSelect={setPick} />
      <table className="w-full text-left text-sm tabular-nums">
        <caption className="sr-only">Tabla de la función lineal</caption>
        <thead><tr><th className="p-2">x</th><th className="p-2">y</th><th className="p-2">Cambio de y</th></tr></thead>
        <tbody>
          {[0, 1, 2, 3].map((x) => (
            <tr key={x} className="border-t border-slate-700">
              <td className="p-2">{x}</td>
              <td className="p-2">{num(f(x))}</td>
              <td className="p-2">{x === 0 ? "—" : `${slope >= 0 ? "+" : ""}${num(slope)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-slate-300">
        El cuadrado rosa es el valor inicial; el triángulo ámbar muestra la pendiente: cada vez que x aumenta 1, y cambia {num(slope)}. Arrastra cualquiera de los dos puntos para cambiar la recta.
      </p>
      <Challenge goals={[
        { text: "Haz que la recta pase por el punto (2, 7).", met: f(2) === 7, hint: "Prueba primero con un valor inicial y piensa cuánto debe subir en 2 pasos." },
        { text: "Consigue una recta que baje y corte el eje y en 4.", met: slope < 0 && intercept === 4 },
        { text: "Dibuja una recta horizontal a la altura y = −3.", met: slope === 0 && intercept === -3 },
      ]} />
    </>
  );
}

/** Directa (y = kx, cociente constante) frente a inversa (x·y = k, producto constante). */
export function ProportionVisual({ id, initial }: { id: string; initial: "direct" | "inverse" }) {
  const [mode, setMode] = useState<string>(initial);
  const [k, setK] = useState(initial === "direct" ? 4 : 24);
  const [pick, setPick] = useState<number | null>(null);
  const ghost = useGhost({ mode, k });
  const direct = mode === "direct";
  const f = (x: number) => (direct ? k * x : k / x);
  const xs = [1, 2, 3, 4, 6];
  const points = xs.filter((x) => x !== 2).map((x) => ({ x, y: f(x), label: `x = ${x} → y = ${num(f(x))}` }));
  return (
    <>
      <Toggle label="Tipo de relación" value={mode}
        onChange={(m) => { setMode(m); setK(m === "direct" ? 4 : 24); setPick(null); }}
        options={[["direct", "Directa"], ["inverse", "Inversa"]]} />
      <Slider id={`${id}-k`} label={direct ? "Constante (y ÷ x)" : "Constante (x · y)"} value={k}
        min={direct ? 1 : 6} max={direct ? 8 : 48} step={direct ? 1 : 6} onChange={setK} />
      <p className="text-lg font-semibold"><MathText text={direct ? `y = ${k} · x` : `y = ${k}/x`} /></p>
      <Plane x={[0, 8]} y={[0, 40]} yStep={5} xLabel="x" yLabel="y"
        label={direct
          ? `Recta que pasa por el origen: y = ${k} por x. Al duplicar x, y se duplica.`
          : `Hipérbola x por y = ${k}. Al duplicar x, y se reduce a la mitad; nunca toca los ejes.`}>
        {(s) => (
          <>
            {ghost && ghost.mode === mode && ghost.k !== k && (
              <path d={curve((x) => (direct ? ghost.k * x : ghost.k / x), [direct ? 0 : 0.3, 8], s)} className="fill-none stroke-slate-500" strokeWidth={2} strokeDasharray="4 4" />
            )}
            <path d={curve(f, [direct ? 0 : 0.3, 8], s)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            <PointMarks points={points} scale={s} selected={pick} onSelect={setPick} className="fill-amber-300/80" />
            <Handle x={s.sx(2)} y={s.sy(f(2))}
              onDrag={(_, py) => setK(direct ? snap(s.iy(py) / 2, 1, 8) : snap(s.iy(py) * 2, 6, 48, 6))} />
          </>
        )}
      </Plane>
      <GhostNote show={Boolean(ghost && ghost.mode === mode && ghost.k !== k)} />
      <PointReader id={`${id}-pt`} points={points} selected={pick} onSelect={setPick} />
      <table className="w-full text-left text-sm tabular-nums">
        <caption className="sr-only">Valores de la relación</caption>
        <thead>
          <tr><th className="p-2">x</th><th className="p-2">y</th><th className="p-2">{direct ? "y ÷ x" : "x · y"}</th></tr>
        </thead>
        <tbody>
          {xs.map((x) => (
            <tr key={x} className="border-t border-slate-700">
              <td className="p-2">{x}</td>
              <td className="p-2">{num(f(x))}</td>
              <td className="p-2">{num(direct ? f(x) / x : x * f(x))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-slate-300">
        {direct
          ? "Directa: una recta que sale del origen. Si x se multiplica por 2, y también; el cociente y ÷ x no cambia."
          : "Inversa: una curva que baja sin tocar los ejes. Si x se multiplica por 2, y se divide entre 2; el producto x · y no cambia."}{" "}
        Arrastra el punto de x = 2 y observa cómo se mueven los demás.
      </p>
      <Challenge goals={[
        { text: "En una relación directa, haz que y = 18 cuando x = 3.", met: direct && k === 6 },
        { text: "En una relación inversa, consigue y = 12 cuando x = 3.", met: !direct && k === 36, hint: "En la inversa, x · y siempre da la constante." },
        { text: "Directa: ¿qué constante hace que y = 10 cuando x = 2?", met: direct && k === 5 },
      ]} />
    </>
  );
}

/** y = (x − p)(x − q): la parábola corta el eje x exactamente en las raíces. */
export function ParabolaVisual({ id }: { id: string }) {
  const [p, setP] = useState(-1);
  const [q, setQ] = useState(3);
  const ghost = useGhost({ p, q });
  const f = (x: number) => (x - p) * (x - q),
    sum = p + q,
    prod = p * q,
    vx = sum / 2;
  const sign = (n: number) => (n < 0 ? `− ${num(-n)}` : `+ ${num(n)}`);
  const factor = (r: number) => (r === 0 ? "x" : `(x ${r < 0 ? "+" : "−"} ${Math.abs(r)})`);
  return (
    <>
      <Slider id={`${id}-p`} label="Primera raíz p" value={p} min={-5} max={5} onChange={setP} />
      <Slider id={`${id}-q`} label="Segunda raíz q" value={q} min={-5} max={5} onChange={setQ} />
      <p className="text-lg font-semibold">
        y = {factor(p)}{factor(q)} = x² {sum === 0 ? "" : `${sign(-sum)}x `}{prod === 0 ? "" : sign(prod)}
      </p>
      <Plane x={[-6, 6]} y={[-12, 16]} yStep={4} xLabel="x" yLabel="y"
        label={`Parábola que corta el eje x en ${num(p)}${p === q ? ", una sola vez" : ` y en ${num(q)}`}; su punto más bajo está en x = ${num(vx)}`}>
        {(s) => (
          <>
            {ghost && <path d={curve((x) => (x - ghost.p) * (x - ghost.q), [-6, 6], s)} className="fill-none stroke-slate-500" strokeWidth={2} strokeDasharray="4 4" />}
            <path d={curve(f, [-6, 6], s)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            <line x1={s.sx(vx)} x2={s.sx(vx)} y1={s.sy(-12)} y2={s.sy(16)} className="stroke-slate-600" strokeDasharray="3 3" />
            <Handle x={s.sx(p)} y={s.sy(0)} onDrag={(px) => setP(snap(s.ix(px), -5, 5))} />
            <Handle x={s.sx(q)} y={s.sy(0)} className="fill-rose-300" shape="square" onDrag={(px) => setQ(snap(s.ix(px), -5, 5))} />
          </>
        )}
      </Plane>
      <GhostNote show={Boolean(ghost)} />
      <p className="text-sm">
        Raíces: x = {num(p)}{p === q ? " (doble)" : ` y x = ${num(q)}`}. Suman {num(sum)} y multiplican {num(prod)}: por eso
        x² {sum === 0 ? "" : `${sign(-sum)}x `}{prod === 0 ? "" : sign(prod)} se factoriza así.
      </p>
      <ValueTable caption="Valores de la parábola" headers={["x", "y"]}
        rows={[-3, -2, -1, 0, 1, 2, 3, 4, 5].map((x) => [num(x), num(f(x))])} />
      <p className="text-sm text-slate-300">
        Arrastra las raíces sobre el eje x (el círculo es p y el cuadrado, q). En las raíces y = 0: uno de los factores vale 0. La parábola es simétrica respecto de x = {num(vx)}, a mitad de camino entre las raíces.
      </p>
      <Challenge goals={[
        { text: "Haz que la parábola corte el eje x en −2 y en 4.", met: (p === -2 && q === 4) || (p === 4 && q === -2) },
        { text: "Consigue una parábola que toque el eje x una sola vez, en x = 1.", met: p === 1 && q === 1 },
        { text: "Coloca el punto más bajo justo sobre el eje y (x = 0) sin que las raíces coincidan.", met: sum === 0 && p !== q },
      ]} />
    </>
  );
}

/** Desigualdad sobre la recta: punto abierto o cerrado y el sentido de la solución. */
export function InequalityVisual({ id }: { id: string }) {
  const [bound, setBound] = useState(3);
  const [op, setOp] = useState("<");
  const [test, setTest] = useState(-2);
  const flip: Record<string, string> = { "<": ">", "≤": "≥", ">": "<", "≥": "≤" };
  const holds = (x: number, o: string, v: number) =>
    o === "<" ? x < v : o === "≤" ? x <= v : o === ">" ? x > v : x >= v;
  const closed = op === "≤" || op === "≥",
    right = op === ">" || op === "≥";
  const sx = (x: number) => 20 + ((x + 10) / 20) * 280,
    ix = (px: number) => ((px - 20) / 280) * 20 - 10;
  const ok = holds(test, op, bound);
  return (
    <>
      <Toggle label="Signo de la desigualdad" value={op} onChange={setOp}
        options={["<", "≤", ">", "≥"].map((o): [string, string] => [o, o])} />
      <Slider id={`${id}-v`} label="Valor límite" value={bound} min={-8} max={8} onChange={setBound} />
      <p className="text-lg font-semibold">x {op} {num(bound)}</p>
      <svg role="img" viewBox="0 0 320 60" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Solución: todos los números ${right ? "mayores" : "menores"} que ${num(bound)}, ${closed ? "incluido" : "sin incluir"} el ${num(bound)}. Punto ${closed ? "cerrado" : "abierto"}.`}>
        <line x1={20} x2={300} y1={30} y2={30} className="stroke-slate-500" strokeWidth={1.5} />
        {Array.from({ length: 21 }, (_, i) => i - 10).map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={26} y2={34} className="stroke-slate-500" />
            {t % 2 === 0 && <text x={sx(t)} y={50} textAnchor="middle" className="fill-slate-300 text-[13px]">{num(t)}</text>}
          </g>
        ))}
        <line x1={sx(bound)} x2={right ? 300 : 20} y1={30} y2={30} className="stroke-cyan-300" strokeWidth={5} />
        <circle cx={sx(bound)} cy={30} r={6} strokeWidth={2.5}
          className={closed ? "fill-cyan-300 stroke-cyan-300" : "fill-slate-950 stroke-cyan-300"} />
        <Handle x={sx(bound)} y={30} r={3} className="fill-transparent"
          onDrag={(px) => setBound(snap(ix(px), -8, 8))} />
        <path d={`M${sx(test)},16 l-6,-10 h12 z`} className={ok ? "fill-emerald-300" : "fill-rose-300"} />
        <Handle x={sx(test)} y={10} r={3} className="fill-transparent"
          onDrag={(px) => setTest(snap(ix(px), -10, 10))} />
      </svg>
      <Slider id={`${id}-t`} label="Prueba un valor" value={test} min={-10} max={10} onChange={setTest} />
      <p className="text-sm">
        ¿{num(test)} {op} {num(bound)}? <strong>{ok ? "Sí" : "No"}</strong>. Multiplicado por −1:
        ¿{num(-test)} {flip[op]} {num(-bound)}? <strong>{holds(-test, flip[op], -bound) ? "Sí" : "No"}</strong>.
      </p>
      <p className="text-sm text-slate-300">
        Arrastra el círculo o el triángulo sobre la recta. Al multiplicar ambos lados por −1 el orden se invierte: x {op} {num(bound)} equivale a −x {flip[op]} {num(-bound)}. Las dos respuestas siempre coinciden.
      </p>
      <Challenge goals={[
        { text: "Representa la solución de x ≥ −2.", met: op === "≥" && bound === -2 },
        { text: "Representa la solución de −x > 2 (piensa qué pasa al multiplicar por −1).", met: op === "<" && bound === -2 },
        { text: "Elige un valor de prueba que NO cumpla la desigualdad dibujada.", met: !ok },
      ]} />
    </>
  );
}
