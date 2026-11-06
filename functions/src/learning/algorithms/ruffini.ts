/**
 * Regla de Ruffini: división de un polinomio entre (x − r). En la esquina va
 * r, arriba los coeficientes en orden de grado (con 0 en los términos que
 * faltan); se baja el primero y en cada columna se multiplica r por lo de
 * abajo de la anterior y se suma. La última casilla es el resto, que por el
 * teorema del resto vale P(r).
 *
 * El alumno escribe toda la tabla (esquina, coeficientes, productos y
 * sumas) y se valida casilla a casilla.
 *
 * Puro: sin React ni Firebase, compartido por Functions y el navegador.
 */

export interface RuffiniSpec {
  op: "ruffini";
  /** Coeficientes de mayor a menor grado, con 0 donde falte un término. */
  coefficients: number[];
  /** Se divide entre (x − root). */
  root: number;
}

export interface RuffiniStep {
  column: number;
  coefficient: number;
  /** root × resultado de la columna anterior (null en la primera). */
  product: number | null;
  result: number;
  ask: string;
  why: string;
}

export interface RuffiniTrace {
  spec: RuffiniSpec;
  steps: RuffiniStep[];
  quotient: number[];
  remainder: number;
}

/** Con el signo menos tipográfico. */
export const sg = (n: number) => (n < 0 ? `−${-n}` : String(n));
const par = (n: number) => (n < 0 ? `(−${-n})` : String(n));
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const power = (k: number) => (k === 0 ? "" : k === 1 ? "x" : `x${String(k).split("").map((d) => SUP[Number(d)]).join("")}`);

/** «2x³ − 3x² + 5» (los términos con coeficiente 0 no se escriben). */
export function polynomialText(coefficients: number[], variable = true): string {
  const n = coefficients.length - 1;
  const terms = coefficients
    .map((c, i) => ({ c, k: n - i }))
    .filter((t) => t.c !== 0)
    .map(({ c, k }, i) => {
      const abs = Math.abs(c);
      const body = k === 0 ? String(abs) : `${abs === 1 ? "" : abs}${variable ? power(k) : ""}`;
      return i === 0 ? (c < 0 ? `−${body}` : body) : `${c < 0 ? "−" : "+"} ${body}`;
    });
  return terms.length ? terms.join(" ") : "0";
}
export const divisorText = (root: number) => (root === 0 ? "x" : root > 0 ? `x − ${root}` : `x + ${-root}`);
/** Nombre de la casilla de un coeficiente: «x²», «x», «término independiente». */
export const termName = (degree: number, column: number) =>
  degree - column === 0 ? "término independiente" : power(degree - column);

export function validRuffiniSpec(spec: RuffiniSpec): boolean {
  return (
    spec.op === "ruffini" &&
    spec.coefficients.length >= 2 &&
    spec.coefficients.length <= 7 &&
    spec.coefficients[0] !== 0 &&
    spec.coefficients.every((c) => Number.isInteger(c) && Math.abs(c) <= 99) &&
    Number.isInteger(spec.root) &&
    Math.abs(spec.root) <= 9
  );
}

export function ruffiniTrace(spec: RuffiniSpec): RuffiniTrace {
  if (!validRuffiniSpec(spec)) throw new Error(`Ruffini no válido: ${JSON.stringify(spec)}`);
  const { coefficients: cs, root: r } = spec;
  const steps: RuffiniStep[] = [];
  cs.forEach((c, i) => {
    if (i === 0) {
      steps.push({
        column: 0,
        coefficient: c,
        product: null,
        result: c,
        ask: "¿Qué número bajas en la primera columna?",
        why: `Se baja el primer coeficiente: ${sg(c)}.`,
      });
      return;
    }
    const prev = steps[i - 1].result;
    const product = r * prev;
    const result = c + product;
    const last = i === cs.length - 1;
    steps.push({
      column: i,
      coefficient: c,
      product,
      result,
      ask: `Multiplica ${sg(r)} por ${sg(prev)} y súmalo a ${sg(c)}.`,
      why: `${sg(r)} × ${par(prev)} = ${sg(product)}; ${sg(c)} + ${par(product)} = ${sg(result)}.${last ? ` Es el resto.` : ""}`,
    });
  });
  const results = steps.map((s) => s.result);
  return { spec, steps, quotient: results.slice(0, -1), remainder: results.at(-1)! };
}

