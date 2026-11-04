"use client";

import { useState } from "react";
import { MathText } from "@/components/MathText";
import { Challenge, Slider, Toggle } from "./GraphVisuals";

const W = 320;

/** Rectángulo con su área escrita en el centro (si cabe). */
function Piece({ x, y, w, h, className, text, dashed }: { x: number; y: number; w: number; h: number; className: string; text?: string; dashed?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={Math.max(0, w)} height={Math.max(0, h)} className={className} strokeWidth={1.5} strokeDasharray={dashed ? "5 4" : undefined} />
      {text && w > 26 && h > 18 && (
        <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" className="fill-white text-[13px] font-bold">{text}</text>
      )}
    </g>
  );
}

/**
 * Productos notables como áreas: (a + b)² reparte el cuadrado en a², dos
 * rectángulos ab y b²; (a − b)² quita las dos tiras y devuelve el b² que se
 * quitó dos veces; (a + b)(a − b) es a² sin la esquina b².
 */
export function BinomialSquareVisual({ id }: { id: string }) {
  const [mode, setMode] = useState("suma");
  const [a, setA] = useState(5);
  const [b, setB] = useState(2);
  const sb = mode === "suma" ? b : Math.min(b, a - 1); // en las restas, b < a
  const side = mode === "suma" ? a + sb : a;
  const u = 200 / side,
    x0 = 16,
    y0 = 12;
  const A = a * u,
    B = sb * u;
  const total = mode === "suma" ? (a + sb) ** 2 : mode === "resta" ? (a - sb) ** 2 : a * a - sb * sb;
  const formula =
    mode === "suma"
      ? `(${a} + ${sb})² = ${a}² + 2 · ${a} · ${sb} + ${sb}² = ${a * a} + ${2 * a * sb} + ${sb * sb} = ${total}`
      : mode === "resta"
        ? `(${a} − ${sb})² = ${a}² − 2 · ${a} · ${sb} + ${sb}² = ${a * a} − ${2 * a * sb} + ${sb * sb} = ${total}`
        : `(${a} + ${sb})(${a} − ${sb}) = ${a}² − ${sb}² = ${a * a} − ${sb * sb} = ${total}`;
  const label =
    mode === "suma"
      ? `Cuadrado de lado ${a} + ${sb} dividido en ${a}² = ${a * a}, dos rectángulos de ${a} por ${sb} = ${a * sb} cada uno y ${sb}² = ${sb * sb}: en total ${total}.`
      : mode === "resta"
        ? `Cuadrado de lado ${a}: al quitar dos tiras de ${a} por ${sb} se quita dos veces la esquina de ${sb}², por eso se suma una vez. Queda ${total}.`
        : `Cuadrado de lado ${a} sin la esquina de ${sb}²: ${a * a} − ${sb * sb} = ${total}, el mismo área que un rectángulo de ${a + sb} por ${a - sb}.`;
  return (
    <>
      <Toggle label="Producto notable" value={mode} onChange={(m) => { setMode(m); if (m !== "suma") setB((v) => Math.min(v, a - 1)); }}
        options={[["suma", "(a + b)²"], ["resta", "(a − b)²"], ["conjugados", "(a + b)(a − b)"]]} />
      <Slider id={`${id}-a`} label="a" value={a} min={2} max={8} onChange={(v) => { setA(v); if (mode !== "suma") setB((x) => Math.min(x, v - 1)); }} />
      <Slider id={`${id}-b`} label="b" value={sb} min={1} max={mode === "suma" ? 6 : a - 1} onChange={setB} />
      <svg role="img" aria-label={label} viewBox={`0 0 ${W} 238`} className="w-full max-w-md rounded-xl bg-slate-950">
        {mode === "suma" && (
          <>
            <Piece x={x0} y={y0} w={A} h={A} className="fill-cyan-300/40 stroke-cyan-200" text={`${a}² = ${a * a}`} />
            <Piece x={x0 + A} y={y0} w={B} h={A} className="fill-amber-300/40 stroke-amber-200" text={`${a * sb}`} />
            <Piece x={x0} y={y0 + A} w={A} h={B} className="fill-amber-300/40 stroke-amber-200" text={`${a}·${sb} = ${a * sb}`} />
            <Piece x={x0 + A} y={y0 + A} w={B} h={B} className="fill-rose-300/50 stroke-rose-200" text={`${sb * sb}`} />
          </>
        )}
        {mode === "resta" && (
          <>
            <Piece x={x0} y={y0} w={A} h={A} className="fill-slate-700/40 stroke-slate-400" />
            <Piece x={x0} y={y0} w={A - B} h={A - B} className="fill-cyan-300/50 stroke-cyan-200" text={`${a - sb}² = ${total}`} />
            <Piece x={x0 + A - B} y={y0} w={B} h={A} className="fill-amber-300/25 stroke-amber-200" dashed />
            <Piece x={x0} y={y0 + A - B} w={A} h={B} className="fill-amber-300/25 stroke-amber-200" dashed />
            <Piece x={x0 + A - B} y={y0 + A - B} w={B} h={B} className="fill-rose-300/60 stroke-rose-200" text={`${sb * sb}`} />
          </>
        )}
        {mode === "conjugados" && (
          <>
            <Piece x={x0} y={y0} w={A} h={A} className="fill-cyan-300/40 stroke-cyan-200" text={`${a * a} − ${sb * sb}`} />
            <Piece x={x0 + A - B} y={y0 + A - B} w={B} h={B} className="fill-slate-950 stroke-rose-300" dashed />
            {/* El mismo área reordenado: (a + b) de base por (a − b) de altura. */}
            {(() => {
              const k = Math.min(1, 86 / ((a + sb) * u)),
                rx = x0 + A + 12,
                rw = (a + sb) * u * k,
                rh = (a - sb) * u * k;
              return <Piece x={rx} y={y0} w={rw} h={rh} className="fill-cyan-300/40 stroke-cyan-200" text={`${a + sb}·${a - sb}`} />;
            })()}
          </>
        )}
        <text x={x0} y={230} className="fill-slate-300 text-[12px]">
          {mode === "suma" ? `lado: ${a} + ${sb}` : mode === "resta" ? `lado: ${a}; se quitan tiras de ancho ${sb}` : `esquina quitada: ${sb}²`}
        </text>
      </svg>
      <p className="text-lg font-semibold"><MathText text={formula} /></p>
      <p className="text-sm text-slate-300">
        {mode === "suma"
          ? <>Error frecuente: escribir solo {a}² + {sb}² = {a * a + sb * sb}. Faltan los dos rectángulos ámbar ({2 * a * sb}): por eso aparece el término 2ab.</>
          : mode === "resta"
            ? <>Al quitar las dos tiras punteadas se quita dos veces la esquina rosa ({sb * sb}); por eso se vuelve a sumar una vez: − 2ab + b².</>
            : <>Si se quita la esquina de {sb}² al cuadrado de {a}², lo que queda cabe en un rectángulo de {a + sb} por {a - sb}: los productos cruzados se cancelan.</>}
      </p>
      <Challenge goals={[
        { text: "Encuentra a y b para que (a + b)² = 100.", met: mode === "suma" && a + sb === 10 },
        { text: "Consigue que los dos rectángulos ámbar sumen 24 (2ab = 24).", met: mode === "suma" && 2 * a * sb === 24 },
        { text: "Con conjugados, consigue un resultado de 15.", met: mode === "conjugados" && a * a - sb * sb === 15, hint: "Busca dos cuadrados que se diferencien en 15." },
      ]} />
    </>
  );
}

