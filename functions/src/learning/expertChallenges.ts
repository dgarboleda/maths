import type { AdventureInput, AdventureResult, ExpertChallenge, ExpertRound } from "./adventures";

/**
 * Retos expertos: la segunda fase de cada aventura. La historia da un giro
 * (datos nuevos, una restricción más, algo que optimizar) y el estudiante
 * vuelve a planificar sin pistas por entrada. Las pistas de cada objetivo
 * solo aparecen tras probar un plan que falla, y señalan el error sin dar el
 * método completo.
 *
 * Cada reto es una familia de partidas: los mismos objetivos con datos
 * distintos, para poder volver a jugarlo. Las partidas salen de una rejilla
 * de parámetros filtrada (solución entera, dentro de los rangos de entrada y,
 * en los retos de «el mejor», un único óptimo). La partida 0 es la original:
 * los retos empezados antes de las partidas conservan sus datos.
 *
 * `expertChallenges.test.ts` comprueba cada partida: su solución se acepta,
 * la de la misión no sirve y, donde el espacio de entradas lo permite, lo
 * recorre entero para confirmar qué planes se aceptan.
 */

type Hint = string | ((v: number[]) => string);
interface Round {
  brief: string;
  goals: string[];
  checks: ((v: number[]) => boolean)[];
  hints: Hint[];
  success: string;
}

function toRound(spec: Round, params: Readonly<Record<string, unknown>>): ExpertRound {
  if (spec.checks.length !== spec.goals.length || spec.hints.length !== spec.goals.length)
    throw new Error("Cada objetivo del reto experto necesita su comprobación y su pista.");
  return {
    brief: spec.brief,
    goals: spec.goals,
    success: spec.success,
    params,
    evaluate(values): AdventureResult {
      const goals = spec.checks.map((check) => check(values));
      const failed = goals.indexOf(false);
      if (failed < 0) return { goals, feedback: `¡Reto superado! ${spec.success}` };
      const hint = spec.hints[failed];
      return { goals, feedback: typeof hint === "string" ? hint : hint(values) };
    },
  };
}

/** Familia de partidas. `canonical` es la partida original (la 0); el resto
 *  sale de `candidates` filtrados por `valid`, sin repetir la original, y
 *  repartidos para no pasar de `max`. */
function family<P>(spec: {
  inputs?: AdventureInput[];
  canonical: P;
  candidates?: P[];
  valid?: (p: P) => boolean;
  max?: number;
  round: (p: P) => Round;
  solution: (p: P) => number[];
}): ExpertChallenge {
  const same = (a: P, b: P) => JSON.stringify(a) === JSON.stringify(b);
  const extra = (spec.candidates ?? []).filter((p) => !same(p, spec.canonical) && (spec.valid?.(p) ?? true));
  const list = [spec.canonical, ...spread(extra, (spec.max ?? 12) - 1)];
  const at = (variant: number) => list[((Math.trunc(variant) % list.length) + list.length) % list.length];
  return {
    inputs: spec.inputs,
    variants: list.length,
    round: (variant) => toRound(spec.round(at(variant)), at(variant) as Readonly<Record<string, unknown>>),
    solution: (variant) => spec.solution(at(variant)),
  };
}

/** Elementos repartidos a lo largo de la lista, en su orden. */
function spread<T>(list: T[], max: number): T[] {
  if (list.length <= max) return list;
  return Array.from({ length: max }, (_, i) => list[Math.floor((i * list.length) / max)]);
}
function grid<T extends Record<string, unknown>>(axes: { [K in keyof T]: T[K][] }): T[] {
  return Object.entries(axes).reduce<Record<string, unknown>[]>(
    (rows, [key, values]) => rows.flatMap((row) => (values as unknown[]).map((value) => ({ ...row, [key]: value }))),
    [{}],
  ) as T[];
}

const input = (id: string, label: string, max: number, unit?: string, min = 0): AdventureInput => ({
  id,
  label,
  min,
  max,
  step: 1,
  start: min,
  unit,
  clue: "",
});
const neg = (x: number) => (x < 0 ? `−${-x}` : `${x}`);
const n = (x: number, digits = 2) => x.toLocaleString("es", { maximumFractionDigits: digits });
type Frac = [number, number];
const f = ([a, b]: Frac) => `${a}/${b}`;
/** a/b de x, o null si no es entero. */
const of = ([a, b]: Frac, x: number) => ((x * a) % b === 0 ? (x * a) / b : null);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

// --- Apagón -----------------------------------------------------------------
type Apagon = { k: Frac; h: Frac; r: Frac; e: Frac };
function apagonData({ k, h, r, e }: Apagon) {
  const N = of(k, 180), H = N === null ? null : of(h, N);
  const R = N === null || H === null ? null : of(r, N - H);
  const E = N === null ? null : of(e, N);
  return { N, H, R, E, T: N !== null && H !== null && R !== null && E !== null ? N - H - R - E : null };
}

// --- Torneo -----------------------------------------------------------------
type Torneo = { prev: number[]; M: number; Md: number; Rg: number; Mo: number; sol: number[] };
const throws = (prev: number[], v: number[]) => [...prev, ...v];
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
function modes(values: number[]) {
  const counts = new Map<number, number>();
  for (const s of values) counts.set(s, (counts.get(s) ?? 0) + 1);
  const top = Math.max(...counts.values());
  return [...counts].filter(([, c]) => c === top).map(([s]) => s).sort((a, b) => a - b);
}

// --- Convoy -----------------------------------------------------------------
function convoyMeeting(a: number, b: number, o: number) {
  for (let t = o + 1; t <= 100; t++) if (t % a === 0 && (t - o) % b === 0) return t;
  return null;
}

