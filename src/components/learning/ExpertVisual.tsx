import type { ReactNode } from "react";
import type { AdventureInput } from "@/lib/learning/core";

/**
 * Esquema del plan en el reto experto. Dibuja lo que el plan ES (las
 * cantidades escritas y sus consecuencias directas) con los datos de la
 * partida, pero no calcula la relación que el reto pide descubrir: no hay
 * pistas junto a los datos y el esquema tampoco las da.
 */
export function ExpertVisual({
  adventureId,
  params,
  inputs,
  values,
}: {
  adventureId: string;
  params: Readonly<Record<string, unknown>>;
  inputs: AdventureInput[];
  values: string[];
}) {
  const numbers = values.map((value) => (value.trim() === "" ? NaN : Number(value.trim().replace("−", "-"))));
  if (numbers.some((n, i) => !Number.isInteger(n) || n < inputs[i].min || n > inputs[i].max))
    return (
      <p className="rounded-2xl border border-fuchsia-300/30 bg-slate-950 p-4 text-sm text-slate-300">
        Escribe números enteros dentro de los límites para dibujar el esquema de tu plan.
      </p>
    );
  const schema = SCHEMAS[adventureId]?.(params as never, numbers);
  if (!schema) return null;
  return (
    <figure aria-label="Esquema del plan experto" className="space-y-3 rounded-2xl border border-fuchsia-300/30 bg-slate-950 p-4">
      <figcaption className="font-bold text-fuchsia-100">Esquema de tu plan</figcaption>
      {schema.diagram}
      <div className="space-y-1 border-t border-slate-700 pt-3 text-sm text-slate-200">
        {schema.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="text-xs text-slate-400">El esquema muestra tu plan; los objetivos se comprueban al probarlo.</p>
    </figure>
  );
}

type Schema = { lines: string[]; diagram?: ReactNode };
type Frac = [number, number];
const fmt = (x: number) => x.toLocaleString("es", { maximumFractionDigits: 2 });
const neg = (x: number) => (x < 0 ? `−${-x}` : `${x}`);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Barra apilada: segmentos sobre un total, con el exceso en rojo. */
function StackBar({ total, parts, label }: { total: number; parts: { name: string; value: number; color: string }[]; label: string }) {
  const used = parts.reduce((sum, part) => sum + part.value, 0), scale = 260 / Math.max(total, used);
  // Inicio de cada segmento: la suma de los anteriores.
  const starts = parts.map((_, i) => 10 + parts.slice(0, i).reduce((sum, part) => sum + part.value, 0) * scale);
  return (
    <svg viewBox="0 0 280 60" role="img" aria-label={label} className="h-16 w-full">
      <rect x="10" y="12" width={total * scale} height="22" fill="#1e293b" stroke="#64748b" />
      {parts.map((part, i) => (
        <rect key={part.name} x={starts[i]} y="12" width={part.value * scale} height="22" fill={part.color} />
      ))}
      {used > total && <rect x={10 + total * scale} y="10" width={(used - total) * scale} height="26" fill="#ef4444" opacity="0.8" />}
      <text x="10" y="52" fill="white" fontSize="11">0</text>
      <text x={10 + total * scale - 18} y="52" fill="white" fontSize="11">{total}</text>
    </svg>
  );
}

function Cells({ rows, label }: { rows: { name: string; count: number; color: string; size?: number }[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="space-y-2">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-slate-300">{row.name}</span>
          <span className="grid flex-1 grid-cols-12 gap-0.5">
            {Array.from({ length: row.size ?? 12 }, (_, i) => (
              <span key={i} className={`h-4 rounded-sm ${i < row.count ? row.color : "bg-slate-700"}`} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

const SCHEMAS: Record<string, (p: never, v: number[]) => Schema> = {
  apagon: (_p: { k: Frac }, [h, r, t]) => ({
    lines: [`Asignado: ${h} + ${r} + ${t} = ${h + r + t} de las 180 unidades originales`, `Sin asignar: ${180 - h - r - t} unidades`],
    diagram: (
      <StackBar
        total={180}
        label={`Barra de 180 unidades: hospital ${h}, radio ${r}, taller ${t}`}
        parts={[
          { name: "hospital", value: h, color: "#22d3ee" },
          { name: "radio", value: r, color: "#a78bfa" },
          { name: "taller", value: t, color: "#fbbf24" },
        ]}
      />
    ),
  }),

  "camara-fria": (p: { F: number; lo: number }, [h, c, v]) => {
    const x = (t: number) => 15 + (t + 40) * 5;
    return {
      lines: [`H: helados ${neg(h)} °C · C: congelador ${neg(c)} °C · N: nevera ${neg(v)} °C`, `Nevera − helados: ${neg(v)} − (${neg(h)}) = ${v - h} grados`, `Helados respecto al congelador: ${neg(h)} − (${neg(c)}) = ${neg(h - c)} grados`],
      diagram: (
        <svg viewBox="0 0 280 90" role="img" aria-label={`Recta de temperaturas: helados ${neg(h)}, congelador ${neg(c)} y nevera ${neg(v)} grados`} className="h-24 w-full">
          <rect x={x(p.lo)} y="30" width={x(8) - x(p.lo)} height="16" fill="#065f46" />
          <text x={x(p.lo) - 4} y="24" fill="#6ee7b7" fontSize="10">vacunas</text>
          <path d="M15 38 H265" stroke="#94a3b8" />
          <path d={`M${x(p.F)} 22 V54`} stroke="#f472b6" strokeDasharray="4 3" />
          <text x={x(p.F) - 30} y="16" fill="#f9a8d4" fontSize="10">límite {neg(p.F)} °C</text>
          {[
            { t: h, name: "H", color: "#a78bfa" },
            { t: c, name: "C", color: "#22d3ee" },
            { t: v, name: "N", color: "#fbbf24" },
          ].map((m, i) => (
            <g key={m.name}>
              <circle cx={x(m.t)} cy="38" r="5" fill={m.color} />
              <text x={x(m.t) - 4} y={i % 2 ? 72 : 64} fill={m.color} fontSize="11">{m.name}</text>
            </g>
          ))}
          <text x="10" y="86" fill="white" fontSize="10">−40 °C</text>
          <text x="245" y="86" fill="white" fontSize="10">10 °C</text>
        </svg>
      ),
    };
  },

  "receta-festival": (p: { E: number; B: number }, [h, l, e, b]) => ({
    lines: [`Huevos del plan: ${e} de ${p.E} disponibles`, `Harina del plan: ${h} g · comprada: ${b} × ${p.B} = ${b * p.B} g`, `Leche del plan: ${l} ml`],
    diagram: (
      <div role="img" aria-label={`${e} huevos usados de ${p.E}`} className="flex flex-wrap gap-1.5">
        {Array.from({ length: Math.max(p.E, e) }, (_, i) => (
          <span key={i} className={`h-6 w-5 rounded-[50%] border ${i >= p.E ? "border-red-400 bg-red-500/60" : i < e ? "border-amber-200 bg-amber-200" : "border-slate-500 bg-slate-800"}`} />
        ))}
      </div>
    ),
  }),

  "ascensor-carga": (p: { W: number; w: number; pct: number }, [c, v]) => {
    const load = p.W + p.w * c;
    return {
      lines: [`Peso por viaje: ${p.W} + ${p.w} × ${c} = ${load} kg`, `Cajas transportadas: ${c} × ${v} = ${c * v}`],
      diagram: (
        <svg viewBox="0 0 280 60" role="img" aria-label={`Carga de ${load} kg sobre 600 kg, con la marca del ${p.pct} %`} className="h-16 w-full">
          <rect x="10" y="14" width="260" height="20" fill="#1e293b" stroke="#64748b" />
          <rect x="10" y="14" width={clamp(load / 600, 0, 1) * 260} height="20" fill={load > 600 ? "#ef4444" : "#22d3ee"} />
          <path d={`M${10 + 2.6 * p.pct} 8 V40`} stroke="#f472b6" strokeDasharray="4 3" />
          <text x={10 + 2.6 * p.pct - 14} y="52" fill="#f9a8d4" fontSize="11">{p.pct} %</text>
          <text x="245" y="52" fill="white" fontSize="11">600</text>
        </svg>
      ),
    };
  },

  "jardin-baldosas": (p: { r: number }, [n, b]) => {
    const side = n + 2 * p.r, cell = 150 / side;
    return {
      lines: [`Césped: ${n} × ${n} = ${n * n} m²`, `Baldosas de tu plan: ${b}`],
      diagram: (
        <svg viewBox="0 0 160 160" role="img" aria-label={`Jardín de lado ${n} con ${p.r} anillos de baldosas alrededor`} className="mx-auto h-44 w-44">
          {Array.from({ length: side * side }, (_, i) => {
            const row = Math.floor(i / side), col = i % side, ring = Math.min(row, col, side - 1 - row, side - 1 - col);
            return (
              <rect key={i} x={5 + col * cell} y={5 + row * cell} width={cell - 0.6} height={cell - 0.6} fill={ring < p.r ? (ring % 2 ? "#f59e0b" : "#fbbf24") : "#15803d"} />
            );
          })}
        </svg>
      ),
    };
  },

  "huerto-escolar": (_p: { L: number }, [l, a]) => {
    const scale = 220 / Math.max(30, l, a);
    return {
      lines: [`Cerca: ${l} + ${a} + ${a} = ${l + 2 * a} m`, `Área: ${l} × ${a} = ${l * a} m²`],
      diagram: (
        <svg viewBox="0 0 260 170" role="img" aria-label={`Huerto de ${l} m de largo y ${a} m de ancho contra la pared`} className="h-44 w-full">
          <path d="M10 12 H250" stroke="#94a3b8" strokeWidth="6" />
          <text x="12" y="8" fill="#cbd5e1" fontSize="9">pared</text>
          <rect x="20" y="15" width={l * scale} height={a * scale} fill="#14532d" />
          <path d={`M20 15 V${15 + a * scale} H${20 + l * scale} V15`} fill="none" stroke="#22d3ee" strokeWidth="3" />
          <text x={20 + (l * scale) / 2 - 12} y={Math.min(15 + a * scale + 14, 166)} fill="white" fontSize="11">{l} m</text>
          <text x={Math.min(24 + l * scale, 228)} y={15 + (a * scale) / 2} fill="white" fontSize="11">{a} m</text>
        </svg>
      ),
    };
  },

  "torneo-lanzamientos": (p: { prev: number[] }, values) => {
    const all = [...p.prev, ...values];
    // Altura de cada punto: cuántos valores iguales hay antes que él.
    const level = all.map((s, i) => all.slice(0, i).filter((t) => t === s).length);
    return {
      lines: [`Suma de los siete: ${all.join(" + ")} = ${all.reduce((a, b) => a + b, 0)}`, `Ordenados: ${[...all].sort((a, b) => a - b).join(", ")}`],
      diagram: (
        <svg viewBox="0 0 280 110" role="img" aria-label={`Diagrama de puntos de los siete lanzamientos: ${all.join(", ")}`} className="h-28 w-full">
          <path d="M15 90 H265" stroke="#94a3b8" />
          {Array.from({ length: 11 }, (_, s) => (
            <text key={s} x={11 + s * 25} y="104" fill="white" fontSize="10">{s}</text>
          ))}
          {all.map((s, i) => (
            <circle key={i} cx={15 + s * 25} cy={80 - level[i] * 14} r="6" fill={i < p.prev.length ? "#94a3b8" : "#fbbf24"} />
          ))}
        </svg>
      ),
    };
  },

  "convoy-suministros": (p: { a: number; b: number; o: number }, [e, d]) => {
    const x = (t: number) => 15 + t * 2.5;
    const first = Array.from({ length: Math.floor(100 / p.a) + 1 }, (_, i) => i * p.a);
    const second = Array.from({ length: Math.floor((100 - p.o) / p.b) + 1 }, (_, i) => p.o + i * p.b);
    return {
      lines: [`Primer vehículo: cada ${p.a} min desde el minuto 0`, `Segundo vehículo: cada ${p.b} min desde el minuto ${p.o}`, `Tu encuentro: minuto ${e} → entrega: minuto ${d}`],
      diagram: (
        <svg viewBox="0 0 280 100" role="img" aria-label={`Pasos por el depósito de los dos vehículos y tus minutos ${e} y ${d}`} className="h-28 w-full">
          <path d="M15 30 H265 M15 70 H265" stroke="#94a3b8" />
          {[e, d].map((t, i) => (
            <path key={i} d={`M${x(t)} 15 V85`} stroke="#f472b6" strokeDasharray="4 3" />
          ))}
          {first.map((t) => <circle key={`a${t}`} cx={x(t)} cy="30" r="3.5" fill="#22d3ee" />)}
          {second.map((t) => <circle key={`b${t}`} cx={x(t)} cy="70" r="3.5" fill="#fbbf24" />)}
          <text x="15" y="96" fill="white" fontSize="10">0</text>
          <text x="250" y="96" fill="white" fontSize="10">100</text>
        </svg>
      ),
    };
  },

  "mezcla-emergencia": (p: { x: Frac; y: Frac; s: Frac; d: Frac }, [q, e]) => {
    const twelfths = ([a, b]: Frac) => (12 * a) / b;
    return {
      lines: [`Tu cantidad: ${q}/12 L`, `Tus equipos: ${e} de ${p.d[0]}/${p.d[1]} L`],
      diagram: (
        <Cells
          label={`Doceavos: ${p.x[0]}/${p.x[1]}, ${p.y[0]}/${p.y[1]}, derrame de ${p.s[0]}/${p.s[1]} y tu cantidad de ${q}/12`}
          rows={[
            { name: `${p.x[0]}/${p.x[1]} L`, count: twelfths(p.x), color: "bg-cyan-400" },
            { name: `${p.y[0]}/${p.y[1]} L`, count: twelfths(p.y), color: "bg-cyan-400" },
            { name: `Derrame ${p.s[0]}/${p.s[1]} L`, count: twelfths(p.s), color: "bg-red-400" },
            { name: "Tu cantidad", count: q, color: "bg-amber-300", size: Math.max(12, Math.ceil(q / 12) * 12) },
          ]}
        />
      ),
    };
  },

  "mercado-barrio": (p: { P: number; d: number; t: number; B: number }, [price, k]) => ({
    lines: [`${p.P} soles → descuento del ${p.d} % → impuesto del ${p.t} %`, `Tu compra: ${k} × ${price} = ${k * price} soles; presupuesto: ${p.B} soles`],
    diagram: <StackBar total={p.B} label={`Compra de ${k * price} soles sobre ${p.B} de presupuesto`} parts={Array.from({ length: k }, (_, i) => ({ name: `kit${i}`, value: price, color: i % 2 ? "#0891b2" : "#22d3ee" }))} />,
  }),

  "rescate-montana": (p: { H: number }, [n, h]) => ({
    lines: [`Tu equipo: ${n} × ${h} = ${n * h} horas-persona`, `Horas de trabajo: ${h}; la tormenta llega en ${p.H}`],
    diagram: <StackBar total={p.H} label={`${h} horas de trabajo frente a ${p.H} horas hasta la tormenta`} parts={[{ name: "horas", value: h, color: "#22d3ee" }]} />,
  }),

  "feria-energia": (p: { S: number; cs: number; cl: number }, [s, g]) => ({
    lines: [`Generadores: ${s} + ${g} = ${s + g} (caben ${p.S})`, `Producción: 2 × ${s} + 5 × ${g} = ${2 * s + 5 * g} kW`, `Coste: ${p.cs} × ${s} + ${p.cl} × ${g} = ${p.cs * s + p.cl * g} soles`],
    diagram: (
      <div role="img" aria-label={`${s} generadores pequeños y ${g} grandes`} className="flex flex-wrap items-end gap-1">
        {Array.from({ length: s }, (_, i) => <span key={`s${i}`} className="h-4 w-4 rounded-sm bg-cyan-400" />)}
        {Array.from({ length: g }, (_, i) => <span key={`g${i}`} className="h-8 w-8 rounded-sm bg-amber-300" />)}
      </div>
    ),
  }),

  "ruta-dron": (p: { bx: number; by: number }, [x, y]) => {
    const scale = 140 / 20, X = (v: number) => 25 + v * scale, Y = (v: number) => 160 - v * scale;
    return {
      lines: [`A (0, 0) → estación (${x}, ${y}) → B (${p.bx}, ${p.by})`],
      diagram: (
        <svg viewBox="0 0 200 180" role="img" aria-label={`Plano con A, B (${p.bx}, ${p.by}) y la estación en (${x}, ${y})`} className="mx-auto h-48 w-full max-w-xs">
          <path d={`M25 160 H${X(20)} M25 160 V${Y(20)}`} stroke="#94a3b8" fill="none" />
          <path d={`M${X(0)} ${Y(0)} L${X(p.bx)} ${Y(p.by)}`} stroke="#67e8f9" strokeDasharray="5 4" />
          <circle cx={X(0)} cy={Y(0)} r="4" fill="white" />
          <circle cx={X(p.bx)} cy={Y(p.by)} r="4" fill="white" />
          <circle cx={X(x)} cy={Y(y)} r="5" fill="#fbbf24" />
          <text x="27" y="175" fill="white" fontSize="10">A</text>
          <text x={X(p.bx) + 6} y={Y(p.by)} fill="white" fontSize="10">B</text>
        </svg>
      ),
    };
  },

  "deposito-agua": (p: { L0: number; pct: number }, [vol, f]) => {
    const capacity = vol * 1000, water = p.L0 + f, level = capacity ? clamp(water / capacity, 0, 1.1) : 0;
    return {
      lines: [`Tu capacidad: ${vol} m³ = ${fmt(capacity)} L`, `Agua: ${fmt(p.L0)} L existentes + ${fmt(f)} L de tu plan = ${fmt(water)} L`],
      diagram: (
        <svg viewBox="0 0 160 130" role="img" aria-label={`Depósito con ${fmt(water)} L de una capacidad de ${fmt(capacity)} L, con la marca del ${p.pct} %`} className="mx-auto h-36 w-full max-w-[12rem]">
          <rect x="40" y="10" width="80" height="100" fill="#0f172a" stroke="#67e8f9" strokeWidth="2" />
          <rect x="41" y={110 - Math.min(level, 1) * 99} width="78" height={Math.min(level, 1) * 99} fill={level > 1 ? "#ef4444" : "#0891b2"} />
          <path d={`M30 ${110 - p.pct} H130`} stroke="#f472b6" strokeDasharray="4 3" />
          <text x="132" y={113 - p.pct} fill="#f9a8d4" fontSize="10">{p.pct} %</text>
        </svg>
      ),
    };
  },

  "puente-valle": (p: { a: number; b: number; s: number }, [d, n]) => ({
    lines: [`Tramos: ${p.a} m de desnivel y ${p.b} m en horizontal · tu pasarela: ${d} m`, `Piezas: ${n} × ${p.s} = ${n * p.s} m`],
    diagram: (
      <svg viewBox="0 0 260 155" role="img" aria-label={`Triángulo rectángulo con tramos de ${p.a} y ${p.b} metros y pasarela de ${d} metros`} className="h-40 w-full">
        <path d="M35 25 V125 H210 Z" fill="#164e63" stroke="#67e8f9" strokeWidth="3" />
        <path d="M35 110 H50 V125" fill="none" stroke="white" />
        <text x="8" y="80" fill="white" fontSize="11">{p.a} m</text>
        <text x="105" y="145" fill="white" fontSize="11">{p.b} m</text>
        <text x="120" y="62" fill="#fde68a" fontSize="11">Tu valor: {d} m</text>
      </svg>
    ),
  }),

  "tombola-solidaria": (p: { pr: number; c: number }, [w, s]) => ({
    lines: [`Bolsa: ${w} premiados + ${s} sin premio = ${w + s} boletos${w + s ? ` · probabilidad ${w}/${w + s}` : ""}`, `Ganancia: ${p.pr} × ${w + s} − ${p.c} × ${w} = ${p.pr * (w + s) - p.c * w} soles`],
    diagram: (
      <div role="img" aria-label={`${w} boletos premiados y ${s} sin premio`} className="grid grid-cols-10 gap-1">
        {Array.from({ length: w + s }, (_, i) => <span key={i} className={`h-5 rounded-sm ${i < w ? "bg-amber-400" : "bg-slate-500"}`} />)}
      </div>
    ),
  }),

  "alerta-meteorologica": (p: { D: number; R: number; A: number; K: number }, [f, pct]) => ({
    lines: [`Tu porcentaje: ${pct} % de las alertas terminaron en lluvia`],
    diagram: (
      <table className="w-full table-fixed border-collapse text-center text-sm">
        <caption className="sr-only">Tabla de doble entrada con tus alertas sin lluvia</caption>
        <thead>
          <tr className="text-slate-300">
            <td className="p-1" />
            <th scope="col" className="p-1">Lluvia</th>
            <th scope="col" className="p-1">Sin lluvia</th>
            <th scope="col" className="p-1">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="p-1 text-left text-slate-300">Alerta</th>
            <td className="border border-slate-600 p-1">{p.K}</td>
            <td className="border border-fuchsia-300 bg-fuchsia-950/60 p-1 font-bold">{f}</td>
            <td className="border border-slate-600 p-1">{p.A}</td>
          </tr>
          <tr>
            <th scope="row" className="p-1 text-left text-slate-300">Sin alerta</th>
            <td className="border border-slate-600 p-1 text-slate-500">?</td>
            <td className="border border-slate-600 p-1 text-slate-500">?</td>
            <td className="border border-slate-600 p-1 text-slate-500">?</td>
          </tr>
          <tr>
            <th scope="row" className="p-1 text-left text-slate-300">Total</th>
            <td className="border border-slate-600 p-1">{p.R}</td>
            <td className="border border-slate-600 p-1 text-slate-500">?</td>
            <td className="border border-slate-600 p-1">{p.D}</td>
          </tr>
        </tbody>
      </table>
    ),
  }),

  "ahorro-observatorio": (p: { C: number; s: number; c: number }, [year, simple]) => ({
    lines: [`Cuenta simple: ${fmt(p.C)} soles y cada año suma el ${p.s} % de ${fmt(p.C)}`, `Cuenta compuesta: ${fmt(p.C)} soles y cada año gana el ${p.c} % de su saldo`, `Tu plan: año ${year}, cuenta simple con ${fmt(simple)} soles`],
  }),

  "trayectoria-cohete": (p: { b: number; t1: number }, [top, up, down]) => {
    const safe = p.t1 * (p.b - p.t1), h = (t: number) => p.b * t - t * t;
    const X = (t: number) => 25 + t * 18, Y = (v: number) => 135 - v * 3;
    const curve = Array.from({ length: p.b * 4 + 1 }, (_, i) => i / 4).map((t, i) => `${i ? "L" : "M"}${X(t)} ${Y(h(t))}`).join(" ");
    return {
      lines: [`h(${up}) = ${h(up)} m · h(${down}) = ${h(down)} m`, `Altura máxima de tu plan: ${top} m · altura segura: ${safe} m`],
      diagram: (
        <svg viewBox="0 0 270 150" role="img" aria-label={`Parábola h(t) = −t² + ${p.b}t con la altura segura de ${safe} m y tus segundos ${up} y ${down}`} className="h-40 w-full">
          <path d={`M25 135 H${X(12)} M25 135 V10`} fill="none" stroke="#94a3b8" />
          <path d={curve} fill="none" stroke="#67e8f9" strokeWidth="2.5" />
          <path d={`M25 ${Y(safe)} H${X(12)}`} stroke="#f472b6" strokeDasharray="4 3" />
          <path d={`M25 ${Y(top)} H${X(12)}`} stroke="#fde68a" strokeDasharray="2 3" />
          {[up, down].map((t, i) => <circle key={i} cx={X(t)} cy={Y(h(t))} r="4.5" fill="#fbbf24" />)}
          <text x="27" y="147" fill="white" fontSize="10">0 s</text>
          <text x={X(12) - 20} y="147" fill="white" fontSize="10">12 s</text>
        </svg>
      ),
    };
  },
};
