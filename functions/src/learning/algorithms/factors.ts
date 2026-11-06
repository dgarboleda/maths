/**
 * MCD y MCM con la tabla de descomposición simultánea en factores primos:
 * los números a la izquierda y, a la derecha de la raya, el primo que divide
 * en cada fila. El MCM es el producto de todos los primos de la tabla; el
 * MCD, el de los que dividen a todos los números a la vez.
 *
 * El alumno escribe toda la tabla. Se acepta cualquier orden de primos (no
 * solo de menor a mayor) siempre que cada fila esté bien dividida. La tabla
 * del MCM termina con todos en 1; la del MCD, cuando no queda ningún primo
 * común (o también en 1, si se usaron primos que no dividen a todos).
 *
 * Puro: sin React ni Firebase, compartido por Functions y el navegador.
 */
import { fmt } from "./columns";

export interface FactorSpec {
  op: "mcd" | "mcm";
  /** De 2 a 3 números naturales, cada uno entre 2 y 9 999. */
  values: number[];
}

export interface FactorRow {
  /** Números al empezar la fila. */
  values: number[];
  prime: number;
  /** Lo que queda debajo: cociente si el primo divide, el mismo número si no. */
  next: number[];
  /** El primo divide a todos: cuenta para el MCD. */
  common: boolean;
  ask: string;
  why: string;
}

export interface FactorTrace {
  spec: FactorSpec;
  rows: FactorRow[];
  mcd: number;
  mcm: number;
}

export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

export function validFactorSpec(spec: FactorSpec): boolean {
  return (
    (spec.op === "mcd" || spec.op === "mcm") &&
    spec.values.length >= 2 &&
    spec.values.length <= 3 &&
    spec.values.every((v) => Number.isInteger(v) && v >= 2 && v < 10_000) &&
    // La tabla del MCD necesita al menos un primo común: con números primos
    // entre sí no hay ninguna fila que escribir (el MCD es 1 sin tabla).
    (spec.op === "mcm" || gcdOf(spec.values) > 1)
  );
}

const list = (values: number[]) =>
  values.length === 1 ? String(values[0]) : `${values.slice(0, -1).join(", ")} y ${values.at(-1)}`;

const gcd2 = (a: number, b: number): number => (b ? gcd2(b, a % b) : a);
/** MCD de varios números (aritmético, para comprobar la tabla). */
export const gcdOf = (values: number[]) => values.reduce(gcd2);
/** MCM de varios números. */
export const lcmOf = (values: number[]) => values.reduce((a, b) => (a / gcd2(a, b)) * b);

/**
 * La tabla según lo que se busca. MCM: se divide entre el menor primo que
 * divida a alguno hasta que todos queden en 1. MCD: solo entre primos que
 * dividan a todos, hasta que ya no quede ningún divisor común (los números
 * quedan primos entre sí); no hace falta llegar a 1.
 */
export function factorTrace(spec: FactorSpec): FactorTrace {
  if (!validFactorSpec(spec)) throw new Error(`Tabla no válida: ${JSON.stringify(spec)}`);
  const rows: FactorRow[] = [];
  let values = [...spec.values];
  const onlyCommon = spec.op === "mcd";
  while (onlyCommon ? gcdOf(values) > 1 : values.some((v) => v > 1)) {
    let prime = 2;
    while (onlyCommon ? !values.every((v) => v % prime === 0) : !values.some((v) => v % prime === 0)) prime++;
    const divided = values.filter((v) => v % prime === 0);
    const next = values.map((v) => (v % prime === 0 ? v / prime : v));
    const common = divided.length === values.length;
    const kept = values.filter((v) => v % prime !== 0 && v > 1);
    rows.push({
      values,
      prime,
      next,
      common,
      ask: onlyCommon
        ? `¿Qué primo divide a la vez a ${list(values)}?`
        : `¿Cuál es el menor primo que divide a alguno de ${list(values.filter((v) => v > 1))}?`,
      why:
        `${prime} divide a ${list(divided)}: debajo escribes ${list(divided.map((v) => v / prime))}` +
        (kept.length ? ` y bajas sin cambiar ${list(kept)}` : "") +
        `. ${common ? `Divide a todos: ${prime} cuenta para el MCD.` : "No divide a todos: solo cuenta para el MCM."}` +
        (onlyCommon && gcdOf(next) === 1 ? ` ${list(next)} ya no tienen ningún divisor común: la tabla termina.` : ""),
    });
    values = next;
  }
  return { spec, rows, mcd: gcdOf(spec.values), mcm: lcmOf(spec.values) };
}

