"use client";

import { useState } from "react";
import { Handle, num, Slider, snap, Toggle } from "./GraphVisuals";

const rad = (deg: number) => (deg * Math.PI) / 180;
/** viewBox ajustado a los puntos con margen, para figuras que cambian de forma. */
function fit(points: [number, number][], margin = 24) {
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const x = Math.min(...xs) - margin,
    y = Math.min(...ys) - margin;
  return `${x} ${y} ${Math.max(...xs) - x + margin} ${Math.max(...ys) - y + margin}`;
}
const poly = (points: [number, number][]) => points.map((p) => p.join(",")).join(" ");

export function AnglesVisual({ id }: { id: string }) {
  const [a, setA] = useState(60);
  const [ta, setTa] = useState(50);
  const [tb, setTb] = useState(70);
  const tc = 180 - ta - tb;
  const cx = 160,
    cy = 90,
    L = 85;
  const at = (deg: number, r: number) => [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))];
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = at(from, r),
      [x2, y2] = at(to, r);
    return `M${x1},${y1} A${r},${r} 0 0 0 ${x2},${y2}`;
  };
  const label = (mid: number, text: string, cls: string) => {
    const [x, y] = at(mid, 42);
    return <text x={x} y={y + 4} textAnchor="middle" className={`${cls} text-[11px] font-bold`}>{text}</text>;
  };
  // Triángulo con base fija: el vértice superior sale de cortar los dos lados.
  const B0: [number, number] = [0, 0],
    B1: [number, number] = [200, 0];
  const tA = Math.tan(rad(ta)),
    tB = Math.tan(rad(tb));
  const apexX = (B1[0] * tB) / (tA + tB),
    apex: [number, number] = [apexX, -apexX * tA];
  return (
    <>
      <Slider id={`${id}-a`} label="Ángulo entre las rectas" value={a} min={15} max={165} onChange={setA} />
      <svg role="img" viewBox="0 0 320 180" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Dos rectas que se cortan: ${a}° y su opuesto por el vértice ${a}°; los vecinos miden ${180 - a}°.`}>
        <line x1={cx - L} y1={cy} x2={cx + L} y2={cy} className="stroke-slate-300" strokeWidth={2} />
        <line x1={at(a + 180, L)[0]} y1={at(a + 180, L)[1]} x2={at(a, L)[0]} y2={at(a, L)[1]} className="stroke-slate-300" strokeWidth={2} />
        <path d={arc(0, a, 30)} className="fill-none stroke-cyan-300" strokeWidth={3} />
        <path d={arc(180, 180 + a, 30)} className="fill-none stroke-cyan-300" strokeWidth={3} />
        <path d={arc(a, 180, 24)} className="fill-none stroke-amber-300" strokeWidth={3} />
        <path d={arc(180 + a, 360, 24)} className="fill-none stroke-amber-300" strokeWidth={3} />
        <Handle x={at(a, L)[0]} y={at(a, L)[1]}
          onDrag={(px, py) => {
            const deg = (Math.atan2(cy - py, px - cx) * 180) / Math.PI;
            setA(snap(deg < 0 ? deg + 180 : deg, 15, 165));
          }} />
        {label(a / 2, `${a}°`, "fill-cyan-200")}
        {label(180 + a / 2, `${a}°`, "fill-cyan-200")}
        {label((a + 180) / 2, `${180 - a}°`, "fill-amber-200")}
        {label((a + 540) / 2, `${180 - a}°`, "fill-amber-200")}
      </svg>
      <p className="text-sm">
        Arrastra el extremo de la recta. Opuestos por el vértice: iguales ({a}° y {a}°). Vecinos: suplementarios, {a}° + {180 - a}° = 180°.
        {a < 90 && ` El complementario de ${a}° sería ${90 - a}°.`}
      </p>
      <Slider id={`${id}-ta`} label="Ángulo A del triángulo" value={ta} min={20} max={130} onChange={(v) => { setTa(v); setTb((b) => Math.min(b, 160 - v)); }} />
      <Slider id={`${id}-tb`} label="Ángulo B del triángulo" value={tb} min={20} max={160 - ta} onChange={setTb} />
      <svg role="img" viewBox={fit([B0, B1, apex])} className="max-h-56 w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Triángulo con ángulos ${ta}°, ${tb}° y ${tc}°, que suman 180°.`}>
        <polygon points={poly([B0, B1, apex])} className="fill-cyan-300/15 stroke-cyan-300" strokeWidth={2.5} />
        <text x={B0[0] + 14} y={B0[1] - 6} className="fill-cyan-200 text-[13px] font-bold">{ta}°</text>
        <text x={B1[0] - 14} y={B1[1] - 6} textAnchor="end" className="fill-cyan-200 text-[13px] font-bold">{tb}°</text>
        <text x={apex[0]} y={apex[1] + 30} textAnchor="middle" className="fill-amber-200 text-[13px] font-bold">{tc}°</text>
      </svg>
      <p className="text-sm">
        {ta}° + {tb}° + <strong>{tc}°</strong> = 180°. Por más que deformes el triángulo, el tercer ángulo compensa a los otros dos.
      </p>
    </>
  );
}

