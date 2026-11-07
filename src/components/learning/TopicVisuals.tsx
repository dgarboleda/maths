"use client";

import { useState } from "react";
import { MathText } from "@/components/MathText";
import { Challenge, num, Slider, Toggle } from "./GraphVisuals";

/**
 * Modelos de las clases de divisibilidad y primos (criba), números romanos,
 * tablas y gráficos de frecuencias, superficie de cuerpos, sistema métrico y
 * factorización (trinomios). Se cargan aparte: solo los usan esas clases.
 */

const smallestFactor = (n: number) => {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
  return n;
};
const isPrime = (n: number) => n > 1 && smallestFactor(n) === n;
function factorize(n: number): number[] {
  const out: number[] = [];
  let rest = n;
  while (rest > 1) {
    const p = smallestFactor(rest);
    out.push(p);
    rest /= p;
  }
  return out;
}

const SIEVE_PRIMES = [2, 3, 5, 7];

/** Criba de Eratóstenes del 1 al 100, tachando los múltiplos de 2, 3, 5 y 7. */
export function SieveVisual({ id }: { id: string }) {
  const [used, setUsed] = useState(1);
  const [pick, setPick] = useState(37);
  const active = SIEVE_PRIMES.slice(0, used);
  const crossed = (n: number) => n > 1 && active.some((p) => n !== p && n % p === 0);
  const left = Array.from({ length: 99 }, (_, i) => i + 2).filter((n) => !crossed(n)).length;
  const factors = factorize(pick);
  return (
    <>
      <Slider id={`${id}-used`} label="Primos cuyos múltiplos se tachan (2, 3, 5, 7)" value={used} min={0} max={4} onChange={setUsed} />
      <div role="img" aria-label={`Números del 1 al 100. ${used === 0 ? "Todavía no se tachó nada." : `Tachados los múltiplos de ${active.join(", ")}.`} Quedan ${left} números sin tachar mayores que 1.`}
        className="grid grid-cols-10 gap-px rounded-lg bg-slate-950 p-1 text-center text-[11px] tabular-nums sm:text-xs">
        {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
          const isActive = active.includes(n);
          return (
            <span key={n} aria-hidden="true"
              className={`rounded py-1 ${n === pick ? "ring-2 ring-amber-300" : ""} ${n === 1 ? "text-slate-600" : isActive ? "bg-cyan-300 font-bold text-slate-950" : crossed(n) ? "text-slate-600 line-through" : "bg-cyan-900/60 text-cyan-50"}`}>
              {n}
            </span>
          );
        })}
      </div>
      <p className="text-sm text-slate-300">
        {used === 4
          ? `Con los múltiplos de 2, 3, 5 y 7 tachados quedan ${left} números: son los primos menores que 100. Basta llegar al 7 porque 11 × 11 = 121 ya pasa de 100.`
          : `Quedan ${left} números sin tachar. Sigue con el siguiente primo para descartar más compuestos.`}
      </p>
      <Slider id={`${id}-pick`} label="Número a examinar" value={pick} min={2} max={100} onChange={setPick} />
      <p className="text-lg font-bold">
        <MathText text={isPrime(pick) ? `${pick} es primo: solo se divide entre 1 y ${pick}` : `${pick} = ${factors.join(" × ")} (compuesto)`} />
      </p>
      <Challenge goals={[
        { text: "Tacha los múltiplos de 2, 3, 5 y 7. ¿Cuántos primos menores que 100 quedan?", met: used === 4 },
        { text: "Encuentra un número impar mayor que 50 que no sea primo.", met: pick > 50 && pick % 2 === 1 && !isPrime(pick), hint: "Prueba con múltiplos de 3 o de 7." },
        { text: "Busca dos primos mayores que 40 que se diferencien en 2.", met: pick > 40 && isPrime(pick) && isPrime(pick + 2), hint: "Elige el menor de los dos." },
      ]} />
    </>
  );
}

const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
function toRoman(value: number): string {
  let rest = value;
  let out = "";
  for (const [v, s] of ROMAN)
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  return out;
}