export const factorAnswer = (spec: FactorSpec) => {
  const t = factorTrace(spec);
  return spec.op === "mcd" ? t.mcd : t.mcm;
};

export function factorExpression(spec: FactorSpec): string {
  return `${spec.op === "mcd" ? "MCD" : "MCM"}(${spec.values.map(fmt).join("; ")})`;
}

const product = (primes: number[]) => (primes.length ? primes.join(" × ") : "1");

export function factorSolution(spec: FactorSpec): string[] {
  const t = factorTrace(spec);
  const all = t.rows.map((r) => r.prime);
  const commons = t.rows.filter((r) => r.common).map((r) => r.prime);
  return [
    spec.op === "mcd"
      ? `Escribe ${list(spec.values)} a la izquierda de la raya y divide entre primos que dividan a todos a la vez, hasta que no quede ningún divisor común.`
      : `Escribe ${list(spec.values)} a la izquierda de la raya y divide entre primos, empezando por el menor, hasta que todos queden en 1.`,
    ...t.rows.map((r) => r.why),
    spec.op === "mcm"
      ? `MCM: el producto de todos los primos de la tabla, ${product(all)} = ${fmt(t.mcm)}. Comprobación: ${fmt(t.mcm)} es múltiplo de ${list(spec.values)}.`
      : `MCD: el producto de los primos que dividieron a todos, ${product(commons)} = ${fmt(t.mcd)}. Comprobación: ${fmt(t.mcd)} divide a ${list(spec.values)}.`,
  ];
}

export function factorHints(spec: FactorSpec): [string, string, string] {
  const t = factorTrace(spec);
  return [
    spec.op === "mcm"
      ? "Divide los números a la vez entre primos hasta que todos sean 1. El MCM es el producto de todos los primos de la derecha."
      : "Divide entre primos que dividan a todos los números a la vez, hasta que no quede ningún divisor común. El MCD es el producto de esos primos.",
    t.rows[0].why,
    spec.op === "mcd"
      ? `Los primos comunes son ${product(t.rows.map((r) => r.prime))}: multiplícalos.`
      : `Los primos de la tabla son ${product(t.rows.map((r) => r.prime))}: multiplícalos todos.`,
  ];
}

export interface FactorBug {
  id: "producto" | "mcd-por-mcm" | "mcm-por-mcd";
  value: number;
  feedback: string;
}

/** Errores típicos reconocibles por el número que se responde. */
export function factorBugs(spec: FactorSpec): FactorBug[] {
  const t = factorTrace(spec);
  const answer = spec.op === "mcd" ? t.mcd : t.mcm;
  const bugs: FactorBug[] = [];
  if (spec.op === "mcm")
    bugs.push(
      {
        id: "producto",
        value: spec.values.reduce((p, v) => p * v, 1),
        feedback: `Multiplicaste los números: es un múltiplo común, pero no el menor. Los factores que comparten se cuentan una sola vez.`,
      },
      { id: "mcm-por-mcd", value: t.mcd, feedback: "Ese es el MCD: el producto de los primos que dividen a todos. Para el MCM se multiplican todos los primos de la tabla." },
    );
  else
    bugs.push({
      id: "mcd-por-mcm",
      value: t.mcm,
      feedback: "Ese es el MCM: multiplicaste todos los primos. Para el MCD solo cuentan las filas en que el primo divide a todos los números.",
    });
  const seen = new Set([answer]);
  return bugs.filter((b) => (seen.has(b.value) ? false : (seen.add(b.value), true)));
}

// ── Tabla escrita por el alumno ─────────────────────────────────────────

/** «T36;2:6.9|2:3.9|3:1.3|3:1.1» → respuesta 36 y cada fila (primo: números de debajo). */
export function encodeFactorWork(answer: string, rows: { prime: string; next: string[] }[]): string {
  return `T${answer};${rows.map((r) => `${r.prime}:${r.next.join(".")}`).join("|")}`;
}