export function PythagorasVisual({ id }: { id: string }) {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const c = Math.hypot(a, b),
    u = 11;
  // Coordenadas de pantalla (y hacia abajo): ángulo recto en el origen.
  const O: [number, number] = [0, 0],
    A: [number, number] = [a * u, 0],
    B: [number, number] = [0, -b * u];
  const sqA: [number, number][] = [O, A, [a * u, a * u], [0, a * u]],
    sqB: [number, number][] = [O, B, [-b * u, -b * u], [-b * u, 0]],
    sqC: [number, number][] = [A, B, [B[0] + b * u, B[1] - a * u], [A[0] + b * u, A[1] - a * u]];
  const center = (pts: [number, number][]) =>
    [pts.reduce((s, p) => s + p[0], 0) / 4, pts.reduce((s, p) => s + p[1], 0) / 4 + 4] as const;
  return (
    <>
      <Slider id={`${id}-a`} label="Cateto a" value={a} min={1} max={8} onChange={setA} />
      <Slider id={`${id}-b`} label="Cateto b" value={b} min={1} max={8} onChange={setB} />
      {/* Marco fijo, calculado para los catetos máximos (8 y 8): así el punto
          arrastrado no se desplaza bajo el puntero al cambiar la figura. */}
      <svg role="img" viewBox={`${-8 * u - 6} ${-16 * u - 6} ${24 * u + 12} ${24 * u + 12}`} className="max-h-80 w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Triángulo rectángulo de catetos ${a} y ${b}. Los cuadrados de los catetos, ${a * a} y ${b * b}, suman ${a * a + b * b}, el cuadrado de la hipotenusa.`}>
        <polygon points={poly(sqA)} className="fill-cyan-300/25 stroke-cyan-300" strokeWidth={1.5} />
        <polygon points={poly(sqB)} className="fill-amber-300/25 stroke-amber-300" strokeWidth={1.5} />
        <polygon points={poly(sqC)} className="fill-rose-300/20 stroke-rose-300" strokeWidth={1.5} />
        <polygon points={poly([O, A, B])} className="fill-slate-200 stroke-slate-200" />
        <Handle x={A[0]} y={A[1]} className="fill-cyan-300" r={5} onDrag={(px) => setA(snap(px / u, 1, 8))} />
        <Handle x={B[0]} y={B[1]} className="fill-amber-300" r={5} onDrag={(_, py) => setB(snap(-py / u, 1, 8))} />
        <text x={center(sqA)[0]} y={center(sqA)[1]} textAnchor="middle" className="fill-cyan-100 text-[12px] font-bold">{a * a}</text>
        <text x={center(sqB)[0]} y={center(sqB)[1]} textAnchor="middle" className="fill-amber-100 text-[12px] font-bold">{b * b}</text>
        <text x={center(sqC)[0]} y={center(sqC)[1]} textAnchor="middle" className="fill-rose-100 text-[12px] font-bold">{a * a + b * b}</text>
      </svg>
      <p className="font-mono text-sm">
        a² + b² = c² → {a * a} + {b * b} = {a * a + b * b} → c = √{a * a + b * b} = <strong>{num(c)}</strong>
      </p>
      <p className="text-sm text-slate-300">
        Arrastra los extremos de los catetos. El área del cuadrado rosa (sobre la hipotenusa) siempre es la suma de las otras dos. Prueba 3 y 4, o 6 y 8: la hipotenusa sale entera.
      </p>
    </>
  );
}

