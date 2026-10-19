"use client";

import { useId, useState, type ReactNode } from "react";

/** Formato de números para leer en voz alta y en pantalla (signo menos tipográfico). */
export const num = (x: number) =>
  (x < 0 ? "−" : "") +
  Math.abs(x).toLocaleString("es", { maximumFractionDigits: 2 });

export interface Scale {
  sx: (x: number) => number;
  sy: (y: number) => number;
  /** Inversas: de coordenadas del SVG a coordenadas matemáticas. */
  ix: (px: number) => number;
  iy: (py: number) => number;
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
}: {
  x: number;
  y: number;
  onDrag: (px: number, py: number) => void;
  className?: string;
  r?: number;
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
      <circle cx={x} cy={y} r={r} strokeWidth={2} className={`${className} stroke-slate-950`} />
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
  xStep = 1,
  yStep = 1,
  label,
  children,
}: {
  x: [number, number];
  y: [number, number];
  xStep?: number;
  yStep?: number;
  label: string;
  children: (scale: Scale) => ReactNode;
}) {
  const sx = (x: number) => PAD + ((x - x0) / (x1 - x0)) * (W - 2 * PAD),
    sy = (y: number) => H - PAD - ((y - y0) / (y1 - y0)) * (H - 2 * PAD),
    ix = (px: number) => x0 + ((px - PAD) / (W - 2 * PAD)) * (x1 - x0),
    iy = (py: number) => y0 + ((H - PAD - py) / (H - 2 * PAD)) * (y1 - y0);
  const ticks = (a: number, b: number, step: number) =>
    Array.from(
      { length: Math.floor((b - a) / step) + 1 },
      (_, i) => Math.ceil(a / step) * step + i * step,
    ).filter((t) => t <= b);
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
          <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
        </clipPath>
      </defs>
      {ticks(x0, x1, xStep).map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={PAD} y2={H - PAD} className="stroke-slate-800" />
          <text x={sx(t)} y={H - PAD + 14} textAnchor="middle" className="fill-slate-400 text-[9px]">
            {num(t)}
          </text>
        </g>
      ))}
      {ticks(y0, y1, yStep).map((t) => (
        <g key={`y${t}`}>
          <line x1={PAD} x2={W - PAD} y1={sy(t)} y2={sy(t)} className="stroke-slate-800" />
          <text x={PAD - 4} y={sy(t) + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
            {num(t)}
          </text>
        </g>
      ))}
      {x0 <= 0 && x1 >= 0 && (
        <line x1={sx(0)} x2={sx(0)} y1={PAD} y2={H - PAD} className="stroke-slate-400" />
      )}
      {y0 <= 0 && y1 >= 0 && (
        <line x1={PAD} x2={W - PAD} y1={sy(0)} y2={sy(0)} className="stroke-slate-400" />
      )}
      <g clipPath={`url(#${clipId})`}>{children({ sx, sy, ix, iy })}</g>
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
          className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${value === key ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-600 bg-slate-900 text-slate-100"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function LinearVisual({ id }: { id: string }) {
  const [slope, setSlope] = useState(3);
  const [intercept, setIntercept] = useState(2);
  const f = (x: number) => slope * x + intercept;
  return (
    <>
      <Slider id={`${id}-m`} label="Cambio por unidad (pendiente)" value={slope} min={-4} max={6} onChange={setSlope} />
      <Slider id={`${id}-b`} label="Valor inicial (x = 0)" value={intercept} min={-5} max={10} onChange={setIntercept} />
      <p className="font-mono text-lg">y = {num(slope)}x {intercept < 0 ? "−" : "+"} {Math.abs(intercept)}</p>
      <Plane x={[-1, 5]} y={[-20, 35]} yStep={5}
        label={`Recta y = ${num(slope)}x ${intercept < 0 ? "menos" : "más"} ${Math.abs(intercept)}: corta el eje y en ${num(intercept)} y sube ${num(slope)} por cada unidad de x`}>
        {(s) => (
          <>
            <path d={curve(f, [-1, 5], s, 2)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            {/* Triángulo de pendiente: avanzar 1 y subir (o bajar) la pendiente. */}
            <path d={`M${s.sx(1)},${s.sy(f(1))} H${s.sx(2)} V${s.sy(f(2))}`} className="fill-none stroke-amber-300" strokeWidth={2} strokeDasharray="4 3" />
            <text x={s.sx(1.5)} y={s.sy(f(1)) + (slope >= 0 ? 12 : -5)} textAnchor="middle" className="fill-amber-200 text-[10px]">+1</text>
            <text x={s.sx(2) + 4} y={(s.sy(f(1)) + s.sy(f(2))) / 2 + 3} className="fill-amber-200 text-[10px]">{slope >= 0 ? "+" : ""}{num(slope)}</text>
            <Handle x={s.sx(0)} y={s.sy(intercept)} className="fill-rose-300"
              onDrag={(_, py) => setIntercept(snap(s.iy(py), -5, 10))} />
            <Handle x={s.sx(1)} y={s.sy(f(1))}
              onDrag={(_, py) => setSlope(snap(s.iy(py) - intercept, -4, 6))} />
          </>
        )}
      </Plane>
      <table className="w-full text-left text-sm">
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
        El punto rosa es el valor inicial; el triángulo ámbar muestra la pendiente: cada vez que x aumenta 1, y cambia {num(slope)}. Arrastra cualquiera de los dos puntos para cambiar la recta.
      </p>
    </>
  );
}

/** Directa (y = kx, cociente constante) frente a inversa (x·y = k, producto constante). */
export function ProportionVisual({ id, initial }: { id: string; initial: "direct" | "inverse" }) {
  const [mode, setMode] = useState<string>(initial);
  const [k, setK] = useState(initial === "direct" ? 4 : 24);
  const direct = mode === "direct";
  const f = (x: number) => (direct ? k * x : k / x);
  const xs = [1, 2, 3, 4, 6];
  return (
    <>
      <Toggle label="Tipo de relación" value={mode}
        onChange={(m) => { setMode(m); setK(m === "direct" ? 4 : 24); }}
        options={[["direct", "Directa"], ["inverse", "Inversa"]]} />
      <Slider id={`${id}-k`} label={direct ? "Constante (y ÷ x)" : "Constante (x · y)"} value={k}
        min={direct ? 1 : 6} max={direct ? 8 : 48} step={direct ? 1 : 6} onChange={setK} />
      <p className="font-mono text-lg">{direct ? `y = ${k} · x` : `y = ${k} ÷ x`}</p>
      <Plane x={[0, 8]} y={[0, 40]} yStep={5}
        label={direct
          ? `Recta que pasa por el origen: y = ${k} por x. Al duplicar x, y se duplica.`
          : `Hipérbola x por y = ${k}. Al duplicar x, y se reduce a la mitad; nunca toca los ejes.`}>
        {(s) => (
          <>
            <path d={curve(f, [direct ? 0 : 0.3, 8], s)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            {xs.filter((x) => x !== 2).map((x) => (
              <circle key={x} cx={s.sx(x)} cy={s.sy(f(x))} r={3.5} className="fill-amber-300/70" />
            ))}
            <Handle x={s.sx(2)} y={s.sy(f(2))}
              onDrag={(_, py) => setK(direct ? snap(s.iy(py) / 2, 1, 8) : snap(s.iy(py) * 2, 6, 48, 6))} />
          </>
        )}
      </Plane>
      <table className="w-full text-left text-sm">
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
    </>
  );
}

/** y = (x − p)(x − q): la parábola corta el eje x exactamente en las raíces. */
export function ParabolaVisual({ id }: { id: string }) {
  const [p, setP] = useState(-1);
  const [q, setQ] = useState(3);
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
      <p className="font-mono text-lg">
        y = {factor(p)}{factor(q)} = x² {sum === 0 ? "" : `${sign(-sum)}x `}{prod === 0 ? "" : sign(prod)}
      </p>
      <Plane x={[-6, 6]} y={[-12, 16]} yStep={4}
        label={`Parábola que corta el eje x en ${num(p)}${p === q ? ", una sola vez" : ` y en ${num(q)}`}; su punto más bajo está en x = ${num(vx)}`}>
        {(s) => (
          <>
            <path d={curve(f, [-6, 6], s)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            <line x1={s.sx(vx)} x2={s.sx(vx)} y1={s.sy(-12)} y2={s.sy(16)} className="stroke-slate-600" strokeDasharray="3 3" />
            <Handle x={s.sx(p)} y={s.sy(0)} onDrag={(px) => setP(snap(s.ix(px), -5, 5))} />
            <Handle x={s.sx(q)} y={s.sy(0)} className="fill-rose-300" onDrag={(px) => setQ(snap(s.ix(px), -5, 5))} />
          </>
        )}
      </Plane>
      <p className="text-sm">
        Raíces: x = {num(p)}{p === q ? " (doble)" : ` y x = ${num(q)}`}. Suman {num(sum)} y multiplican {num(prod)}: por eso
        x² {sum === 0 ? "" : `${sign(-sum)}x `}{prod === 0 ? "" : sign(prod)} se factoriza así.
      </p>
      <p className="text-sm text-slate-300">
        Arrastra las raíces sobre el eje x. En las raíces y = 0: uno de los factores vale 0. La parábola es simétrica respecto de x = {num(vx)}, a mitad de camino entre las raíces.
      </p>
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
      <p className="font-mono text-lg">x {op} {num(bound)}</p>
      <svg role="img" viewBox="0 0 320 60" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Solución: todos los números ${right ? "mayores" : "menores"} que ${num(bound)}, ${closed ? "incluido" : "sin incluir"} el ${num(bound)}. Punto ${closed ? "cerrado" : "abierto"}.`}>
        <line x1={20} x2={300} y1={30} y2={30} className="stroke-slate-500" strokeWidth={1.5} />
        {Array.from({ length: 21 }, (_, i) => i - 10).map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={26} y2={34} className="stroke-slate-500" />
            {t % 2 === 0 && <text x={sx(t)} y={50} textAnchor="middle" className="fill-slate-400 text-[9px]">{num(t)}</text>}
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
    </>
  );
}