export interface FactorWorkCheck {
  answer: number;
  /** Primer fallo de la tabla (fila desde 1), o null si la tabla es válida. */
  problem: { row: number; kind: "primo" | "no-divide" | "cociente" | "incompleta" | "queda-comun" } | null;
  /** El número que corresponde a la tabla escrita. */
  fromTable: number | null;
  correct: boolean;
}

/**
 * Revisa la tabla escrita. MCM: hasta que todos queden en 1. MCD: vale la
 * tabla de solo divisores comunes (termina cuando no queda ninguno común) y
 * también la completa hasta 1, multiplicando solo las filas comunes.
 */
export function checkFactorWork(spec: FactorSpec, response: string): FactorWorkCheck | null {
  const m = /^T(\d+);((?:\d+:\d+(?:\.\d+)*)(?:\|\d+:\d+(?:\.\d+)*)*)$/.exec(response.trim());
  if (!m) return null;
  const answer = Number(m[1]);
  const rows = m[2].split("|").map((r) => {
    const [p, rest] = r.split(":");
    return { prime: Number(p), next: rest.split(".").map(Number) };
  });
  let values = [...spec.values];
  let mcm = 1, mcd = 1, allCommon = true;
  for (const [i, r] of rows.entries()) {
    const row = i + 1;
    const fail = (kind: NonNullable<FactorWorkCheck["problem"]>["kind"]) => ({ answer, problem: { row, kind }, fromTable: null, correct: false });
    if (!isPrime(r.prime)) return fail("primo");
    if (r.next.length !== values.length) return fail("cociente");
    if (!values.some((v) => v % r.prime === 0)) return fail("no-divide");
    const expected = values.map((v) => (v % r.prime === 0 ? v / r.prime : v));
    if (expected.some((v, k) => v !== r.next[k])) return fail("cociente");
    mcm *= r.prime;
    if (values.every((v) => v % r.prime === 0)) mcd *= r.prime;
    else allCommon = false;
    values = expected;
  }
  const commonDone = spec.op === "mcd" && allCommon && gcdOf(values) === 1;
  if (!commonDone && values.some((v) => v > 1)) {
    const kind = spec.op === "mcd" && allCommon ? "queda-comun" : "incompleta";
    return { answer, problem: { row: rows.length, kind }, fromTable: null, correct: false };
  }
  const fromTable = spec.op === "mcd" ? mcd : mcm;
  return { answer, problem: null, fromTable, correct: answer === fromTable && fromTable === factorAnswer(spec) };
}

export function factorWorkFeedback(spec: FactorSpec, check: FactorWorkCheck): string | null {
  const p = check.problem;
  if (p?.kind === "primo") return `Revisa la fila ${p.row}: a la derecha solo van números primos (2, 3, 5, 7…).`;
  if (p?.kind === "no-divide") return `Revisa la fila ${p.row}: ese primo no divide a ninguno de los números de esa fila.`;
  if (p?.kind === "cociente") return `Revisa la fila ${p.row}: divide los números que se puedan entre el primo y baja sin cambiar los que no.`;
  if (p?.kind === "queda-comun")
    return "Todavía queda un divisor común: sigue dividiendo entre un primo que divida a todos los números de la última fila.";
  if (p?.kind === "incompleta")
    return spec.op === "mcd"
      ? "La tabla no ha terminado. Para el MCD basta con dividir entre los primos que dividen a todos, hasta que no quede ninguno común; si usas primos que no dividen a todos, sigue hasta que todos sean 1."
      : "La tabla no ha terminado: sigue dividiendo hasta que todos los números sean 1.";
  if (check.fromTable !== null && check.answer !== check.fromTable)
    return spec.op === "mcd"
      ? "La tabla está bien. Para el MCD multiplica solo los primos de las filas que dividieron a todos los números (no todos los de la derecha: eso da el MCM)."
      : "La tabla está bien. Para el MCM multiplica todos los primos de la derecha.";
  return null;
}

/** La tabla completa y correcta (de menor a mayor primo). */
export function factorWorkResponse(spec: FactorSpec): string {
  const t = factorTrace(spec);
  return encodeFactorWork(
    String(spec.op === "mcd" ? t.mcd : t.mcm),
    t.rows.map((r) => ({ prime: String(r.prime), next: r.next.map(String) })),
  );
}