export function CircleVisual({ id }: { id: string }) {
  const [r, setR] = useState(3);
  const u = 9.4,
    C = 2 * Math.PI * r;
  return (
    <>
      <Slider id={`${id}-r`} label="Radio" value={r} min={1} max={5} onChange={setR} />
      <svg role="img" viewBox="0 0 320 170" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Círculo de radio ${r}. Su borde desenrollado mide ${num(C)}: algo más de tres diámetros de ${2 * r}.`}>
        <circle cx={60} cy={60} r={r * u} className="fill-cyan-300/15 stroke-cyan-300" strokeWidth={2.5} />
        <rect x={60} y={60 - r * u} width={r * u} height={r * u} className="fill-amber-300/25 stroke-amber-300" />
        <line x1={60} y1={60} x2={60 + r * u} y2={60} className="stroke-rose-300" strokeWidth={2} />
        <text x={60 + (r * u) / 2} y={74} textAnchor="middle" className="fill-rose-200 text-[11px]">r</text>
        <Handle x={60 + r * u} y={60} className="fill-rose-300" r={5} onDrag={(px) => setR(snap((px - 60) / u, 1, 5))} />
        <line x1={10} x2={10 + C * u} y1={140} y2={140} className="stroke-cyan-300" strokeWidth={4} />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={10 + i * 2 * r * u} x2={10 + i * 2 * r * u} y1={130} y2={150} className="stroke-slate-300" />
        ))}
        <text x={10} y={124} className="fill-slate-300 text-[11px]">borde desenrollado: 3 diámetros y un poco más</text>
      </svg>
      <p className="font-mono text-sm">
        Longitud = 2 · π · {r} ≈ <strong>{num(C)}</strong> · Área = π · {r}² ≈ <strong>{num(Math.PI * r * r)}</strong>
      </p>
      <p className="text-sm text-slate-300">
        Arrastra el extremo del radio. El borde mide unos 3,14 diámetros. El área cabe en unos 3,14 cuadrados ámbar de lado r: por eso es π · r².
      </p>
    </>
  );
}

export function SimilarityVisual({ id }: { id: string }) {
  const [k, setK] = useState(2);
  const u = 18,
    O: [number, number] = [20, 190];
  const tri = (s: number): [number, number][] => [O, [O[0] + 4 * s * u, O[1]], [O[0], O[1] - 3 * s * u]];
  return (
    <>
      <Slider id={`${id}-k`} label="Razón de semejanza k" value={k} min={1} max={3} step={0.5} onChange={setK} />
      <svg role="img" viewBox="0 0 260 200" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Triángulo de lados 3, 4 y 5 ampliado por ${num(k)}: lados ${num(3 * k)}, ${num(4 * k)} y ${num(5 * k)}; su área pasa de 6 a ${num(6 * k * k)}.`}>
        <polygon points={poly(tri(k))} className="fill-cyan-300/15 stroke-cyan-300" strokeWidth={2} />
        <polygon points={poly(tri(1))} className="fill-amber-300/40 stroke-amber-300" strokeWidth={2} />
        <Handle x={tri(k)[1][0]} y={tri(k)[1][1]} className="fill-cyan-300"
          onDrag={(px) => setK(snap((px - O[0]) / (4 * u), 1, 3, 0.5))} />
      </svg>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Medidas del original y de la copia</caption>
        <thead><tr><th className="p-2">Medida</th><th className="p-2">Original</th><th className="p-2">Copia × {num(k)}</th><th className="p-2">Factor</th></tr></thead>
        <tbody>
          <tr className="border-t border-slate-700"><th scope="row" className="p-2">Lados</th><td className="p-2">3, 4, 5</td><td className="p-2">{num(3 * k)}, {num(4 * k)}, {num(5 * k)}</td><td className="p-2">× {num(k)}</td></tr>
          <tr className="border-t border-slate-700"><th scope="row" className="p-2">Perímetro</th><td className="p-2">12</td><td className="p-2">{num(12 * k)}</td><td className="p-2">× {num(k)}</td></tr>
          <tr className="border-t border-slate-700"><th scope="row" className="p-2">Área</th><td className="p-2">6</td><td className="p-2">{num(6 * k * k)}</td><td className="p-2 font-bold text-cyan-200">× {num(k * k)}</td></tr>
        </tbody>
      </table>
      <p className="text-sm text-slate-300">
        Arrastra el vértice de la copia. Los ángulos no cambian. Las longitudes se multiplican por k, pero el área por k²: con k = 2 caben 4 triángulos ámbar en la copia.
      </p>
    </>
  );
}