export const ruffiniRemainder = (spec: RuffiniSpec) => ruffiniTrace(spec).remainder;

export function ruffiniExpression(spec: RuffiniSpec): string {
  return `(${polynomialText(spec.coefficients)}) ÷ (${divisorText(spec.root)})`;
}

export function ruffiniSolution(spec: RuffiniSpec): string[] {
  const t = ruffiniTrace(spec);
  const missing = spec.coefficients.some((c) => c === 0);
  return [
    `En la esquina va ${sg(spec.root)}, porque ${divisorText(spec.root)} = 0 cuando x = ${sg(spec.root)}. Arriba, los coeficientes en orden: ${spec.coefficients.map(sg).join(", ")}${missing ? " (con 0 en los términos que faltan)" : ""}.`,
    ...t.steps.map((s) => s.why),
    `Cociente: ${polynomialText(t.quotient)}; resto: ${sg(t.remainder)}. Comprobación (teorema del resto): P(${sg(spec.root)}) = ${sg(t.remainder)}.`,
  ];
}

export function ruffiniHints(spec: RuffiniSpec): [string, string, string] {
  const t = ruffiniTrace(spec);
  return [
    `En la esquina va el número que anula el divisor: ${divisorText(spec.root)} = 0 → x = ${sg(spec.root)}. Baja el primer coeficiente; luego multiplica por la esquina y suma, columna por columna.`,
    t.steps[1].why,
    `La fila de abajo empieza ${t.steps.slice(0, -1).map((s) => sg(s.result)).join(", ")}…: solo falta la última casilla, el resto.`,
  ];
}

export interface RuffiniBug {
  id: "signo-esquina" | "sin-cero";
  value: number;
  feedback: string;
}

/** Errores típicos reconocibles por el resto que producen. (Restar en lugar
 *  de sumar da el mismo resto que cambiar el signo de la esquina: solo la
 *  tabla casilla a casilla los distingue, ver `ruffiniWorkFeedback`.) */
export function ruffiniBugs(spec: RuffiniSpec): RuffiniBug[] {
  const run = (cs: number[], r: number, op: (a: number, b: number) => number) =>
    cs.reduce((acc, c, i) => (i === 0 ? c : op(c, r * acc)), 0);
  const bugs: RuffiniBug[] = [
    {
      id: "signo-esquina",
      value: run(spec.coefficients, -spec.root, (a, b) => a + b),
      feedback: `En la esquina va ${sg(spec.root)}, el valor que anula ${divisorText(spec.root)}; con ${sg(-spec.root)} se divide entre (${divisorText(-spec.root)}).`,
    },
  ];
  if (spec.coefficients.some((c) => c === 0) && spec.coefficients.length > 2) {
    const dense = spec.coefficients.filter((c, i) => c !== 0 || i === spec.coefficients.length - 1);
    bugs.push({
      id: "sin-cero",
      value: run(dense, spec.root, (a, b) => a + b),
      feedback: "Falta un término en el polinomio: en la tabla hay que escribir 0 en su lugar para que cada coeficiente quede en su columna.",
    });
  }
  const seen = new Set([ruffiniRemainder(spec)]);
  return bugs.filter((b) => (seen.has(b.value) ? false : (seen.add(b.value), true)));
}

// ── Tabla escrita por el alumno ─────────────────────────────────────────

/** «R2|2,-3,0,5|4,2,4|2,1,2,9»: esquina | coeficientes | productos | sumas. */
export function encodeRuffiniWork(root: string, coefficients: string[], products: string[], results: string[]): string {
  return `R${root}|${coefficients.join(",")}|${products.join(",")}|${results.join(",")}`;
}