/** Un número por órdenes y su escritura romana. */
export function RomanVisual({ id }: { id: string }) {
  const [value, setValue] = useState(1984);
  const parts = [
    { name: "millares", v: Math.floor(value / 1000) * 1000 },
    { name: "centenas", v: Math.floor((value % 1000) / 100) * 100 },
    { name: "decenas", v: Math.floor((value % 100) / 10) * 10 },
    { name: "unidades", v: value % 10 },
  ].filter((p) => p.v > 0);
  const roman = toRoman(value);
  return (
    <>
      <Slider id={`${id}-value`} label="Número" value={value} min={1} max={3999} onChange={setValue} />
      <div role="img" aria-label={`${value} en números romanos es ${roman}.`} className="overflow-x-auto">
        <table className="w-full text-center text-sm tabular-nums">
          <thead>
            <tr className="text-slate-300">
              {parts.map((p) => <th key={p.name} scope="col" className="px-2 py-1 font-semibold">{p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>{parts.map((p) => <td key={p.name} className="px-2 py-1 text-lg">{num(p.v)}</td>)}</tr>
            <tr>{parts.map((p) => <td key={p.name} className="px-2 py-1 text-lg font-bold text-cyan-200">{toRoman(p.v)}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="text-2xl font-bold tracking-wider text-white">{roman}</p>
      <p className="text-sm text-slate-300">
        Nuestro sistema usa {String(value).length} {String(value).length === 1 ? "cifra" : "cifras"} y el romano {roman.length} {roman.length === 1 ? "símbolo" : "símbolos"}: en el romano cada símbolo tiene un valor fijo y hay que sumarlos.
      </p>
      <Challenge goals={[
        { text: "Escribe el año 1999 en números romanos.", met: value === 1999 },
        { text: "Encuentra el número menor que 100 que necesita más símbolos romanos.", met: value === 88, hint: "Busca un número con muchas repeticiones y sin restas." },
        { text: "Consigue un número que use las restas CM, XC y IX a la vez.", met: roman.includes("CM") && roman.includes("XC") && roman.includes("IX") },
      ]} />
    </>
  );
}

const CATEGORIES = ["Fútbol", "Vóley", "Básquet", "Otros"];
const SECTOR_FILLS = ["fill-cyan-400", "fill-amber-300", "fill-fuchsia-400", "fill-emerald-400"];
const BAR_FILLS = ["bg-cyan-400", "bg-amber-300", "bg-fuchsia-400", "bg-emerald-400"];

/** Tabla de frecuencias editable con su gráfico de barras o circular. */
export function FrequencyVisual({ id }: { id: string }) {
  const [counts, setCounts] = useState([8, 6, 4, 2]);
  const [chart, setChart] = useState("barras");
  const total = counts.reduce((a, b) => a + b, 0);
  const rel = counts.map((f) => (total ? f / total : 0));
  const max = Math.max(1, ...counts);
  let angle = 0;
  const sectors = counts.map((f, i) => {
    const start = angle;
    angle += total ? (f / total) * 360 : 0;
    return { i, start, end: angle };
  });
  const point = (deg: number) => [100 + 80 * Math.sin((deg * Math.PI) / 180), 100 - 80 * Math.cos((deg * Math.PI) / 180)];
  return (
    <>
      {CATEGORIES.map((name, i) => (
        <Slider key={name} id={`${id}-c${i}`} label={`${name} (frecuencia absoluta)`} value={counts[i]} min={0} max={20}
          onChange={(v) => setCounts((c) => c.map((x, k) => (k === i ? v : x)))} />
      ))}
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Tabla de frecuencias</caption>
          <thead>
            <tr className="text-left text-slate-300">
              <th scope="col" className="py-1 pr-2">Deporte</th><th scope="col" className="pr-2">fᵢ</th><th scope="col" className="pr-2">hᵢ</th><th scope="col" className="pr-2">%</th><th scope="col">ángulo</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((name, i) => (
              <tr key={name}>
                <th scope="row" className="py-1 pr-2 text-left font-semibold">{name}</th>
                <td className="pr-2">{counts[i]}</td>
                <td className="pr-2">{num(Math.round(rel[i] * 100) / 100)}</td>
                <td className="pr-2">{num(Math.round(rel[i] * 1000) / 10)}</td>
                <td>{num(Math.round(rel[i] * 3600) / 10)}°</td>
              </tr>
            ))}
            <tr className="border-t border-slate-600 font-bold">
              <th scope="row" className="py-1 pr-2 text-left">Total</th><td className="pr-2">{total}</td><td className="pr-2">{total ? 1 : 0}</td><td className="pr-2">{total ? 100 : 0}</td><td>{total ? 360 : 0}°</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Toggle label="Tipo de gráfico" value={chart} onChange={setChart} options={[["barras", "Barras"], ["circular", "Circular"]]} />
      {chart === "barras" ? (
        <div role="img" aria-label={`Gráfico de barras: ${CATEGORIES.map((c, i) => `${c} ${counts[i]}`).join(", ")}.`}
          className="flex h-40 items-end gap-3 rounded-lg bg-slate-950 p-3">
          {counts.map((f, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch">
              <span className="text-xs tabular-nums text-slate-200">{f}</span>
              <span aria-hidden="true" className={`w-full rounded-t ${BAR_FILLS[i]}`} style={{ height: `${(f / max) * 100}%` }} />
              <span className="text-[11px] text-slate-300">{CATEGORIES[i]}</span>
            </div>
          ))}
        </div>
      ) : (
        <svg role="img" viewBox="0 0 200 200" className="mx-auto w-full max-w-56"
          aria-label={`Gráfico circular: ${CATEGORIES.map((c, i) => `${c} ${num(Math.round(rel[i] * 3600) / 10)}°`).join(", ")}.`}>
          {total === 0 ? <circle cx={100} cy={100} r={80} className="fill-slate-800" /> : sectors.map(({ i, start, end }) => {
            if (end - start >= 359.999) return <circle key={i} cx={100} cy={100} r={80} className={SECTOR_FILLS[i]} />;
            if (end - start <= 0) return null;
            const [x1, y1] = point(start);
            const [x2, y2] = point(end);
            return <path key={i} d={`M100,100 L${x1},${y1} A80,80 0 ${end - start > 180 ? 1 : 0} 1 ${x2},${y2} Z`} className={`${SECTOR_FILLS[i]} stroke-slate-950`} strokeWidth={1.5} />;
          })}
        </svg>
      )}
      <p className="text-sm text-slate-300">
        <MathText text={total ? `hᵢ = fᵢ ÷ ${total}; el ángulo de cada sector es hᵢ × 360°.` : "Sin datos no hay frecuencias relativas."} />
      </p>
      <Challenge goals={[
        { text: "Haz que el fútbol ocupe exactamente un cuarto del círculo (90°).", met: total > 0 && counts[0] * 4 === total },
        { text: "Con 20 datos en total, consigue que el vóley sea el 40 %.", met: total === 20 && counts[1] === 8 },
        { text: "Consigue que dos deportes tengan la misma frecuencia relativa sin que la tabla cambie de total.", met: total === 20 && new Set(counts).size < counts.length, hint: "El total inicial es 20." },
      ]} />
    </>
  );
}

const PI = 3.14;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Desarrollo plano de una caja o de un cilindro, con su superficie y su volumen. */
export function NetVisual({ id }: { id: string }) {
  const [shape, setShape] = useState("caja");
  const [a, setA] = useState(6);
  const [b, setB] = useState(2);
  const [h, setH] = useState(2);
  const box = shape === "caja";
  const lateral = box ? 2 * (a + b) * h : r2(2 * PI * a * h);
  const bases = box ? 2 * a * b : r2(2 * PI * a * a);
  const total = r2(lateral + bases);
  const volume = box ? a * b * h : r2(PI * a * a * h);
  const u = 12;
  return (
    <>
      <Toggle label="Cuerpo" value={shape} onChange={setShape} options={[["caja", "Caja (prisma)"], ["cilindro", "Cilindro"]]} />
      <Slider id={`${id}-a`} label={box ? "Largo de la base (cm)" : "Radio (cm)"} value={a} min={1} max={6} onChange={setA} />
      {box && <Slider id={`${id}-b`} label="Ancho de la base (cm)" value={b} min={1} max={6} onChange={setB} />}
      <Slider id={`${id}-h`} label="Altura (cm)" value={h} min={1} max={6} onChange={setH} />
      {box ? (
        <svg role="img" viewBox={`0 0 ${(2 * a + 2 * b) * u + 4} ${(h + 2 * b) * u + 4}`} className="mx-auto w-full max-w-md rounded-lg bg-slate-950"
          aria-label={`Desarrollo de una caja de ${a} por ${b} por ${h}: cuatro caras laterales en fila, de largo total ${2 * (a + b)} y alto ${h}, y dos bases de ${a} por ${b}.`}>
          {[a, b, a, b].map((w, i) => {
            const x = 2 + [0, a, a + b, 2 * a + b][i] * u;
            return <rect key={i} x={x} y={2 + b * u} width={w * u} height={h * u} className="fill-cyan-800 stroke-cyan-200" />;
          })}
          <rect x={2} y={2} width={a * u} height={b * u} className="fill-amber-500/70 stroke-amber-100" />
          <rect x={2} y={2 + (b + h) * u} width={a * u} height={b * u} className="fill-amber-500/70 stroke-amber-100" />
        </svg>
      ) : (
        <svg role="img" viewBox="0 0 320 200" className="mx-auto w-full max-w-md rounded-lg bg-slate-950"
          aria-label={`Desarrollo de un cilindro de radio ${a} y altura ${h}: un rectángulo de ${num(r2(2 * PI * a))} por ${h} y dos círculos de radio ${a}.`}>
          <rect x={10} y={100 - h * 8} width={Math.min(300, 2 * PI * a * 8)} height={h * 16} className="fill-cyan-800 stroke-cyan-200" />
          <circle cx={40} cy={100 - h * 8 - a * 5} r={a * 5} className="fill-amber-500/70 stroke-amber-100" />
          <circle cx={40} cy={100 + h * 8 + a * 5} r={a * 5} className="fill-amber-500/70 stroke-amber-100" />
        </svg>
      )}
      <p className="text-sm font-semibold tabular-nums">
        <MathText text={box
          ? `Área lateral = perímetro de la base × altura = ${2 * (a + b)} × ${h} = ${lateral} cm²`
          : `Área lateral ≈ 2 × 3,14 × ${a} × ${h} = ${num(lateral)} cm²`} /><br />
        <MathText text={box ? `Bases = 2 × ${a} × ${b} = ${bases} cm²` : `Bases ≈ 2 × 3,14 × ${a * a} = ${num(bases)} cm²`} /><br />
        Área total = <strong>{num(total)} cm²</strong> · Volumen = <strong>{num(volume)} cm³</strong>
      </p>
      <Challenge goals={[
        { text: "Construye una caja de 24 cm³ que use el menor cartón posible.", met: box && a * b * h === 24 && total === 52, hint: "Prueba cajas de 24 cm³ con medidas parecidas entre sí." },
        { text: "Haz un cubo cuya superficie sea 54 cm².", met: box && a === 3 && b === 3 && h === 3 },
        { text: "En el cilindro, consigue que el área lateral supere a la de las dos bases juntas.", met: !box && lateral > bases, hint: "Compara 2πrh con 2πr²: ¿qué tiene que pasar entre h y r?" },
      ]} />
    </>
  );
}

const MAGNITUDES = {
  longitud: { base: "m", units: ["km", "hm", "dam", "m", "dm", "cm", "mm"] },
  masa: { base: "g", units: ["kg", "hg", "dag", "g", "dg", "cg", "mg"] },
  capacidad: { base: "L", units: ["kL", "hL", "daL", "L", "dL", "cL", "mL"] },
} as const;
type Magnitude = keyof typeof MAGNITUDES;

/** Escalera de unidades: la misma medida escrita en las siete unidades. */
export function MetricVisual({ id }: { id: string }) {
  const [kind, setKind] = useState<Magnitude>("longitud");
  const [tenths, setTenths] = useState(12);
  const [from, setFrom] = useState(0);
  const units = MAGNITUDES[kind].units;
  const value = tenths / 10;
  const inUnit = (k: number) => Math.round(value * 10 ** (k - from) * 1e6) / 1e6;
  return (
    <>
      <Toggle label="Magnitud" value={kind} onChange={(k) => setKind(k as Magnitude)}
        options={[["longitud", "Longitud"], ["masa", "Masa"], ["capacidad", "Capacidad"]]} />
      <Slider id={`${id}-value`} label="Medida" value={value} min={0.1} max={10} step={0.1} onChange={(v) => setTenths(Math.round(v * 10))} />
      <Toggle label="Unidad de la medida" value={String(from)} onChange={(k) => setFrom(Number(k))}
        options={units.map((u, k) => [String(k), u] as [string, string])} />
      <div role="img" aria-label={`${num(value)} ${units[from]} en cada unidad: ${units.map((u, k) => `${num(inUnit(k))} ${u}`).join(", ")}.`} className="overflow-x-auto">
        <table className="w-full text-center text-sm tabular-nums">
          <thead>
            <tr>{units.map((u, k) => <th key={u} scope="col" className={`px-1 py-1 ${k === from ? "text-amber-200" : "text-slate-300"}`}>{u}</th>)}</tr>
          </thead>
          <tbody>
            <tr>{units.map((u, k) => <td key={u} className={`px-1 py-1 ${k === from ? "font-bold text-amber-200" : ""}`}>{num(inUnit(k))}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-300">
        Hacia la derecha la unidad es 10 veces menor y el número se multiplica por 10; hacia la izquierda se divide entre 10.
      </p>
      <Challenge goals={[
        { text: "Expresa 2,5 km y lee cuántos metros son.", met: kind === "longitud" && from === 0 && value === 2.5 },
        { text: "Escribe 0,3 L y lee cuántos mililitros son.", met: kind === "capacidad" && from === 3 && value === 0.3 },
        { text: "Escribe exactamente 1 kg usando una unidad menor que el kilogramo.", met: kind === "masa" && from > 0 && Math.abs(inUnit(0) - 1) < 1e-9, hint: "¿Cuántos hectogramos forman un kilogramo?" },
      ]} />
    </>
  );
}

/** Modelo de área de (x + p)(x + q) = x² + (p + q)x + pq. */
export function TrinomialVisual({ id }: { id: string }) {
  const [p, setP] = useState(2);
  const [q, setQ] = useState(3);
  const X = 120,
    u = 14;
  const W = X + q * u,
    H = X + p * u;
  const trinomial = `x² + ${p + q}x + ${p * q}`;
  return (
    <>
      <Slider id={`${id}-p`} label="Número p" value={p} min={1} max={8} onChange={setP} />
      <Slider id={`${id}-q`} label="Número q" value={q} min={1} max={8} onChange={setQ} />
      <svg role="img" viewBox={`0 0 ${W + 4} ${H + 4}`} className="mx-auto w-full max-w-xs rounded-lg bg-slate-950"
        aria-label={`Rectángulo de lados x + ${p} y x + ${q}: un cuadrado x², ${p + q} tiras de área x y ${p * q} cuadraditos de 1.`}>
        <rect x={2} y={2} width={X} height={X} className="fill-cyan-700 stroke-slate-950" />
        <text x={2 + X / 2} y={2 + X / 2} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[18px] font-bold">x²</text>
        {Array.from({ length: q }, (_, i) => <rect key={`q${i}`} x={2 + X + i * u} y={2} width={u} height={X} className="fill-amber-400 stroke-slate-950" />)}
        {Array.from({ length: p }, (_, i) => <rect key={`p${i}`} x={2} y={2 + X + i * u} width={X} height={u} className="fill-amber-400 stroke-slate-950" />)}
        {Array.from({ length: p * q }, (_, k) => (
          <rect key={`u${k}`} x={2 + X + (k % q) * u} y={2 + X + Math.floor(k / q) * u} width={u} height={u} className="fill-fuchsia-400 stroke-slate-950" />
        ))}
      </svg>
      <p className="text-lg font-bold">
        <MathText text={`(x + ${p})(x + ${q}) = ${trinomial}`} />
      </p>
      <p className="text-sm text-slate-300">
        <MathText text={`Las tiras ámbar suman ${p} + ${q} = ${p + q} veces x y los cuadraditos ${p} × ${q} = ${p * q}: para factorizar se buscan dos números con esa suma y ese producto.`} />
      </p>
      <Challenge goals={[
        { text: "Factoriza x² + 7x + 12 armando su rectángulo.", met: p + q === 7 && p * q === 12 },
        { text: "Arma un trinomio cuadrado perfecto con término independiente 25.", met: p === 5 && q === 5 },
        { text: "Consigue un trinomio cuyo término en x sea 8 y el independiente 15.", met: p + q === 8 && p * q === 15 },
      ]} />
    </>
  );
}