export function VolumeVisual({ id }: { id: string }) {
  const [l, setL] = useState(4);
  const [w, setW] = useState(2);
  const [h, setH] = useState(3);
  const u = 22,
    d = 11; // desplazamiento oblicuo por unidad de profundidad
  const x0 = 12,
    y0 = 180;
  const P = (x: number, y: number, z: number): [number, number] => [x0 + x * u + z * d, y0 - y * u - z * d];
  const lines: [[number, number], [number, number]][] = [];
  for (let i = 0; i <= l; i++) lines.push([P(i, 0, 0), P(i, h, 0)], [P(i, h, 0), P(i, h, w)]);
  for (let j = 0; j <= h; j++) lines.push([P(0, j, 0), P(l, j, 0)], [P(l, j, 0), P(l, j, w)]);
  for (let k = 0; k <= w; k++) lines.push([P(0, h, k), P(l, h, k)], [P(l, 0, k), P(l, h, k)]);
  return (
    <>
      <Slider id={`${id}-l`} label="Largo" value={l} min={1} max={6} onChange={setL} />
      <Slider id={`${id}-w`} label="Ancho" value={w} min={1} max={4} onChange={setW} />
      <Slider id={`${id}-h`} label="Altura (capas)" value={h} min={1} max={5} onChange={setH} />
      <svg role="img" viewBox="0 0 200 192" className="max-h-64 w-full max-w-sm rounded-xl bg-slate-950"
        aria-label={`Prisma de ${l} por ${w} por ${h} cubos: ${h} capas de ${l * w} cubos, ${l * w * h} en total.`}>
        <polygon points={poly([P(0, 0, 0), P(l, 0, 0), P(l, h, 0), P(0, h, 0)])} className="fill-cyan-300/20" />
        <polygon points={poly([P(0, h, 0), P(l, h, 0), P(l, h, w), P(0, h, w)])} className="fill-amber-300/30" />
        <polygon points={poly([P(l, 0, 0), P(l, 0, w), P(l, h, w), P(l, h, 0)])} className="fill-cyan-300/10" />
        {lines.map(([a, b], i) => (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="stroke-slate-300" strokeWidth={1} />
        ))}
      </svg>
      <p className="font-mono text-sm">
        Base = {l} × {w} = {l * w} cubos por capa · Volumen = {l * w} × {h} = <strong>{l * w * h} cubos</strong>
      </p>
      <p className="text-sm text-slate-300">
        La cara ámbar es la base. El volumen cuenta cuántas capas iguales a la base se apilan: área de la base × altura. Con un cilindro la idea es la misma: π · r² × altura.
      </p>
    </>
  );
}