/** a(b + c) como un rectángulo de altura a partido en dos: a·b + a·c. */
export function DistributiveVisual({ id }: { id: string }) {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [c, setC] = useState(2);
  const u = Math.min(250 / (b + c), 120 / a),
    x0 = 20,
    y0 = 20;
  return (
    <>
      <Slider id={`${id}-a`} label="Factor a (altura)" value={a} min={1} max={6} onChange={setA} />
      <Slider id={`${id}-b`} label="b (primer tramo)" value={b} min={1} max={8} onChange={setB} />
      <Slider id={`${id}-c`} label="c (segundo tramo)" value={c} min={1} max={6} onChange={setC} />
      <svg role="img" viewBox={`0 0 ${W} ${a * u + 64}`} className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Rectángulo de altura ${a} y base ${b} + ${c}: se reparte en ${a} por ${b} = ${a * b} y ${a} por ${c} = ${a * c}; en total ${a * (b + c)}.`}>
        <Piece x={x0} y={y0} w={b * u} h={a * u} className="fill-cyan-300/40 stroke-cyan-200" text={`${a}·${b} = ${a * b}`} />
        <Piece x={x0 + b * u} y={y0} w={c * u} h={a * u} className="fill-amber-300/40 stroke-amber-200" text={`${a * c}`} />
        <text x={x0 + (b * u) / 2} y={y0 - 6} textAnchor="middle" className="fill-cyan-100 text-[13px] font-bold">{b}</text>
        <text x={x0 + b * u + (c * u) / 2} y={y0 - 6} textAnchor="middle" className="fill-amber-100 text-[13px] font-bold">{c}</text>
        <text x={x0 - 6} y={y0 + (a * u) / 2 + 5} textAnchor="end" className="fill-slate-100 text-[13px] font-bold">{a}</text>
        <text x={x0} y={y0 + a * u + 22} className="fill-slate-300 text-[12px]">base: {b} + {c} = {b + c}</text>
      </svg>
      <p className="text-lg font-semibold"><MathText text={`${a}(${b} + ${c}) = ${a} · ${b} + ${a} · ${c} = ${a * b} + ${a * c} = ${a * (b + c)}`} /></p>
      <p className="text-sm text-slate-300">
        Error frecuente: multiplicar solo el primer término, {a} · {b} + {c} = {a * b + c}. El factor {a} es la altura de todo el rectángulo, así que multiplica a los dos tramos. Leído al revés, {a * b} + {a * c} = {a}({b} + {c}) es sacar factor común.
      </p>
      <Challenge goals={[
        { text: "Con a = 4, consigue que a(b + c) = 36.", met: a === 4 && a * (b + c) === 36 },
        { text: "Haz que las dos partes tengan el mismo área. ¿Qué cumplen b y c?", met: b === c },
        { text: "Escribe 12 + 18 como a(b + c) con el mayor factor común posible.", met: a === 6 && a * b === 12 && a * c === 18, hint: "¿Cuál es el mayor número que divide a 12 y a 18?" },
      ]} />
    </>
  );
}