export interface RuffiniWorkCheck {
  remainder: number;
  /** Lo que escribió el alumno en la primera casilla incorrecta. */
  given: number | null;
  /** Primera casilla incorrecta, en el orden en que se escribe. */
  firstError: { kind: "root" | "coefficient" | "product" | "result"; column: number } | null;
  correct: boolean;
}

const num = (text: string) => (/^[−-]?\d+$/.test(text) ? Number(text.replace("−", "-")) : Number.NaN);

export function checkRuffiniWork(spec: RuffiniSpec, response: string): RuffiniWorkCheck | null {
  const parts = response.trim().split("|");
  if (parts.length !== 4 || !parts[0].startsWith("R")) return null;
  const n = spec.coefficients.length;
  const root = num(parts[0].slice(1));
  const cs = parts[1].split(",").map(num), ps = parts[2].split(",").map(num), rs = parts[3].split(",").map(num);
  if (cs.length !== n || ps.length !== n - 1 || rs.length !== n) return null;
  const t = ruffiniTrace(spec);
  const order: RuffiniWorkCheck["firstError"][] = [{ kind: "root", column: 0 }];
  for (let i = 0; i < n; i++) order.push({ kind: "coefficient", column: i });
  for (let i = 0; i < n; i++) {
    if (i > 0) order.push({ kind: "product", column: i });
    order.push({ kind: "result", column: i });
  }
  const given = (e: NonNullable<RuffiniWorkCheck["firstError"]>) =>
    e.kind === "root" ? root : e.kind === "coefficient" ? cs[e.column] : e.kind === "product" ? ps[e.column - 1] : rs[e.column];
  const expected = (e: NonNullable<RuffiniWorkCheck["firstError"]>) =>
    e.kind === "root" ? spec.root : e.kind === "coefficient" ? spec.coefficients[e.column] : e.kind === "product" ? t.steps[e.column].product! : t.steps[e.column].result;
  const firstError = order.find((e) => given(e!) !== expected(e!)) ?? null;
  return { remainder: rs[n - 1], given: firstError ? given(firstError) : null, firstError, correct: firstError === null };
}

export function ruffiniWorkFeedback(spec: RuffiniSpec, check: RuffiniWorkCheck): string | null {
  const e = check.firstError;
  if (!e) return null;
  const t = ruffiniTrace(spec);
  const degree = spec.coefficients.length - 1;
  if (e.kind === "root")
    return `En la esquina va el número que anula el divisor: ${divisorText(spec.root)} = 0 cuando x = ${sg(spec.root)}.`;
  if (e.kind === "coefficient")
    return spec.coefficients[e.column] === 0
      ? `Falta el término de ${termName(degree, e.column)}: escribe 0 en su columna.`
      : `Revisa el coeficiente de ${termName(degree, e.column)}: copia los coeficientes en orden de grado, con su signo.`;
  const prev = t.steps[e.column - 1]?.result;
  if (e.kind === "product") return `Revisa la columna ${e.column + 1}: multiplica la esquina (${sg(spec.root)}) por ${sg(prev!)}, el número de abajo de la columna anterior.`;
  const step = t.steps[e.column];
  if (e.column === 0) return "En la primera columna se baja el primer coeficiente tal cual.";
  const subtracted = check.given === step.coefficient - step.product!;
  return subtracted
    ? `En la columna ${e.column + 1} se suma: ${sg(step.coefficient)} + ${par(step.product!)}, no se resta.`
    : `Revisa la suma de la columna ${e.column + 1}: ${sg(step.coefficient)} + ${par(step.product!)}.`;
}

/** La tabla completa y correcta. */
export function ruffiniWorkResponse(spec: RuffiniSpec): string {
  const t = ruffiniTrace(spec);
  return encodeRuffiniWork(
    String(spec.root),
    spec.coefficients.map(String),
    t.steps.slice(1).map((s) => String(s.product)),
    t.steps.map((s) => String(s.result)),
  );
}