export function TreeVisual({ id }: { id: string }) {
  const [r, setR] = useState(3);
  const [b, setB] = useState(2);
  const [mode, setMode] = useState("con");
  const n = r + b,
    back = mode === "con";
  const second = (first: "R" | "B") => {
    const m = back ? n : n - 1,
      rr = back || first === "B" ? r : r - 1,
      bb = back || first === "R" ? b : b - 1;
    return { R: [rr, m], B: [bb, m] } as const;
  };
  const leaves = (["R", "B"] as const).flatMap((f) =>
    (["R", "B"] as const).map((s) => {
      const [p1, q1] = f === "R" ? [r, n] : [b, n],
        [p2, q2] = second(f)[s];
      return { path: `${f}${s}`, p: p1 * p2, q: q1 * q2 };
    }),
  );
  const color = (c: string) => (c === "R" ? "fill-rose-300" : "fill-sky-300");
  const node = (x: number, y: number, c: string) => <circle cx={x} cy={y} r={9} className={color(c)} />;
  const edge = (x1: number, y1: number, x2: number, y2: number, text: string) => (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-slate-500" strokeWidth={1.5} />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} textAnchor="middle" className="fill-slate-200 text-[11px]">{text}</text>
    </>
  );
  const firstY = { R: 55, B: 155 },
    leafY = [25, 85, 125, 185];
  return (
    <>
      <Slider id={`${id}-r`} label="Fichas rojas" value={r} min={1} max={5} onChange={setR} />
      <Slider id={`${id}-b`} label="Fichas azules" value={b} min={1} max={5} onChange={setB} />
      <Toggle label="Segunda extracción" value={mode} onChange={setMode}
        options={[["con", "Con reemplazo"], ["sin", "Sin reemplazo"]]} />
      <svg role="img" viewBox="0 0 330 210" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Diagrama de árbol de dos extracciones ${back ? "con" : "sin"} reemplazo de una bolsa con ${r} rojas y ${b} azules. ${leaves.map((l) => `${l.path}: ${l.p}/${l.q}`).join(", ")}.`}>
        {(["R", "B"] as const).map((f) => (
          <g key={f}>
            {edge(20, 105, 110, firstY[f], `${f === "R" ? r : b}/${n}`)}
            {(["R", "B"] as const).map((s, j) => {
              const [p, q] = second(f)[s],
                y = leafY[(f === "R" ? 0 : 2) + j];
              return <g key={s}>{edge(110, firstY[f], 210, y, `${p}/${q}`)}{node(210, y, s)}</g>;
            })}
            {node(110, firstY[f], f)}
          </g>
        ))}
        <circle cx={20} cy={105} r={6} className="fill-slate-300" />
        {leaves.map((l, i) => (
          <text key={l.path} x={228} y={leafY[i] + 4} className="fill-slate-100 text-[11px] font-mono">
            {l.path}: {l.p}/{l.q}
          </text>
        ))}
      </svg>
      <p className="text-sm">
        Se multiplica a lo largo de cada rama y se suman las ramas que cumplen el suceso: P(una de cada color) ={" "}
        {leaves[1].p}/{leaves[1].q} + {leaves[2].p}/{leaves[2].q} = <strong>{num((leaves[1].p + leaves[2].p) / leaves[1].q)}</strong>.
        Las cuatro ramas suman 1.
      </p>
      <p className="text-sm text-slate-300">
        {back
          ? "Con reemplazo la segunda extracción no depende de la primera: las fracciones se repiten."
          : "Sin reemplazo la bolsa tiene una ficha menos y la segunda probabilidad depende de lo que salió primero."}
      </p>
    </>
  );
}

/** Escribe a × 10ⁿ en forma decimal sin errores de coma flotante. */
export function expandScientific(a: number, n: number) {
  const digits = String(Math.round(a * 10)),
    point = n + 1;
  let text =
    point >= digits.length
      ? digits + "0".repeat(point - digits.length)
      : point <= 0
        ? `0,${"0".repeat(-point)}${digits}`
        : `${digits.slice(0, point)},${digits.slice(point)}`;
  if (text.includes(",")) text = text.replace(/0+$/, "").replace(/,$/, "");
  const [int, dec] = text.split(",");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec === undefined ? grouped : `${grouped},${dec}`;
}

export function PowersVisual({ id }: { id: string }) {
  const [a, setA] = useState(3.8);
  const [n, setN] = useState(5);
  const sup = (k: number) => String(k).replace("-", "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
  const lo = -6,
    hi = 9;
  const pos = (e: number) => 15 + ((e - lo) / (hi - lo)) * 290;
  const refs = [
    { e: -4.3, text: "cabello" },
    { e: 0.2, text: "persona" },
    { e: 8.6, text: "Tierra–Luna" },
  ];
  return (
    <>
      <Slider id={`${id}-a`} label="Número entre 1 y 10" value={a} min={1} max={9.9} step={0.1} onChange={setA} />
      <Slider id={`${id}-n`} label="Exponente n" value={n} min={lo} max={8} onChange={setN} />
      <p className="font-mono text-lg">
        {num(a)} × 10{sup(n)} = <strong>{expandScientific(a, n)}</strong>
      </p>
      <svg role="img" viewBox="0 0 320 72" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Escala de potencias de 10 en metros: ${num(a)} por 10 a la ${n} está entre 10 a la ${n} y 10 a la ${n + 1}.`}>
        <line x1={15} x2={305} y1={36} y2={36} className="stroke-slate-500" strokeWidth={1.5} />
        {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((e) => (
          <g key={e}>
            <line x1={pos(e)} x2={pos(e)} y1={31} y2={41} className="stroke-slate-500" />
            {e % 3 === 0 && <text x={pos(e)} y={58} textAnchor={e === hi ? "end" : e === lo ? "start" : "middle"} className="fill-slate-400 text-[11px]">10{sup(e)}</text>}
          </g>
        ))}
        {refs.map((r) => (
          <text key={r.text} x={Math.min(305, pos(r.e))} y={18} textAnchor={r.e > 7 ? "end" : "middle"} className="fill-slate-300 text-[11px]">{r.text}</text>
        ))}
        <Handle x={pos(n + Math.log10(a))} y={36} className="fill-cyan-300"
          onDrag={(px) => {
            const e = Math.min(8.99, Math.max(lo, lo + ((px - 15) / 290) * (hi - lo))),
              whole = Math.floor(e);
            setN(whole);
            setA(snap(10 ** (e - whole), 1, 9.9, 0.1));
          }} />
      </svg>
      <p className="text-sm text-slate-300">
        Arrastra el punto por la escala. Cada paso de la escala multiplica por 10. Sube n en 1 y la coma se desplaza un lugar a la derecha; bájalo y se desplaza a la izquierda. Con n negativo el número es menor que 1.
      </p>
    </>
  );
}

