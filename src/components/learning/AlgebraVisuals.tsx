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

/** Términos de un lado: «3x + 2», «x», «10», «0». */
function side(xs: number, units: number) {
  const parts = [xs ? `${xs === 1 ? "" : xs}x` : "", units ? `${units}` : ""].filter(Boolean);
  return parts.length ? parts.join(" + ") : "0";
}

/**
 * Balanza: ax + b = dx + e con una x oculta. Se resuelve haciendo lo mismo
 * en los dos platos (quitar una x, quitar una unidad, repartir); quitar solo
 * de un lado inclina la balanza y rompe la igualdad.
 */
export function BalanceVisual({ id, initial }: { id: string; initial: "balance" | "equation" }) {
  const [a, setA] = useState(3);
  const [d, setD] = useState(initial === "balance" ? 1 : 0);
  const [b, setB] = useState(initial === "balance" ? 2 : 6);
  const [x, setX] = useState(initial === "balance" ? 4 : 3);
  const e = (a - d) * x + b;
  const key = `${a}/${d}/${b}/${x}`;
  const [steps, setSteps] = useState({ key, xs: 0, units: 0, tilt: 0, divided: false, log: [] as string[] });
  const st = steps.key === key ? steps : { key, xs: 0, units: 0, tilt: 0, divided: false, log: [] as string[] };
  const lx = a - st.xs,
    rx = d - st.xs,
    lu = Math.max(0, b - st.units - st.tilt),
    ru = e - st.units;
  const leftValue = lx * x + lu,
    rightValue = rx * x + ru;
  const balanced = leftValue === rightValue;
  const solved = st.divided && balanced;
  const act = (patch: Partial<typeof st>, note: string) => setSteps({ ...st, ...patch, log: [...st.log, note] });
  const angle = Math.max(-12, Math.min(12, (rightValue - leftValue) * 2));
  const equation = solved ? `x = ${x}` : st.divided ? `x = ${ru}/${lx}` : `${side(lx, lu)} = ${side(rx, ru)}`;

  const pan = (cx: number, xsCount: number, unitsCount: number, xsDivided: boolean) => {
    const items = [...Array.from({ length: xsDivided ? 1 : xsCount }, () => "x"), ...Array.from({ length: unitsCount }, () => "1")];
    return items.slice(0, 16).map((it, i) => {
      const col = i % 5,
        row = Math.floor(i / 5);
      const px = cx - 50 + col * 21,
        py = 92 - row * 21;
      return it === "x"
        ? <g key={i}><rect x={px} y={py - 18} width={19} height={19} rx={3} className="fill-cyan-300 stroke-slate-950" /><text x={px + 9.5} y={py - 4} textAnchor="middle" className="fill-slate-950 text-[12px] font-bold">x</text></g>
        : <circle key={i} cx={px + 9.5} cy={py - 8} r={8} className="fill-amber-300 stroke-slate-950" />;
    });
  };
  return (
    <>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Slider id={`${id}-a`} label="x en el plato izquierdo" value={a} min={1} max={4} onChange={(v) => { setA(v); setD((w) => Math.min(w, v - 1)); }} />
        <Slider id={`${id}-d`} label="x en el plato derecho" value={d} min={0} max={a - 1} onChange={setD} />
        <Slider id={`${id}-b`} label="Unidades a la izquierda" value={b} min={0} max={8} onChange={setB} />
      </div>
      {/* La solución no se muestra: hay que despejarla. */}
      <button type="button" onClick={() => setX((v) => (v % 6) + 1)}
        className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-100">Otra ecuación (otra x oculta)</button>
      <p className="text-lg font-semibold"><MathText text={equation} /></p>
      <svg role="img" viewBox="0 0 320 170" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Balanza: a la izquierda ${side(lx, lu)}, a la derecha ${side(rx, ru)}. ${balanced ? "Está equilibrada: los dos lados valen lo mismo." : `Está inclinada hacia la ${leftValue > rightValue ? "izquierda" : "derecha"}: ya no hay igualdad.`}`}>
        <g className="motion-safe:transition-transform motion-safe:duration-500" style={{ transform: `rotate(${angle}deg)`, transformOrigin: "160px 104px" }}>
          <line x1={40} x2={280} y1={104} y2={104} className="stroke-slate-300" strokeWidth={4} strokeLinecap="round" />
          <path d="M20,104 h120 l-10,10 h-100 z" className="fill-slate-600" />
          <path d="M180,104 h120 l-10,10 h-100 z" className="fill-slate-600" />
          {pan(80, lx, lu, st.divided)}
          {pan(240, rx, st.divided ? 0 : ru, false)}
          {st.divided && <text x={240} y={88} textAnchor="middle" className="fill-amber-200 text-[14px] font-bold">{ru} ÷ {lx} = {ru / lx}</text>}
        </g>
        <path d="M160,106 l-14,48 h28 z" className="fill-slate-500" />
        <text x={160} y={166} textAnchor="middle" className={`text-[12px] font-bold ${balanced ? "fill-emerald-300" : "fill-rose-300"}`}>{balanced ? "equilibrada" : "¡desequilibrada!"}</text>
      </svg>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={st.divided || rx === 0} onClick={() => act({ xs: st.xs + 1 }, "Quitar x de los dos lados")}
          className="min-h-11 rounded-lg border border-cyan-300/60 px-3 text-sm font-semibold text-cyan-100 disabled:opacity-40">Quitar una x de cada lado</button>
        <button type="button" disabled={st.divided || lu === 0 || ru === 0} onClick={() => act({ units: st.units + 1 }, "Quitar 1 de los dos lados")}
          className="min-h-11 rounded-lg border border-amber-300/60 px-3 text-sm font-semibold text-amber-100 disabled:opacity-40">Quitar 1 de cada lado</button>
        <button type="button" disabled={st.divided || lu === 0} onClick={() => act({ tilt: st.tilt + 1 }, "Quitar 1 solo a la izquierda")}
          className="min-h-11 rounded-lg border border-rose-300/60 px-3 text-sm font-semibold text-rose-100 disabled:opacity-40">Quitar 1 solo a la izquierda</button>
        <button type="button" disabled={st.divided || rx !== 0 || lu !== 0 || lx < 1 || !balanced} onClick={() => act({ divided: true }, `Repartir entre ${lx}`)}
          className="min-h-11 rounded-lg border border-emerald-300/60 px-3 text-sm font-semibold text-emerald-100 disabled:opacity-40">Repartir en {lx} grupos iguales</button>
        <button type="button" disabled={!st.log.length} onClick={() => setSteps({ key, xs: 0, units: 0, tilt: 0, divided: false, log: [] })}
          className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-100 disabled:opacity-40">Empezar de nuevo</button>
      </div>
      <p aria-live="polite" className="text-sm text-slate-200">
        {solved
          ? `Resuelto: x = ${x}. Compruébalo: ${a} · ${x} + ${b} = ${a * x + b} y ${d ? `${d} · ${x} + ${e} = ` : ""}${d * x + e}.`
          : !balanced
            ? "Al quitar solo de un lado, la balanza se inclina: la igualdad ya no se cumple. Empieza de nuevo y haz siempre lo mismo en los dos platos."
            : st.log.length
              ? `Pasos: ${st.log.join(" → ")}.`
              : "Las cajas son x (todas pesan lo mismo) y las bolitas pesan 1. Deja las x solas en un plato haciendo lo mismo en los dos."}
      </p>
      <Challenge goals={[
        { text: "Despeja x manteniendo la balanza equilibrada en todo momento.", met: solved && st.tilt === 0 },
        { text: "Inclina la balanza a propósito. ¿Por qué deja de ser una igualdad?", met: !balanced },
        { text: "Resuelve una ecuación con x en los dos platos.", met: solved && d > 0 },
      ]} />
    </>
  );
}

/** Término con signo para escribir una expresión: «+ 3x», «− x», «+ 7». */
function term(coef: number, variable: boolean, first: boolean) {
  if (coef === 0) return "";
  const abs = Math.abs(coef),
    body = variable ? `${abs === 1 ? "" : abs}x` : `${abs}`;
  if (first) return coef < 0 ? `−${body}` : body;
  return coef < 0 ? ` − ${body}` : ` + ${body}`;
}
function expr(terms: [number, boolean][]) {
  let out = "";
  for (const [coef, variable] of terms) out += term(coef, variable, out === "");
  return out || "0";
}

/**
 * Fichas algebraicas: barras x (cian; −x en rosa) y cuadritos de 1. Agrupar
 * junta los términos semejantes y anula los pares x y −x; sustituir da el
 * valor para el x elegido.
 */
export function ExpressionVisual({ id }: { id: string }) {
  const [a, setA] = useState(4);
  const [b, setB] = useState(7);
  const [c, setC] = useState(-1);
  const [d, setD] = useState(2);
  const [x, setX] = useState(2);
  const [grouped, setGrouped] = useState(false);
  const original = expr([[a, true], [b, false], [c, true], [d, false]]);
  const simple = expr([[a + c, true], [b + d, false]]);
  const value = (a + c) * x + b + d;
  const sub = (coef: number) => `${coef === 1 ? "" : coef === -1 ? "−" : `${coef} · `}${x < 0 ? `(${x})` : x}`.replace("-", "−");
  // Fichas en el orden de la expresión o agrupadas (los pares x / −x se anulan).
  type Tile = { kind: "x" | "-x" | "1"; key: string; cancelled?: boolean };
  const tiles = (coef: number, kind: "x" | "1", tag: string): Tile[] =>
    Array.from({ length: Math.abs(coef) }, (_, i) => ({ kind: kind === "x" ? (coef < 0 ? "-x" : "x") : "1", key: `${tag}${i}` }));
  let row: Tile[] = [...tiles(a, "x", "a"), ...tiles(b, "1", "b"), ...tiles(c, "x", "c"), ...tiles(d, "1", "d")];
  if (grouped) {
    const pos = row.filter((t) => t.kind === "x"),
      neg = row.filter((t) => t.kind === "-x"),
      cancel = Math.min(pos.length, neg.length);
    row = [
      ...pos.map((t, i) => ({ ...t, cancelled: i < cancel })),
      ...neg.map((t, i) => ({ ...t, cancelled: i < cancel })),
      ...row.filter((t) => t.kind === "1"),
    ];
  }
  let cursor = 10,
    line = 0;
  const placed = row.map((t) => {
    const w = t.kind === "1" ? 16 : 40;
    if (cursor + w > 310) { cursor = 10; line += 1; }
    const at = { ...t, x: cursor, y: 14 + line * 34, w };
    cursor += w + 5;
    return at;
  });
  const height = 14 + (line + 1) * 34 + 6;
  return (
    <>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Slider id={`${id}-a`} label="Primer término en x" value={a} min={-3} max={5} onChange={setA} />
        <Slider id={`${id}-b`} label="Primer número" value={b} min={0} max={8} onChange={setB} />
        <Slider id={`${id}-c`} label="Segundo término en x" value={c} min={-3} max={3} onChange={setC} />
        <Slider id={`${id}-d`} label="Segundo número" value={d} min={0} max={6} onChange={setD} />
      </div>
      <p className="text-lg font-semibold">{grouped ? `${original} = ${simple}` : original}</p>
      <svg role="img" viewBox={`0 0 320 ${height}`} className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Fichas de ${original}: ${Math.abs(a) + Math.abs(c)} barras x y ${b + d} unidades.${grouped ? ` Agrupadas: ${simple}.` : ""}`}>
        {placed.map((t) => t.kind === "1"
          ? <rect key={t.key} x={t.x} y={t.y + 8} width={16} height={16} rx={2} className="anim-pop fill-amber-300 stroke-slate-950" />
          : (
            <g key={t.key} opacity={t.cancelled ? 0.35 : 1}>
              <rect x={t.x} y={t.y} width={40} height={24} rx={4} className={`anim-pop ${t.kind === "x" ? "fill-cyan-300" : "fill-rose-300"} stroke-slate-950`} strokeDasharray={t.cancelled ? "4 3" : undefined} />
              <text x={t.x + 20} y={t.y + 17} textAnchor="middle" className="fill-slate-950 text-[13px] font-bold">{t.kind === "x" ? "x" : "−x"}</text>
              {t.cancelled && <line x1={t.x + 2} x2={t.x + 38} y1={t.y + 22} y2={t.y + 2} className="stroke-slate-950" strokeWidth={2} />}
            </g>
          ))}
      </svg>
      <button type="button" aria-pressed={grouped} onClick={() => setGrouped((g) => !g)}
        className="min-h-11 rounded-lg border border-cyan-300/60 px-3 text-sm font-semibold text-cyan-100">
        {grouped ? "Volver al orden original" : "Agrupar términos semejantes"}
      </button>
      <Slider id={`${id}-x`} label="Valor de x para sustituir" value={x} min={-3} max={5} onChange={setX} />
      <p className="text-sm font-semibold">
        <MathText text={a + c === 0 ? `Con x = ${x}: ${simple} = ${value}` : `Con x = ${x}: ${simple} = ${sub(a + c)} + ${b + d} = ${value}`} />
      </p>
      <p className="text-sm text-slate-300">
        Solo se suman entre sí los términos semejantes: las x con las x y los números con los números. {c < 0 && a > 0 ? "Cada −x rosa anula una x cian. " : ""}
        Sustituir en la expresión original o en la simplificada da lo mismo: comprueba que {original} con x = {x} también vale {value}.
      </p>
      <Challenge goals={[
        { text: "Consigue una expresión que se simplifique a 2x + 9.", met: a + c === 2 && b + d === 9 },
        { text: "Haz que los términos en x se anulen por completo.", met: a + c === 0 && (a !== 0 || c !== 0) },
        { text: "Elige x para que la expresión simplificada valga 0.", met: value === 0, hint: "Prueba con valores negativos de x." },
      ]} />
    </>
  );
}