export const EXPERT_CHALLENGES: Record<string, ExpertChallenge> = {
  apagon: family<Apagon>({
    canonical: { k: [3, 4], h: [2, 3], r: [1, 3], e: [1, 9] },
    candidates: grid<Apagon>({
      k: [[3, 4], [2, 3], [5, 6], [7, 9], [5, 9]],
      h: [[2, 3], [1, 2], [3, 5], [2, 5], [3, 4]],
      r: [[1, 3], [1, 4], [1, 5], [1, 2]],
      e: [[1, 9], [1, 10], [1, 12], [1, 15], [1, 6]],
    }),
    valid: (p) => {
      const { H, R, T } = apagonData(p);
      return T !== null && T > 0 && R! > 0 && H !== 100;
    },
    round: (p) => {
      const { N, H, R, E, T } = apagonData(p) as Record<string, number>;
      const H0 = of(p.h, 180);
      return {
        brief: `Una tormenta daña un generador y la reserva baja a ${f(p.k)} de las 180 unidades. El hospital necesita ${f(p.h)} de la nueva reserva; la radio, ${f(p.r)} de lo que deje el hospital. ${f(p.e)} de la nueva reserva debe quedar en baterías de emergencia, sin asignar, y el taller se lleva todo lo demás.`,
        goals: [`Hospital con ${f(p.h)} de la nueva reserva`, `Radio con ${f(p.r)} de lo que deja el hospital`, `${f(p.e)} en baterías y el resto al taller`],
        checks: [([h]) => h === H, ([, r]) => r === R, ([h, r, t]) => h + r + t === N - E],
        hints: [
          ([h]) =>
            h === H0
              ? `${h} es ${f(p.h)} de la reserva original. Tras la tormenta la reserva es otra: calcúlala primero.`
              : `Con ${h} unidades el hospital no recibe ${f(p.h)} de la nueva reserva. ¿Cuántas unidades quedan después de la tormenta?`,
          ([, r]) =>
            r === of(p.r, N)
              ? `${r} es ${f(p.r)} de toda la nueva reserva. La radio toma ${f(p.r)} de lo que deja el hospital.`
              : `Con ${r} unidades la radio no recibe ${f(p.r)} de lo que deja el hospital.`,
          ([h, r, t]) =>
            h + r + t > N
              ? `Pediste ${h + r + t} unidades y tras la tormenta solo hay ${N}.`
              : `Asignaste ${h + r + t} y quedan ${N - h - r - t} en baterías. Deben quedar exactamente ${f(p.e)} de la nueva reserva; el taller se lleva el resto.`,
        ],
        success: `${f(p.k)} de 180 = ${N}. Hospital: ${f(p.h)} de ${N} = ${H}. Radio: ${f(p.r)} de los ${N - H} restantes = ${R}. Baterías: ${f(p.e)} de ${N} = ${E}. Taller: ${N} − ${H} − ${R} − ${E} = ${T}.`,
      };
    },
    solution: (p) => {
      const { H, R, T } = apagonData(p);
      return [H!, R!, T!];
    },
  }),

  "camara-fria": family<{ F: number; d: number; lo: number; G: number }>({
    canonical: { F: -15, d: 6, lo: 2, G: 24 },
    candidates: grid<{ F: number; d: number; lo: number; s: number }>({ F: [-12, -14, -15, -16], d: [5, 6, 7], lo: [2, 3], s: [0, 1] }).map(
      ({ F, d, lo, s }) => ({ F, d, lo, G: lo - F + d + s }),
    ),
    // Con 24 grados o menos, ningún plan de la misión (25 o más) sirve.
    valid: ({ G }) => G <= 24,
    round: ({ F, d, lo, G }) => ({
      brief: `Llega un lote de vacunas y se avería un compresor. Las vacunas van en la nevera, entre ${lo} y 8 °C. El congelador aguanta hasta ${neg(F)} °C, los helados necesitan ${d} grados menos que el congelador y el compresor que queda solo soporta ${G} grados de diferencia entre la nevera y los helados.`,
      goals: [`Congelador a ${neg(F)} °C o menos`, `Vacunas entre ${lo} y 8 °C`, `Helados ${d} grados bajo el congelador`, `Diferencia nevera − helados ≤ ${G}`],
      checks: [([, c]) => c <= F, ([, , v]) => v >= lo && v <= 8, ([h, c]) => h <= c - d, ([h, , v]) => v - h <= G],
      hints: [
        ([, c]) => `${neg(c)} °C es demasiado cálido para el congelador: necesita ${neg(F)} °C o menos.`,
        ([, , v]) =>
          v < lo ? `Con ${neg(v)} °C las vacunas se dañan por el frío: van entre ${lo} y 8 °C.` : `Con ${neg(v)} °C las vacunas se calientan: van entre ${lo} y 8 °C.`,
        ([, c]) => `Los helados deben estar ${d} grados por debajo del congelador: ${neg(c)} − ${d} = ${neg(c - d)} °C o menos.`,
        ([h, , v]) => `El compresor no aguanta: ${neg(v)} − (${neg(h)}) = ${v - h} grados. ¿De verdad necesita el congelador estar tan frío?`,
      ],
      success: `Por ejemplo, congelador a ${neg(F)} °C, helados a ${neg(F - d)} °C y vacunas a ${lo} °C: ${lo - F + d} grados de diferencia. Cada grado que enfrías el congelador obliga a enfriar los helados y aumenta la diferencia con la nevera.`,
    }),
    solution: ({ F, d, lo }) => [F - d, F, lo],
  }),

  "receta-festival": family<{ E: number; B: number }>({
    canonical: { E: 9, B: 250 },
    candidates: grid<{ E: number; B: number }>({ E: [5, 9, 11, 13], B: [250, 300, 400] }),
    round: ({ E, B }) => {
      const bags = Math.ceil((100 * E) / B);
      return {
        brief: `El día del festival solo quedan ${E} huevos y no se pueden comprar más. Prepara el pan dulce para el mayor número posible de personas con la misma receta (para 4 personas: 200 g de harina, 300 ml de leche y 2 huevos), sin partir huevos, y compra solo las bolsas de harina de ${B} g necesarias.`,
        goals: ["Ingredientes en la razón de la receta", "Para el mayor número de personas", "Bolsas justas"],
        checks: [
          ([h, l, e]) => e > 0 && h === 100 * e && l === 150 * e,
          ([, , e]) => e === E,
          ([h, , , b]) => h > 0 && b * B >= h && (b - 1) * B < h,
        ],
        hints: [
          ([h, l, e]) =>
            e === 0
              ? "Sin huevos no hay pan dulce."
              : `${h} g, ${l} ml y ${e} huevos no guardan la razón 200 : 300 : 2 de la receta. ¿Cuánta harina y leche van con cada huevo?`,
          ([, , e]) => (e > E ? `Solo quedan ${E} huevos.` : `Con ${e} huevos alimentas a ${e * 2} personas, pero todavía quedan huevos sin usar.`),
          ([h, , , b]) => (b * B < h ? `${b} bolsas son ${b * B} g: no alcanzan para ${h} g.` : `${b} bolsas son ${b * B} g: sobra al menos una bolsa entera.`),
        ],
        success: `Cada huevo rinde para 2 personas: ${E} huevos alcanzan para ${2 * E}. Eso es ${2 * E}/4 = ${n(E / 2)} veces la receta: ${100 * E} g de harina, ${150 * E} ml de leche y ${bags} bolsas de ${B} g (${bags * B} g).`,
      };
    },
    solution: ({ E, B }) => [100 * E, 150 * E, E, Math.ceil((100 * E) / B)],
  }),

  "ascensor-carga": family<{ W: number; w: number; N: number; pct: number }>({
    canonical: { W: 120, w: 45, N: 65, pct: 90 },
    candidates: grid<{ W: number; w: number; N: number; pct: number }>({ W: [110, 120, 130, 140], w: [40, 45, 50], N: [57, 65, 71, 76], pct: [80, 90] }),
    valid: ({ W, w, N, pct }) => {
      const most = Math.floor((6 * pct - W) / w), trips = Math.ceil(N / most);
      // El margen de seguridad debe cambiar el plan respecto a los 600 kg.
      return most >= 1 && most <= 20 && trips >= 2 && trips <= 20 && Math.floor((600 - W) / w) > most;
    },
    round: ({ W, w, N, pct }) => {
      const limit = 6 * pct, most = Math.floor((limit - W) / w), trips = Math.ceil(N / most);
      return {
        brief: `Llega un pedido urgente de ${N} cajas de ${w} kg. Hoy la operaria y el carro de repuesto pesan ${W} kg en total y viajan en cada subida. Por seguridad, el ascensor no debe pasar del ${pct} % de sus 600 kg. Cada viaje gasta combustible: usa el menor número de viajes.`,
        goals: [`Carga al ${pct} % o menos`, `Suben las ${N} cajas`, "El menor número de viajes"],
        checks: [([c]) => W + w * c <= limit, ([c, v]) => c * v >= N, ([, v]) => v === trips],
        hints: [
          ([c]) =>
            W + w * c <= 600
              ? `Peso por viaje: ${W} + ${w} × ${c} = ${W + w * c} kg. Cabe en el ascensor, pero supera el margen de seguridad del ${pct} %.`
              : `Peso por viaje: ${W} + ${w} × ${c} = ${W + w * c} kg. Ni siquiera cabe en los 600 kg.`,
          ([c, v]) => `${c} × ${v} = ${c * v} cajas: faltan ${N - c * v}.`,
          ([, v]) => `Funciona con ${v} viajes, pero ¿se puede con menos? Carga en cada viaje lo máximo que permite la seguridad.`,
        ],
        success: `El ${pct} % de 600 kg son ${limit} kg. ${W} + ${w}c ≤ ${limit} da c ≤ ${n((limit - W) / w, 1)}: caben ${most} cajas por viaje. ${N} ÷ ${most} ≈ ${n(N / most, 1)}, así que hacen falta ${trips} viajes.`,
      };
    },
    solution: ({ W, w, N, pct }) => {
      const most = Math.floor((6 * pct - W) / w);
      return [most, Math.ceil(N / most)];
    },
  }),

  "jardin-baldosas": family<{ A: number; r: number }>({
    inputs: [input("lado", "Lado del jardín", 20, "m", 1), input("baldosas", "Baldosas", 300)],
    canonical: { A: 150, r: 2 },
    candidates: grid<{ A: number; r: number }>({ A: [130, 150, 170, 200, 230], r: [2, 3] }),
    round: ({ A, r }) => {
      const side = Math.ceil(Math.sqrt(A)), tiles = (side + 2 * r) ** 2 - side ** 2;
      const word = r === 2 ? "dos" : "tres";
      const rings = Array.from({ length: r }, (_, i) => 4 * (side + 2 * i) + 4);
      return {
        brief: `El ayuntamiento quiere un borde de ${word} anillos de baldosas de 1 m × 1 m alrededor del jardín cuadrado, uno pegado al otro. El césped debe medir al menos ${A} m². Cada baldosa cuesta: usa las menos posibles, sin sobrantes.`,
        goals: [`Césped de al menos ${A} m²`, `Borde de ${word} anillos completo, sin sobrantes`, "Las menos baldosas posibles"],
        checks: [([l]) => l * l >= A, ([l, b]) => b === (l + 2 * r) ** 2 - l * l, ([l]) => l === side],
        hints: [
          ([l]) => `Con lado ${l}, el césped mide ${l * l} m²: no llega a ${A}.`,
          ([l, b]) =>
            b === 4 * l + 4
              ? `${b} baldosas forman un solo anillo. Cada anillo siguiente rodea un cuadrado más grande.`
              : b === r * (4 * l + 4)
                ? "Los anillos no son iguales: cada uno rodea un cuadrado más grande que el anterior."
                : `Con ${b} baldosas el borde ${b < (l + 2 * r) ** 2 - l * l ? "queda incompleto" : "tiene sobrantes"}. Cuenta cada anillo por separado.`,
          () => "El diseño funciona, pero un jardín más pequeño que cumpla el césped gastaría menos baldosas.",
        ],
        success: `${side} es el menor lado con ${side}² = ${side * side} ≥ ${A}. Los anillos tienen ${rings.join(" + ")} baldosas: en total, ${tiles} = (${side} + ${2 * r})² − ${side}².`,
      };
    },
    solution: ({ A, r }) => {
      const side = Math.ceil(Math.sqrt(A));
      return [side, (side + 2 * r) ** 2 - side ** 2];
    },
  }),

  "huerto-escolar": family<{ L: number }>({
    canonical: { L: 44 },
    candidates: [36, 40, 48, 52, 56].map((L) => ({ L })),
    round: ({ L }) => {
      const a = L / 4, l = L / 2;
      return {
        brief: `El huerto se apoya en la pared del patio: el largo pegado a la pared no necesita cerca. Con ${L} m de cerca para los otros tres lados, consigue el huerto de mayor área posible.`,
        goals: [`${L} m de cerca en tres lados`, "La mayor área posible"],
        checks: [([x, y]) => x + 2 * y === L, ([x, y]) => x * y === l * a],
        hints: [
          ([x, y]) =>
            2 * (x + y) === L
              ? "Ese reparto cercaba los cuatro lados. Ahora la pared cubre uno de los largos."
              : 2 * x + y === L
                ? "Pusiste cerca en los dos largos y un ancho, pero el largo pegado a la pared no lleva cerca."
                : `Cerca usada: ${x} + 2 × ${y} = ${x + 2 * y} m. Deben ser ${L} m.`,
          ([x, y]) => `Área: ${x} × ${y} = ${x * y} m². ¿Es la mayor? Prueba los anchos vecinos.`,
        ],
        success: `Con largo = ${L} − 2 × ancho, el área (${L} − 2a) × a es máxima en a = ${a}: ${l} m × ${a} m = ${l * a} m². Contra una pared, el mejor huerto ya no es un cuadrado.`,
      };
    },
    solution: ({ L }) => [L / 2, L / 4],
  }),

  // Configuraciones con una única terna posible (búsqueda exhaustiva previa;
  // `expertChallenges.test.ts` la repite).
  "torneo-lanzamientos": family<Torneo>({
    canonical: { prev: [4, 4, 8, 8], M: 7, Md: 8, Rg: 6, Mo: 8, sol: [7, 8, 10] },
    candidates: [
      { prev: [4, 4, 8, 8], M: 6, Md: 7, Rg: 5, Mo: 8, sol: [3, 7, 8] },
      { prev: [4, 4, 8, 8], M: 6, Md: 8, Rg: 8, Mo: 8, sol: [1, 8, 9] },
      { prev: [5, 5, 9, 9], M: 7, Md: 8, Rg: 5, Mo: 9, sol: [4, 8, 9] },
      { prev: [5, 5, 9, 9], M: 7, Md: 6, Rg: 5, Mo: 5, sol: [5, 6, 10] },
      { prev: [5, 5, 9, 9], M: 6, Md: 5, Rg: 7, Mo: 9, sol: [2, 3, 9] },
      { prev: [3, 6, 6, 9], M: 7, Md: 7, Rg: 6, Mo: 9, sol: [7, 9, 9] },
      { prev: [3, 6, 6, 9], M: 7, Md: 6, Rg: 7, Mo: 6, sol: [6, 9, 10] },
      { prev: [2, 7, 7, 9], M: 7, Md: 7, Rg: 7, Mo: 9, sol: [6, 9, 9] },
    ],
    round: ({ prev, M, Md, Rg, Mo, sol }) => {
      const all = (v: number[]) => throws(prev, v);
      return {
        brief: `La federación cambió las reglas de la final. Para clasificar, los 7 lanzamientos deben tener media ${M}, mediana ${Md}, rango ${Rg} y una única moda, el ${Mo}. Puntuaciones actuales: ${prev.join(", ")}; cada lanzamiento vale de 0 a 10.`,
        goals: [`Media de ${M}`, `Mediana de ${Md}`, `Rango de ${Rg}`, `Moda única: ${Mo}`],
        checks: [
          (v) => sum(all(v)) === 7 * M,
          (v) => sorted(all(v))[3] === Md,
          (v) => Math.max(...all(v)) - Math.min(...all(v)) === Rg,
          (v) => modes(all(v)).length === 1 && modes(all(v))[0] === Mo,
        ],
        hints: [
          (v) => `Los 7 lanzamientos suman ${sum(all(v))}; para media ${M} deben sumar 7 × ${M} = ${7 * M}.`,
          (v) => `Ordenados: ${sorted(all(v)).join(", ")}. La mediana es el cuarto valor: ${sorted(all(v))[3]}.`,
          (v) => `El rango es ${Math.max(...all(v))} − ${Math.min(...all(v))} = ${Math.max(...all(v)) - Math.min(...all(v))}. Debe ser ${Rg}.`,
          (v) =>
            modes(all(v)).length > 1
              ? `Hay empate en la moda: ${modes(all(v)).join(", ")} se repiten lo mismo. El ${Mo} debe repetirse más que cualquier otro valor.`
              : `La moda es ${modes(all(v))[0]}. El ${Mo} debe repetirse más que cualquier otro valor.`,
        ],
        success: `Con ${sol.join(", ")}: suman ${sum(sol)} (${7 * M} en total) y, ordenados, ${sorted(all(sol)).join(", ")} dan mediana ${Md}, rango ${Rg} y moda ${Mo}. Ninguna otra terna cumple las cuatro condiciones.`,
      };
    },
    solution: ({ sol }) => sol,
  }),

  "convoy-suministros": family<{ a: number; b: number; o: number }>({
    canonical: { a: 12, b: 18, o: 6 },
    candidates: grid<{ a: number; b: number; o: number }>({ a: [8, 10, 12, 15], b: [12, 18, 20, 30], o: [2, 4, 6, 8, 10] }),
    valid: ({ a, b, o }) => {
      const first = convoyMeeting(a, b, o);
      return a !== b && first !== null && first !== lcm(a, b) && first + lcm(a, b) <= 100;
    },
    round: ({ a, b, o }) => {
      const first = convoyMeeting(a, b, o)!, second = first + lcm(a, b);
      const times = (start: number, step: number) => Array.from({ length: Math.floor((second - start) / step) + 1 }, (_, i) => start + i * step);
      return {
        brief: `Hoy el segundo vehículo sale ${o} minutos después que el primero. El primero pasa por el depósito cada ${a} minutos y el segundo cada ${b}, contando desde su salida. La entrega se hace en su segundo encuentro en el depósito.`,
        goals: ["Primer encuentro en el depósito", "Entrega en el segundo encuentro"],
        checks: [([e]) => e === first, ([, d]) => d === second],
        hints: [
          ([e]) =>
            e === lcm(a, b)
              ? `${e} sería el primer encuentro si salieran a la vez. Con ${o} minutos de diferencia, escribe los minutos de paso de cada vehículo.`
              : e === o
                ? `En el minuto ${o} el segundo vehículo apenas sale y el primero no está en el depósito.`
                : `En el minuto ${e} los dos vehículos no coinciden en el depósito.`,
          ([e, d]) => (d === e + 6 ? "La entrega ya no es 6 minutos después: es en el segundo encuentro." : `En el minuto ${d} no se produce el segundo encuentro.`),
        ],
        success: `Primero: ${times(0, a).join(", ")}. Segundo: ${times(o, b).join(", ")}. Coinciden en ${first} y vuelven a coincidir ${lcm(a, b)} minutos después (el MCM), en ${second}.`,
      };
    },
    solution: ({ a, b, o }) => {
      const first = convoyMeeting(a, b, o)!;
      return [first, first + lcm(a, b)];
    },
  }),

  "mezcla-emergencia": family<{ x: Frac; y: Frac; s: Frac; d: Frac }>({
    inputs: [input("queda", "Cantidad que queda (doceavos de litro)", 40), input("equipos", "Equipos completos", 30)],
    canonical: { x: [3, 4], y: [2, 3], s: [5, 6], d: [1, 4] },
    candidates: grid<{ x: Frac; y: Frac; s: Frac; d: Frac }>({
      x: [[3, 4], [5, 6], [7, 12], [1, 2]],
      y: [[2, 3], [5, 12], [1, 3], [3, 4]],
      s: [[5, 6], [1, 2], [1, 3], [1, 4], [2, 3]],
      d: [[1, 4], [1, 6], [1, 3]],
    }),
    valid: ({ x, y, s, d }) => {
      const q = of(x, 12)! + of(y, 12)! - of(s, 12)!, dose = of(d, 12)!;
      return f(x) !== f(y) && q >= 3 && q <= 40 && q % dose !== 0 && Math.floor(q / dose) >= 1;
    },
    round: ({ x, y, s, d }) => {
      const tx = of(x, 12)!, ty = of(y, 12)!, ts = of(s, 12)!, dose = of(d, 12)!, q = tx + ty - ts, teams = Math.floor(q / dose);
      return {
        brief: `Durante el traslado se derrama ${f(s)} de litro de la mezcla (${f(x)} + ${f(y)} de litro). Además, los equipos nuevos necesitan ${f(d)} de litro cada uno. Indica cuánto queda, en doceavos de litro, y cuántos equipos completos se pueden abastecer.`,
        goals: ["Cantidad que queda", `Equipos completos de ${f(d)} de litro`],
        checks: [([v]) => v === q, ([, e]) => e === teams],
        hints: [
          ([v]) =>
            v === tx + ty + ts
              ? `Sumaste lo derramado: los ${f(s)} de litro se pierden, así que se restan.`
              : v === tx + ty
                ? `${v}/12 es lo que había antes del derrame.`
                : v === ts
                  ? `${v}/12 es lo que se derramó, no lo que queda.`
                  : `${v}/12 no es lo que queda. Expresa las tres cantidades en doceavos antes de operar.`,
          ([, e]) =>
            e === q
              ? `Cada equipo ya no usa 1/12, sino ${f(d)} de litro.`
              : e > teams
                ? `No alcanza para ${e} equipos completos de ${f(d)} de litro.`
                : "Aún alcanza para otro equipo completo.",
        ],
        success: `${tx}/12 + ${ty}/12 − ${ts}/12 = ${q}/12 L. Cada equipo usa ${f(d)} = ${dose}/12 L: alcanza para ${teams} equipos y sobra${q - teams * dose === 1 ? "" : "n"} ${q - teams * dose}/12 L.`,
      };
    },
    solution: ({ x, y, s, d }) => {
      const q = of(x, 12)! + of(y, 12)! - of(s, 12)!;
      return [q, Math.floor(q / of(d, 12)!)];
    },
  }),

  "mercado-barrio": family<{ P: number; d: number; t: number; B: number }>({
    canonical: { P: 200, d: 25, t: 12, B: 700 },
    candidates: grid<{ P: number; d: number; t: number; B: number }>({ P: [150, 200, 250], d: [10, 20, 25, 40], t: [8, 10, 12, 20], B: [500, 600, 700, 900] }),
    valid: ({ P, d, t, B }) => {
      const cents = P * (100 - d) * (100 + t);
      if (cents % 10000 !== 0) return false;
      const price = cents / 10000, kits = Math.floor(B / price);
      return price <= 250 && price !== 144 && kits >= 2 && kits <= 10;
    },
    round: ({ P, d, t, B }) => {
      const sale = (P * (100 - d)) / 100, price = (P * (100 - d) * (100 + t)) / 10000, kits = Math.floor(B / price);
      return {
        brief: `Otra tienda vende el mismo kit a ${P} soles con un ${d} % de descuento, pero después cobra un ${t} % de impuesto sobre el precio rebajado. La escuela ahora tiene ${B} soles. Calcula el precio final de un kit y el máximo de kits completos.`,
        goals: ["Precio con descuento e impuesto", "Máximo de kits dentro del presupuesto"],
        checks: [([p]) => p === price, ([, k]) => k === kits],
        hints: [
          ([p]) =>
            p === (P * (100 - d + t)) / 100
              ? `Sumaste los porcentajes (−${d} % + ${t} %). El impuesto se calcula sobre el precio ya rebajado.`
              : p === sale
                ? `${p} soles es el precio con descuento; falta el impuesto.`
                : p === (P * (100 + t)) / 100
                  ? `${p} soles aplica el impuesto, pero no el descuento.`
                  : `${p} soles no es el precio final. Aplica el descuento y después el impuesto sobre el resultado.`,
          ([, k]) => (k > kits ? `${k} × ${price} = ${k * price} soles: supera los ${B}.` : `${k} × ${price} = ${k * price} soles: aún cabe otro kit.`),
        ],
        success: `${P} × ${n((100 - d) / 100)} = ${n(sale)} y ${n(sale)} × ${n((100 + t) / 100)} = ${price} soles. ${kits} kits cuestan ${kits * price} soles; ${kits + 1} costarían ${(kits + 1) * price}.`,
      };
    },
    solution: ({ P, d, t, B }) => {
      const price = (P * (100 - d) * (100 + t)) / 10000;
      return [price, Math.floor(B / price)];
    },
  }),

  "rescate-montana": family<{ m: Frac; H: number }>({
    canonical: { m: [3, 2], H: 18 },
    candidates: grid<{ m: Frac; H: number }>({ m: [[5, 4], [3, 2], [7, 4], [2, 1], [4, 3]], H: [12, 15, 16, 18, 20, 24, 30] }),
    valid: ({ m, H }) => {
      const work = of(m, 120);
      if (work === null) return false;
      const team = Math.ceil(work / H);
      // El menor equipo trabaja horas completas: no hay un equipo menor «casi» válido.
      return team >= 2 && team <= 12 && work % team === 0 && work / team <= 120 && team !== 12;
    },
    round: ({ m, H }) => {
      const work = of(m, 120)!, team = Math.ceil(work / H), hours = work / team;
      return {
        brief: `Un derrumbe alarga la ruta: ahora hay ${n(m[0] / m[1])} veces el trabajo de antes (8 rescatistas tardaban 15 horas). Una tormenta llega en ${H} horas. Todos trabajan al mismo ritmo y cada rescatista que sube corre riesgos: envía el menor equipo que termine a tiempo.`,
        goals: ["Tiempo coherente con el trabajo", "Ruta lista antes de la tormenta", "El menor equipo posible"],
        checks: [([p, h]) => p * h === work, ([, h]) => h <= H, ([p]) => p === team],
        hints: [
          ([p, h]) =>
            p * h === 120
              ? `Ese era el trabajo de la ruta original; ahora hay ${n(m[0] / m[1])} veces más.`
              : `${p} × ${h} = ${p * h} horas-persona no coincide con el trabajo de la nueva ruta.`,
          ([, h]) => `${h} horas es demasiado: la tormenta llega en ${H}.`,
          ([p]) => `${p} rescatistas terminan a tiempo, pero ¿bastaría con menos?`,
        ],
        success: `Trabajo: 8 × 15 × ${n(m[0] / m[1])} = ${work} horas-persona. Con ${H} horas como máximo, hacen falta ${work} ÷ ${H} ≈ ${n(work / H, 1)}, es decir, ${team} rescatistas, que terminan en ${hours} horas.`,
      };
    },
    solution: ({ m, H }) => {
      const work = of(m, 120)!, team = Math.ceil(work / H);
      return [team, work / team];
    },
  }),

  // Configuraciones con un único plan más barato (búsqueda exhaustiva previa).
  "feria-energia": family<{ K: number; S: number; cs: number; cl: number; sol: number[] }>({
    canonical: { K: 47, S: 14, cs: 300, cl: 800, sol: [6, 7] },
    candidates: [
      { K: 38, S: 11, cs: 200, cl: 550, sol: [4, 6] },
      { K: 41, S: 11, cs: 200, cl: 550, sol: [3, 7] },
      { K: 43, S: 11, cs: 200, cl: 550, sol: [4, 7] },
      { K: 47, S: 11, cs: 200, cl: 550, sol: [1, 9] },
      { K: 52, S: 11, cs: 200, cl: 550, sol: [1, 10] },
      { K: 55, S: 14, cs: 200, cl: 550, sol: [5, 9] },
      { K: 38, S: 13, cs: 250, cl: 700, sol: [9, 4] },
    ],
    round: ({ K, S, cs, cl, sol: [bp, bg] }) => ({
      brief: `Para la feria grande se necesitan al menos ${K} kW y caben como máximo ${S} generadores. Un generador pequeño (2 kW) cuesta ${cs} soles y uno grande (5 kW), ${cl} soles. Encuentra la combinación más barata.`,
      goals: [`Al menos ${K} kW`, `${S} generadores como máximo`, "El menor coste posible"],
      checks: [([p, g]) => 2 * p + 5 * g >= K, ([p, g]) => p + g <= S, ([p, g]) => cs * p + cl * g === cs * bp + cl * bg],
      hints: [
        ([p, g]) => `Producción: 2 × ${p} + 5 × ${g} = ${2 * p + 5 * g} kW. Faltan ${K - 2 * p - 5 * g} kW.`,
        ([p, g]) => `${p + g} generadores no caben: el espacio admite ${S}.`,
        ([p, g]) => `Cumple, con un coste de ${cs * p + cl * g} soles. ¿Hay una combinación válida más barata? Compara cuánto cuesta cada kW en cada tipo.`,
      ],
      success: `El kW pequeño cuesta ${n(cs / 2)} soles y el grande ${n(cl / 5)}, pero el espacio limita los pequeños. ${bp} pequeños y ${bg} grandes dan ${2 * bp + 5 * bg} kW con ${bp + bg} generadores por ${cs * bp + cl * bg} soles, el mínimo.`,
    }),
    solution: ({ sol }) => sol,
  }),

  "ruta-dron": family<{ bx: number; by: number; k: number; nearB: boolean }>({
    inputs: [input("x", "Coordenada x", 20), input("y", "Coordenada y", 20)],
    canonical: { bx: 12, by: 8, k: 3, nearB: true },
    candidates: grid<{ bx: number; by: number; k: number; nearB: boolean }>({ bx: [12, 16, 18, 20], by: [8, 12, 15, 16], k: [2, 3, 4], nearB: [true, false] }),
    valid: ({ bx, by, k }) => bx % (k + 1) === 0 && by % (k + 1) === 0 && bx !== by,
    round: ({ bx, by, k, nearB }) => {
      const share = nearB ? k : 1, x = (bx * share) / (k + 1), y = (by * share) / (k + 1);
      const [near, far] = nearB ? ["B", "A"] : ["A", "B"];
      return {
        brief: `Con carga, la batería del dron cambia el plan. La estación debe estar sobre la ruta recta de A(0, 0) a B(${bx}, ${by}) y ${k} veces más cerca de ${near} que de ${far}.`,
        goals: [`Sobre la ruta de A a B`, `${k} veces más cerca de ${near} que de ${far}`],
        checks: [([px, py]) => px * by === py * bx && px <= bx && py <= by, ([px, py]) => px === x && py === y],
        hints: [
          ([px, py]) => `El punto (${px}, ${py}) no está sobre el segmento AB. ¿Cuánto avanza y por cada unidad que avanza x en la ruta?`,
          ([px, py]) =>
            px * 2 === bx && py * 2 === by
              ? "El punto medio está a la misma distancia de A que de B."
              : `En (${px}, ${py}) la estación no está ${k} veces más cerca de ${near} que de ${far}. Divide la ruta en partes iguales.`,
        ],
        success: `${k} veces más cerca de ${near} significa partir la ruta en ${k + 1} partes iguales y recorrer ${share}/${k + 1} del camino desde A: (${share}/${k + 1} × ${bx}, ${share}/${k + 1} × ${by}) = (${x}, ${y}).`,
      };
    },
    solution: ({ bx, by, k, nearB }) => {
      const share = nearB ? k : 1;
      return [(bx * share) / (k + 1), (by * share) / (k + 1)];
    },
  }),

  "deposito-agua": family<{ dims: number[]; L0: number; pct: number }>({
    inputs: [input("volumen", "Capacidad", 30, "m³"), input("faltan", "Litros que faltan hasta el porcentaje", 15000, "L")],
    // Medidas en decímetros: el volumen sale entero en metros cúbicos.
    canonical: { dims: [25, 20, 16], L0: 2300, pct: 90 },
    candidates: grid<{ dims: number[]; L0: number; pct: number }>({
      dims: [[25, 20, 16], [15, 20, 20], [25, 24, 15], [30, 25, 12], [16, 25, 25], [20, 20, 25], [40, 25, 12]],
      L0: [1500, 2300, 3100],
      pct: [75, 80, 90],
    }),
    valid: ({ dims, L0, pct }) => {
      const volume = dims[0] * dims[1] * dims[2];
      return volume % 1000 === 0 && volume / 1000 !== 12 && volume * pct / 100 - L0 > 0;
    },
    round: ({ dims, L0, pct }) => {
      const volume = (dims[0] * dims[1] * dims[2]) / 1000, target = volume * 10 * pct, missing = target - L0;
      const m = dims.map((d) => n(d / 10)).join(" m × ");
      return {
        brief: `El nuevo depósito mide ${m} m y ya tiene ${L0} L. Para que no rebose con la lluvia, solo se llena hasta el ${pct} % de su capacidad. Calcula la capacidad en m³ y los litros que faltan hasta ese ${pct} %.`,
        goals: ["Capacidad del depósito", `Litros que faltan hasta el ${pct} %`],
        checks: [([v]) => v === volume, ([, l]) => l === missing],
        hints: [
          ([v]) => (v === 12 ? "12 m³ era el depósito anterior." : `${v} m³ no es el producto de las tres medidas.`),
          ([, l]) =>
            l === volume * 1000 - L0
              ? `Esos litros lo llenarían hasta el borde; solo se llena hasta el ${pct} %.`
              : l === target
                ? `${target} L es el ${pct} % de la capacidad, pero ya hay agua dentro.`
                : `${l} L no es lo que falta. Convierte la capacidad a litros, toma el ${pct} % y descuenta lo que ya hay.`,
        ],
        success: `${dims.map((d) => n(d / 10)).join(" × ")} = ${volume} m³ = ${volume * 1000} L. El ${pct} % son ${target} L; faltan ${target} − ${L0} = ${missing} L.`,
      };
    },
    solution: ({ dims, L0, pct }) => {
      const volume = (dims[0] * dims[1] * dims[2]) / 1000;
      return [volume, volume * 10 * pct - L0];
    },
  }),

  "puente-valle": family<{ a: number; b: number; c: number; s: number }>({
    inputs: [input("diagonal", "Longitud de la pasarela", 50, "m"), input("piezas", "Piezas", 20)],
    canonical: { a: 21, b: 20, c: 29, s: 3 },
    candidates: grid<{ t: number[]; s: number }>({
      t: [[21, 20, 29], [35, 12, 37], [40, 9, 41], [24, 7, 25], [15, 8, 17], [30, 16, 34], [20, 15, 25], [32, 24, 40], [24, 10, 26]],
      s: [2, 3, 4, 5],
    }).map(({ t: [a, b, c], s }) => ({ a, b, c, s })),
    valid: ({ c, s }) => c % s !== 0 && Math.ceil(c / s) <= 20 && c <= 50,
    round: ({ a, b, c, s }) => {
      const pieces = Math.ceil(c / s);
      return {
        brief: `En el valle grande, la orilla de llegada está ${a} m más abajo y a ${b} m en horizontal. La pasarela baja en línea recta y solo hay piezas de ${s} m (la última se puede recortar). Calcula la longitud de la pasarela y las piezas necesarias.`,
        goals: ["Longitud de la pasarela", `Piezas de ${s} m necesarias`],
        checks: [([d]) => d === c, ([, p]) => p === pieces],
        hints: [
          ([d]) =>
            d === a + b
              ? "Sumaste los dos tramos: la línea recta es más corta que el camino en ángulo recto."
              : `Con ${d} m, ${d}² = ${d * d}, que no coincide con ${a}² + ${b}².`,
          ([, p]) => (p * s < c ? `${p} piezas cubren ${p * s} m: no llegan.` : `Con ${p} piezas sobra al menos una entera.`),
        ],
        success: `${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c} = ${c}²: la pasarela mide ${c} m. ${c} ÷ ${s} ≈ ${n(c / s, 1)}, así que hacen falta ${pieces} piezas y se recorta la última.`,
      };
    },
    solution: ({ c, s }) => [c, Math.ceil(c / s)],
  }),

  // Configuraciones con una única bolsa de mayor probabilidad (búsqueda previa).
  "tombola-solidaria": family<{ pr: number; c: number; lo: number; hi: number; G: number; sol: number[] }>({
    canonical: { pr: 2, c: 4, lo: 20, hi: 30, G: 15, sol: [11, 19] },
    candidates: [
      { pr: 2, c: 4, lo: 20, hi: 30, G: 10, sol: [12, 17] },
      { pr: 2, c: 4, lo: 15, hi: 25, G: 10, sol: [10, 15] },
      { pr: 2, c: 5, lo: 15, hi: 25, G: 10, sol: [8, 17] },
      { pr: 2, c: 6, lo: 20, hi: 30, G: 10, sol: [7, 19] },
      { pr: 2, c: 5, lo: 20, hi: 30, G: 20, sol: [6, 19] },
      { pr: 3, c: 4, lo: 20, hi: 30, G: 15, sol: [18, 11] },
      { pr: 3, c: 4, lo: 15, hi: 25, G: 10, sol: [16, 9] },
    ],
    round: ({ pr, c, lo, hi, G, sol: [bp, bs] }) => {
      const total = bp + bs;
      return {
        brief: `Para recaudar fondos, cada boleto se vende a ${pr} soles y cada premio cuesta ${c}. La bolsa debe tener entre ${lo} y ${hi} boletos, y la ganancia (lo vendido menos los premios) debe ser al menos ${G} soles. Para que la tómbola sea atractiva, busca la mayor probabilidad de ganar posible.`,
        goals: [`Entre ${lo} y ${hi} boletos`, `Ganancia de al menos ${G} soles`, "La mayor probabilidad de premio"],
        checks: [
          ([p, s]) => p + s >= lo && p + s <= hi,
          ([p, s]) => pr * (p + s) - c * p >= G,
          ([p, s]) => p === bp && s === bs,
        ],
        hints: [
          ([p, s]) => `La bolsa tiene ${p + s} boletos.`,
          ([p, s]) => `Ganancia: ${pr} × ${p + s} − ${c} × ${p} = ${pr * (p + s) - c * p} soles.`,
          ([p, s]) => `Probabilidad de premio: ${p}/${p + s} ≈ ${n((100 * p) / (p + s), 1)} %. ¿Hay una bolsa válida con más probabilidad?`,
        ],
        success: `Con ${total} boletos caben hasta ${bp} premios (${pr * total} − ${c * bp} = ${pr * total - c * bp} soles de ganancia): ${bp}/${total} ≈ ${n((100 * bp) / total, 1)} %. Ninguna otra bolsa válida da más probabilidad.`,
      };
    },
    solution: ({ sol }) => sol,
  }),

  "alerta-meteorologica": family<{ D: number; R: number; A: number; K: number }>({
    inputs: [input("falsas", "Alertas sin lluvia", 40), input("porcentaje", "Lluvia cuando hubo alerta", 100, "%")],
    canonical: { D: 60, R: 25, A: 30, K: 18 },
    candidates: grid<{ D: number; R: number; A: number; K: number }>({ D: [60, 90], R: [20, 25, 30, 40], A: [20, 25, 30, 40, 50], K: [9, 12, 15, 16, 18, 20, 24] }),
    valid: ({ D, R, A, K }) =>
      K <= R && K < A && A - K <= 40 && (100 * K) % A === 0 && (100 * K) / A !== (100 * K) / R && D - R >= A - K,
    round: ({ D, R, A, K }) => {
      const pct = (100 * K) / A;
      return {
        brief: `Informe del año siguiente: en ${D} días hubo ${R} días de lluvia y se emitieron ${A} alertas. ${K} alertas acertaron (llovió ese día). Calcula cuántas alertas fueron falsas y qué porcentaje de las alertas terminó en lluvia.`,
        goals: ["Alertas falsas", "Lluvia cuando hubo alerta"],
        checks: [([x]) => x === A - K, ([, p]) => p === pct],
        hints: [
          ([x]) =>
            x === R - K
              ? `${x} son los días de lluvia sin alerta. Se piden las alertas sin lluvia.`
              : `${x} no es el número de alertas sin lluvia. Separa las ${A} alertas en acertadas y falsas.`,
          ([, p]) =>
            p * R === 100 * K
              ? `${p} % es la proporción de días lluviosos con alerta. Ahora el grupo de referencia son los días con alerta.`
              : p * D === 100 * K
                ? `${p} % compara con los ${D} días. El grupo de referencia son los días con alerta.`
                : `${p} % no es la proporción de alertas que acabaron en lluvia.`,
        ],
        success: `Alertas falsas: ${A} − ${K} = ${A - K}. P(lluvia | alerta) = ${K}/${A} = ${pct} %, distinto de P(alerta | lluvia) = ${K}/${R} ≈ ${n((100 * K) / R, 1)} %.`,
      };
    },
    solution: ({ A, K }) => [A - K, (100 * K) / A],
  }),

  "ahorro-observatorio": family<{ C: number; s: number; c: number }>({
    inputs: [input("ano", "Año en que la compuesta supera a la simple", 20), input("simple", "Saldo de la cuenta simple ese año", 3000, "soles")],
    canonical: { C: 1000, s: 12, c: 10 },
    candidates: grid<{ C: number; s: number; c: number }>({ C: [500, 1000, 1500], s: [8, 9, 10, 12, 15], c: [5, 6, 7, 8, 10, 12] }),
    valid: ({ C, s, c }) => {
      if (c >= s) return false;
      const year = firstYear(C, s, c);
      return year !== null && year >= 3 && C + (C * s * year) / 100 <= 3000 && Number.isInteger((C * s * year) / 100);
    },
    round: ({ C, s, c }) => {
      const year = firstYear(C, s, c)!, simple = (y: number) => C + (C * s * y) / 100, compound = (y: number) => C * (1 + c / 100) ** y;
      return {
        brief: `Un banco ofrece un ${s} % de interés simple anual sobre ${C} soles; otro, un ${c} % compuesto. La cuenta compuesta empieza ganando menos. ¿En qué año el saldo compuesto supera por primera vez al simple? ¿Cuánto tiene la cuenta simple ese año?`,
        goals: ["Primer año en que gana la compuesta", "Saldo de la cuenta simple"],
        checks: [([a]) => a === year, ([, v]) => v === simple(year)],
        hints: [
          ([a]) =>
            a === 0
              ? `Al empezar, ambas cuentas tienen ${C} soles.`
              : a < year
                ? `En el año ${a}, la simple tiene ${n(simple(a))} soles y la compuesta ${n(compound(a))}: todavía gana la simple.`
                : `En el año ${a} ya gana la compuesta, pero no es la primera vez.`,
          ([, v]) =>
            Math.abs(v - compound(year)) < 1
              ? "Ese es el saldo de la cuenta compuesta. Se pide el de la simple."
              : `La cuenta simple suma lo mismo cada año: ${v} soles no corresponde a ese año.`,
        ],
        success: `Simple: ${C} + ${(C * s) / 100} × n. Compuesta: ${C} × ${n(1 + c / 100)}ⁿ. En el año ${year - 1}, ${n(simple(year - 1))} frente a ${n(compound(year - 1))}; en el año ${year}, ${n(simple(year))} frente a ${n(compound(year))}. El interés compuesto acaba ganando.`,
      };
    },
    solution: ({ C, s, c }) => {
      const year = firstYear(C, s, c)!;
      return [year, C + (C * s * year) / 100];
    },
  }),

  "trayectoria-cohete": family<{ b: number; t1: number }>({
    inputs: [input("maxima", "Altura máxima", 40, "m"), input("sube", "Segundo en que sube a la altura segura", 12, "s"), input("baja", "Segundo en que baja a la altura segura", 12, "s")],
    canonical: { b: 10, t1: 2 },
    candidates: [10, 12].flatMap((b) => Array.from({ length: b / 2 - 1 }, (_, i) => ({ b, t1: i + 1 }))),
    round: ({ b, t1 }) => {
      const t2 = b - t1, safe = t1 * t2, top = (b / 2) ** 2, h = (t: number) => b * t - t * t;
      return {
        brief: `Un cohete más potente sigue h(t) = −t² + ${b}t, con h en metros y t en segundos. El paracaídas solo se abre con seguridad a ${safe} m o más. Calcula su altura máxima y entre qué segundos está a ${safe} m o más.`,
        goals: ["Altura máxima", `Momento en que sube a ${safe} m`, `Momento en que baja a ${safe} m`],
        checks: [([m]) => m === top, ([, s]) => s === t1, ([, , d]) => d === t2],
        hints: [
          ([m]) => (m === 16 ? "16 m era la altura máxima del primer cohete." : `${m} m no es la altura del vértice. ¿En qué segundo vuelve a tocar el suelo?`),
          ([, s]) => `En t = ${s}, h = ${h(s)} m.`,
          ([, s, d]) => (d === s ? `Ese es el momento en que sube. ¿Cuándo vuelve a pasar por ${safe} m al bajar?` : `En t = ${d}, h = ${h(d)} m.`),
        ],
        success: `Despega en t = 0 y aterriza en t = ${b}, así que el vértice está en t = ${b / 2}: h(${b / 2}) = ${top} m. −t² + ${b}t = ${safe} da t = ${t1} y t = ${t2}, simétricos respecto a t = ${b / 2}.`,
      };
    },
    solution: ({ b, t1 }) => [(b / 2) ** 2, t1, b - t1],
  }),
};

/** Primer año en que el interés compuesto supera claramente al simple
 *  (sin empates por redondeo). */
function firstYear(C: number, s: number, c: number) {
  for (let y = 1; y <= 20; y++) {
    const diff = C * (1 + c / 100) ** y - (C + (C * s * y) / 100);
    if (Math.abs(diff) < 0.5) return null;
    if (diff > 0) return y;
  }
  return null;
}

export function getExpertChallenge(id: string): ExpertChallenge | undefined {
  return EXPERT_CHALLENGES[id];
}