export function DecimalGridVisual({ id }: { id: string }) {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  // Arrastrar sobre la cuadrícula elige columnas (primer factor) y filas (segundo).
  const paint = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setA(snap(Math.ceil(((e.clientX - box.left) / box.width) * 10), 1, 9));
    setB(snap(Math.ceil(((e.clientY - box.top) / box.height) * 10), 1, 9));
  };
  return (
    <>
      <Slider id={`${id}-a`} label="Primer factor (décimas)" value={a} min={1} max={9} onChange={setA} />
      <Slider id={`${id}-b`} label="Segundo factor (décimas)" value={b} min={1} max={9} onChange={setB} />
      <div role="img" aria-label={`Cuadrado de 10 por 10: ${a} columnas por ${b} filas se cruzan en ${a * b} centésimas.`}
        className="grid w-fit cursor-crosshair touch-none grid-cols-10 gap-px rounded bg-slate-600 p-px"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); paint(e); }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && paint(e)}>
        {Array.from({ length: 100 }, (_, i) => {
          const col = i % 10 < a,
            row = Math.floor(i / 10) < b;
          return (
            <span key={i} aria-hidden="true"
              className={`size-5 ${col && row ? "bg-cyan-300" : col ? "bg-cyan-900" : row ? "bg-amber-900" : "bg-slate-900"}`} />
          );
        })}
      </div>
      <p className="font-mono text-lg">
        0,{a} × 0,{b} = {a * b}/100 = <strong>{num((a * b) / 100)}</strong>
      </p>
      <p className="text-sm text-slate-300">
        Arrastra sobre la cuadrícula para elegir columnas y filas. Todo el cuadrado es 1. Tomar 0,{a} de 0,{b} deja {a * b} de las 100 casillas: cada décima por décima es una centésima, por eso el producto tiene dos decimales y es menor que ambos factores.
      </p>
    </>
  );
}
