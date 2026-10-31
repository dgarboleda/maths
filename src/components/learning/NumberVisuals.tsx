"use client";

import { useState } from "react";
import { MathText } from "@/components/MathText";
import { num, Slider, Toggle } from "./GraphVisuals";

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
const sg = (n: number) => (n < 0 ? `−${-n}` : String(n));
/** n/d simplificada, como texto («3», «−1/2»). */
function frac(n: number, d: number) {
  const g = gcd(n, d) || 1;
  const [p, q] = [n / g, d / g];
  return q === 1 ? sg(p) : `${sg(p)}/${q}`;
}

/** Barra de `parts` partes iguales con `filled` coloreadas (puede pasar de 1). */
function Bars({ filled, parts, color, label }: { filled: number; parts: number; color: string; label: string }) {
  const units = Math.max(1, Math.ceil(filled / parts));
  return (
    <div role="img" aria-label={label} className="space-y-1">
      {Array.from({ length: units }, (_, u) => (
        <div key={u} className="flex h-9 overflow-hidden rounded-lg border border-slate-500">
          {Array.from({ length: parts }, (_, i) => (
            <span key={i} aria-hidden="true"
              className={`flex-1 border-r border-slate-700 last:border-r-0 ${u * parts + i < filled ? color : "bg-slate-900"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Suma y resta de fracciones: se cortan las dos barras en partes del mismo
 *  tamaño (denominador común) y entonces sí se pueden juntar o quitar. */
export function FractionSumVisual({ id }: { id: string }) {
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const [c, setC] = useState(1);
  const [d, setD] = useState(3);
  const [op, setOp] = useState("suma");
  const L = lcm(b, d),
    A = a * (L / b),
    C = c * (L / d),
    R = op === "suma" ? A + C : A - C;
  return (
    <>
      <Toggle label="Operación" value={op} onChange={setOp} options={[["suma", "Sumar"], ["resta", "Restar"]]} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Slider id={`${id}-b`} label="Denominador de la primera" value={b} min={2} max={6} onChange={(v) => { setB(v); setA((x) => Math.min(x, v)); }} />
          <Slider id={`${id}-a`} label="Numerador de la primera" value={a} min={1} max={b} onChange={setA} />
        </div>
        <div>
          <Slider id={`${id}-d`} label="Denominador de la segunda" value={d} min={2} max={6} onChange={(v) => { setD(v); setC((x) => Math.min(x, v)); }} />
          <Slider id={`${id}-c`} label="Numerador de la segunda" value={c} min={1} max={d} onChange={setC} />
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-200">Con sus partes originales no se pueden juntar: son de tamaños distintos.</p>
      <Bars filled={a} parts={b} color="bg-cyan-300" label={`${a}/${b}: ${a} de ${b} partes`} />
      <Bars filled={c} parts={d} color="bg-amber-300" label={`${c}/${d}: ${c} de ${d} partes`} />
      <p className="text-sm font-semibold text-slate-200">Cortadas en {L} partes iguales (denominador común):</p>
      <Bars filled={A} parts={L} color="bg-cyan-300" label={`${a}/${b} = ${A}/${L}`} />
      <Bars filled={C} parts={L} color="bg-amber-300" label={`${c}/${d} = ${C}/${L}`} />
      <p className="text-lg font-bold">
        <MathText text={`${a}/${b} ${op === "suma" ? "+" : "−"} ${c}/${d} = ${A}/${L} ${op === "suma" ? "+" : "−"} ${C}/${L} = ${sg(R)}/${L}${gcd(R, L) > 1 && R !== 0 ? ` = ${frac(R, L)}` : ""}`} />
      </p>
      <p className="text-sm text-slate-300">
        Se suman o restan los numeradores porque las partes ya son del mismo tamaño; el denominador ({L}) no cambia.
        {R < 0 && " El resultado es negativo: se quitó más de lo que había."}
      </p>
    </>
  );
}

/** Producto de fracciones como área (a/b de c/d) y cociente como «cuántas
 *  veces cabe». */
export function FractionProductVisual({ id }: { id: string }) {
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [c, setC] = useState(3);
  const [d, setD] = useState(4);
  const [op, setOp] = useState("producto");
  const cell = 240 / Math.max(b, d);
  return (
    <>
      <Toggle label="Operación" value={op} onChange={setOp} options={[["producto", "Multiplicar"], ["cociente", "Dividir"]]} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Slider id={`${id}-a`} label="Numerador de la primera" value={a} min={1} max={b} onChange={setA} />
          <Slider id={`${id}-b`} label="Denominador de la primera" value={b} min={2} max={6} onChange={(v) => { setB(v); setA((x) => Math.min(x, v)); }} />
        </div>
        <div>
          <Slider id={`${id}-c`} label="Numerador de la segunda" value={c} min={1} max={d} onChange={setC} />
          <Slider id={`${id}-d`} label="Denominador de la segunda" value={d} min={2} max={6} onChange={(v) => { setD(v); setC((x) => Math.min(x, v)); }} />
        </div>
      </div>
      {op === "producto" ? (
        <>
          <svg role="img" viewBox={`0 0 ${b * cell + 2} ${d * cell + 2}`} className="mx-auto w-full max-w-60 rounded-lg bg-slate-950"
            aria-label={`Cuadrado unidad dividido en ${b} columnas y ${d} filas: ${a} columnas y ${c} filas se cruzan en ${a * c} de ${b * d} casillas.`}>
            {Array.from({ length: b * d }, (_, k) => {
              const col = k % b,
                row = Math.floor(k / b),
                inA = col < a,
                inC = row < c;
              return (
                <rect key={k} x={1 + col * cell} y={1 + row * cell} width={cell} height={cell}
                  className={`stroke-slate-700 ${inA && inC ? "fill-emerald-400" : inA ? "fill-cyan-900" : inC ? "fill-amber-900" : "fill-slate-900"}`} />
              );
            })}
          </svg>
          <p className="text-lg font-bold">
            <MathText text={`${a}/${b} × ${c}/${d} = (${a} × ${c})/(${b} × ${d}) = ${a * c}/${b * d}${gcd(a * c, b * d) > 1 ? ` = ${frac(a * c, b * d)}` : ""}`} />
          </p>
          <p className="text-sm text-slate-300">
            <MathText text={`Las columnas marcan ${a}/${b} y las filas ${c}/${d}. Donde se cruzan (verde) está «${a}/${b} de ${c}/${d}»: ${a * c} de las ${b * d} casillas del cuadrado. El resultado es menor que cada fracción porque se toma una parte de una parte.`} />
          </p>
        </>
      ) : (
        <>
          <Bars filled={a * (lcm(b, d) / b)} parts={lcm(b, d)} color="bg-cyan-300" label={`${a}/${b} en partes de 1/${lcm(b, d)}`} />
          <Bars filled={c * (lcm(b, d) / d)} parts={lcm(b, d)} color="bg-amber-300" label={`${c}/${d} en partes de 1/${lcm(b, d)}`} />
          <p className="text-lg font-bold">
            <MathText text={`${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c} = ${frac(a * d, b * c)}`} />
          </p>
          <p className="text-sm text-slate-300">
            <MathText text={`Dividir pregunta cuántas veces cabe ${c}/${d} (ámbar) en ${a}/${b} (cian): ${a * (lcm(b, d) / b)} partes entre ${c * (lcm(b, d) / d)} partes = ${a * d >= b * c ? `${frac(a * d, b * c)} veces` : `solo ${frac(a * d, b * c)} de una vez: no cabe entera`}. Por eso se multiplica por la fracción invertida.`} />
          </p>
        </>
      )}
    </>
  );
}

/** Producto de enteros como saltos repetidos en la recta: k grupos de n; si
 *  k es negativo se toma el opuesto (los saltos cambian de sentido). */
export function IntegerProductVisual({ id }: { id: string }) {
  const [k, setK] = useState(3);
  const [n, setN] = useState(-4);
  const result = k * n;
  const step = k < 0 ? -n : n;
  const W = 320,
    x = (v: number) => 20 + ((v + 30) / 60) * (W - 40);
  const jumps = Array.from({ length: Math.abs(k) }, (_, i) => [i * step, (i + 1) * step]);
  return (
    <>
      <Slider id={`${id}-k`} label="Cantidad de grupos (primer factor)" value={k} min={-5} max={5} onChange={setK} />
      <Slider id={`${id}-n`} label="Tamaño de cada grupo (segundo factor)" value={n} min={-6} max={6} onChange={setN} />
      <svg role="img" viewBox={`0 0 ${W} 80`} className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`${sg(k)} por ${sg(n)}: ${Math.abs(k)} saltos de ${sg(step)} desde 0 llegan a ${sg(result)}.`}>
        <line x1={20} x2={W - 20} y1={52} y2={52} className="stroke-slate-500" />
        {Array.from({ length: 13 }, (_, i) => -30 + i * 5).map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={47} y2={57} className="stroke-slate-500" />
            <text x={x(t)} y={72} textAnchor="middle" className={`text-[11px] ${t === 0 ? "fill-white" : "fill-slate-400"}`}>{sg(t)}</text>
          </g>
        ))}
        {jumps.map(([from, to], i) => (
          <path key={i} d={`M${x(from)},50 Q${(x(from) + x(to)) / 2},${18} ${x(to)},50`}
            className={`fill-none ${step < 0 ? "stroke-rose-300" : "stroke-cyan-300"}`} strokeWidth={2} />
        ))}
        <circle cx={x(result)} cy={52} r={5} className="fill-amber-300" />
      </svg>
      <p className="text-lg font-bold">{sg(k)} × {k === 0 ? sg(n) : n < 0 ? `(${sg(n)})` : n} = {sg(result)}</p>
      <p className="text-sm text-slate-300">
        {k === 0 || n === 0
          ? "Cero grupos, o grupos de cero: el resultado es 0."
          : k > 0
            ? `${k} grupos de ${sg(n)}: se salta ${k} veces ${n > 0 ? "hacia la derecha" : "hacia la izquierda"}.`
            : `Con el primer factor negativo se toma el opuesto: ${Math.abs(k)} saltos de ${sg(-n)}. Por eso ${result > 0 ? "negativo por negativo da positivo" : "negativo por positivo da negativo"}.`}{" "}
        Dividir deshace la multiplicación: {sg(result)} ÷ {sg(k || 1)} = {k === 0 ? "—" : sg(result / k)}.
      </p>
    </>
  );
}

/** Orden de las operaciones: misma expresión con y sin paréntesis. */
export function OrderOfOperationsVisual({ id }: { id: string }) {
  const [a, setA] = useState(10);
  const [b, setB] = useState(3);
  const [c, setC] = useState(4);
  const [form, setForm] = useState("sin");
  const right = form === "sin" ? a - b * c : (a - b) * c;
  const wrong = form === "sin" ? (a - b) * c : a - b * c;
  return (
    <>
      <Toggle label="Expresión" value={form} onChange={setForm}
        options={[["sin", "a − b × c"], ["con", "(a − b) × c"]]} />
      <Slider id={`${id}-a`} label="a" value={a} min={1} max={20} onChange={setA} />
      <Slider id={`${id}-b`} label="b" value={b} min={1} max={9} onChange={setB} />
      <Slider id={`${id}-c`} label="c" value={c} min={1} max={9} onChange={setC} />
      <ol className="space-y-2 rounded-xl bg-slate-950 p-4 text-lg font-semibold" aria-label="Pasos en el orden correcto">
        {form === "sin" ? (
          <>
            <li>{a} − <mark className="rounded bg-amber-300 px-1 text-slate-950">{b} × {c}</mark> <span className="text-sm text-slate-400">primero la multiplicación</span></li>
            <li>{a} − {b * c} = <strong>{sg(right)}</strong></li>
          </>
        ) : (
          <>
            <li><mark className="rounded bg-amber-300 px-1 text-slate-950">({a} − {b})</mark> × {c} <span className="text-sm text-slate-400">primero el paréntesis</span></li>
            <li>{sg(a - b)} × {c} = <strong>{sg(right)}</strong></li>
          </>
        )}
      </ol>
      <p className="text-sm text-slate-300">
        {right === wrong
          ? "Con estos valores el orden da lo mismo, pero no siempre: prueba otros números."
          : `Si se hiciera en el otro orden saldría ${sg(wrong)}: ${form === "sin" ? "el paréntesis cambia el resultado" : "sin paréntesis la multiplicación iría primero"}.`}
      </p>
    </>
  );
}

/** Cuadrados y raíces: el lado del cuadrado de área A es √A; si A no es un
 *  cuadrado perfecto, la raíz queda entre dos enteros. */
export function SquareRootVisual({ id }: { id: string }) {
  const [area, setArea] = useState(50);
  const n = Math.floor(Math.sqrt(area));
  const perfect = n * n === area;
  const size = n + 1,
    cell = 200 / Math.max(size, 1);
  return (
    <>
      <Slider id={`${id}-area`} label="Área del cuadrado (casillas)" value={area} min={1} max={100} onChange={setArea} />
      <svg role="img" viewBox="0 0 204 204" className="mx-auto w-full max-w-56 rounded-lg bg-slate-950"
        aria-label={perfect ? `Cuadrado de ${n} por ${n}: área ${area}, lado √${area} = ${n}.` : `${area} casillas: más que el cuadrado de ${n} (${n * n}) y menos que el de ${n + 1} (${(n + 1) ** 2}).`}>
        {Array.from({ length: size * size }, (_, k) => {
          const col = k % size,
            row = Math.floor(k / size);
          const inSquare = col < n && row < n;
          // Las casillas que sobran después del cuadrado de lado n, en el borde.
          const extraIndex = col === n ? row : row === n ? n + 1 + col : -1;
          const extra = !inSquare && extraIndex >= 0 && extraIndex < area - n * n;
          return (
            <rect key={k} x={2 + col * cell} y={2 + row * cell} width={cell} height={cell}
              className={`stroke-slate-700 ${inSquare ? "fill-cyan-700" : extra ? "fill-amber-400" : "fill-slate-900"}`} />
          );
        })}
      </svg>
      <p className="text-lg font-bold">
        <MathText text={perfect ? `√${area} = ${n}, porque ${n}² = ${n} × ${n} = ${area}` : `${n} < √${area} < ${n + 1}`} />
      </p>
      <p className="text-sm text-slate-300">
        <MathText text={perfect
          ? `${area} casillas forman un cuadrado exacto de lado ${n}: la raíz cuadrada es el lado.`
          : `${area} no es un cuadrado perfecto: ${n}² = ${n * n} se queda corto (${area - n * n === 1 ? "sobra 1" : `sobran ${area - n * n}`}, en ámbar) y ${n + 1}² = ${(n + 1) ** 2} se pasa. ${num(Math.sqrt(area))} es una aproximación de √${area}.`} />
      </p>
    </>
  );
}
