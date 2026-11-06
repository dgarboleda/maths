/**
 * División larga («galera»): el dividendo a la izquierda, el divisor a la
 * derecha y el cociente debajo del divisor. Se reparte de izquierda a
 * derecha: cabe, multiplica, resta y baja la cifra siguiente. Un solo
 * trazado alimenta el ejemplo, las pistas, la hoja y el diagnóstico (los
 * errores típicos se reconocen por el cociente que producen).
 *
 * Puro: sin React ni Firebase, compartido por Functions y el navegador.
 */
import { fmt } from "./columns";

/** «Completa»: se escribe cada producto y se resta debajo. «Abreviada»: la
 *  resta se hace de memoria y solo se escribe lo que sobra. */
export type DivisionLayout = "completa" | "abreviada";
export const DIVISION_LAYOUTS: readonly { id: DivisionLayout; label: string }[] = [
  { id: "completa", label: "Escribir cada resta" },
  { id: "abreviada", label: "Restar de memoria" },
];

export interface DivisionSpec {
  op: "divide";
  /** Dividendo (natural). */
  a: number;
  /** Divisor (natural ≥ 1). */
  b: number;
}

export interface DivisionStep {
  /** Posición de la cifra del cociente, desde la izquierda. */
  index: number;
  /** Columna del dividendo (desde la izquierda) donde termina el dividendo parcial. */
  end: number;
  part: number;
  digit: number;
  product: number;
  rest: number;
  /** Cifra que se baja después; null en el último paso. */
  down: number | null;
  ask: string;
  why: string;
}

export interface DivisionTrace {
  spec: DivisionSpec;
  layout: DivisionLayout;
  dividendDigits: number[];
  quotient: number;
  remainder: number;
  steps: DivisionStep[];
}

export function validDivisionSpec(spec: DivisionSpec): boolean {
  return Number.isSafeInteger(spec.a) && Number.isSafeInteger(spec.b) && spec.a >= 0 && spec.b >= 1 && spec.a < 1e7 && spec.b < 1000;
}

export function divisionTrace(spec: DivisionSpec, layout: DivisionLayout = "completa"): DivisionTrace {
  if (!validDivisionSpec(spec)) throw new Error(`División no válida: ${JSON.stringify(spec)}`);
  const { a, b } = spec;
  const digits = String(a).split("").map(Number);
  // Primer dividendo parcial: las menos cifras de la izquierda en las que cabe el divisor.
  let k = 1;
  while (k < digits.length && Number(digits.slice(0, k).join("")) < b) k++;
  let part = Number(digits.slice(0, k).join(""));
  let end = k - 1;
  const steps: DivisionStep[] = [];
  for (;;) {
    const digit = Math.floor(part / b);
    const product = digit * b;
    const rest = part - product;
    const down = end + 1 < digits.length ? digits[end + 1] : null;
    const index = steps.length;
    const parts: string[] = [];
    if (index === 0 && k > 1)
      parts.push(`${digits.slice(0, k - 1).join("")} es menor que ${b}: tomas ${part}.`);
    if (digit === 0)
      parts.push(
        index === 0
          ? `${part} es menor que ${b}: el cociente es 0.`
          : `${part} es menor que ${b}: cabe 0 veces. Escribes 0 en el cociente; sin ese 0, las demás cifras cambiarían de lugar. ${
              layout === "completa" ? `0 × ${b} = 0 debajo y sigue quedando ${part}.` : `Sigue quedando ${part}.`
            }`,
      );
    else
      parts.push(
        layout === "completa"
          ? `${b} cabe ${digit} ${digit === 1 ? "vez" : "veces"} en ${part}: escribes ${digit} en el cociente, ${digit} × ${b} = ${product} debajo, y restas ${part} − ${product} = ${rest}.`
          : `${b} cabe ${digit} ${digit === 1 ? "vez" : "veces"} en ${part}: escribes ${digit} en el cociente y, como ${digit} × ${b} = ${product}, de memoria ${part} − ${product} = ${rest}; solo escribes el ${rest}.`,
      );
    if (down !== null) parts.push(`Bajas el ${down}: queda ${rest * 10 + down}.`);
    else parts.push(rest ? `No quedan cifras por bajar: sobran ${rest}, menos que ${b}.` : "No quedan cifras por bajar y no sobra nada.");
    steps.push({
      index,
      end,
      part,
      digit,
      product,
      rest,
      down,
      ask: `¿Cuántas veces cabe ${b} en ${part} sin pasarse?`,
      why: parts.join(" "),
    });
    if (down === null) break;
    part = rest * 10 + down;
    end++;
  }
  const quotient = Number(steps.map((s) => s.digit).join(""));
  const remainder = steps[steps.length - 1].rest;
  if (quotient !== Math.floor(a / b) || remainder !== a % b) throw new Error("Trazado de división inconsistente");
  return { spec, layout, dividendDigits: digits, quotient, remainder, steps };
}

export function divisionExpression(spec: DivisionSpec): string {
  return `${fmt(spec.a)} ÷ ${fmt(spec.b)}`;
}

export function divisionSolution(spec: DivisionSpec, layout: DivisionLayout = "completa"): string[] {
  const t = divisionTrace(spec, layout);
  return [
    `Escribe ${fmt(spec.a)} en la galera con ${fmt(spec.b)} a la derecha y reparte de izquierda a derecha: cabe, multiplica, resta y baja.`,
    ...t.steps.map((s) => s.why),
    `Cociente ${fmt(t.quotient)}${t.remainder ? ` y resto ${t.remainder}` : ", resto 0"}. Comprobación: ${fmt(t.quotient)} × ${fmt(spec.b)}${t.remainder ? ` + ${t.remainder}` : ""} = ${fmt(spec.a)}.`,
  ];
}

export function divisionHints(spec: DivisionSpec, layout: DivisionLayout = "completa"): [string, string, string] {
  const t = divisionTrace(spec, layout);
  const digits = t.steps.map((s) => s.digit);
  return [
    "Empieza por la izquierda: busca el primer número del dividendo en el que quepa el divisor. En cada paso: cabe, multiplica, resta y baja la cifra siguiente.",
    t.steps[0].why,
    digits.length > 1
      ? `El cociente empieza por ${digits.slice(0, -1).join("")}…: solo falta la última cifra. Cada cifra que bajas da una cifra del cociente, aunque sea 0.`
      : `El cociente tiene una sola cifra. ${t.steps[0].why}`,
  ];
}

export interface DivisionBug {
  id: "cero-omitido" | "cifra-por-cifra";
  value: number;
  feedback: string;
}

/** Errores sistemáticos de la división larga reconocibles por el cociente. */
export function divisionBugs(spec: DivisionSpec): DivisionBug[] {
  const t = divisionTrace(spec);
  const bugs: DivisionBug[] = [];
  const zero = t.steps.find((s) => s.index > 0 && s.digit === 0);
  if (zero) {
    const value = Number(t.steps.filter((s) => s.index === 0 || s.digit !== 0).map((s) => s.digit).join(""));
    bugs.push({
      id: "cero-omitido",
      value,
      feedback: `Al llegar a ${zero.part}, que es menor que ${spec.b}, la cifra del cociente es 0: se escribe y se baja la cifra siguiente. Si se omite o se pone otra cifra, el cociente cambia; compruébalo multiplicando por ${spec.b}.`,
    });
  }
  // Dividir cada cifra por separado, sin arrastrar lo que sobra.
  if (spec.b < 10 && t.steps.some((s) => s.rest > 0 && s.down !== null)) {
    const value = Number(t.dividendDigits.map((d) => Math.floor(d / spec.b)).join(""));
    bugs.push({
      id: "cifra-por-cifra",
      value,
      feedback: "Dividiste cada cifra por separado y perdiste lo que sobraba. Lo que sobra en un paso se junta con la cifra que bajas: forma el siguiente número que divides.",
    });
  }
  const seen = new Set([t.quotient]);
  return bugs.filter((bug) => (seen.has(bug.value) ? false : (seen.add(bug.value), true)));
}

// ── Procedimiento completo ──────────────────────────────────────────────

/**
 * Cada casilla que escribe el alumno en la galera: una cifra del cociente
 * por paso y, debajo del dividendo, el producto (solo en la disposición
 * completa) y lo que queda tras restar, con la cifra que se baja al lado.
 * La última fila es el resto.
 */
export interface DivisionField {
  key: string;
  step: number;
  kind: "q" | "p" | "r";
  expected: number;
  /** Cómo se escribe (con el 0 delante si se restó todo: «01»). */
  text: string;
  /** Columna del dividendo donde termina la fila (q: sin uso). */
  end: number;
  /** Casillas disponibles: tantas como cifras puede tener la fila, sin
   *  revelar cuántas tiene la respuesta. */
  width: number;
}

export function divisionFields(trace: DivisionTrace): DivisionField[] {
  const width = String(trace.spec.b).length + 1;
  const fields: DivisionField[] = [];
  for (const s of trace.steps) {
    fields.push({ key: `q${s.index}`, step: s.index, kind: "q", expected: s.digit, text: String(s.digit), end: 0, width: 1 });
    if (trace.layout === "completa")
      fields.push({ key: `p${s.index}`, step: s.index, kind: "p", expected: s.product, text: String(s.product), end: s.end, width: Math.min(width, s.end + 1) });
    const text = String(s.rest) + (s.down !== null ? String(s.down) : "");
    const end = s.end + (s.down !== null ? 1 : 0);
    fields.push({ key: `r${s.index}`, step: s.index, kind: "r", expected: Number(text), text, end, width: Math.min(width, end + 1) });
  }
  return fields;
}

/** Respuesta de la galera: «C» o «A» (disposición), las cifras del cociente
 *  y, separadas por comas, las filas en el orden en que se escriben. */
export function encodeDivisionWork(layout: DivisionLayout, quotient: string, rows: string[]): string {
  return `${layout === "completa" ? "C" : "A"}${quotient};${rows.join(",")}`;
}

export interface DivisionWorkCheck {
  layout: DivisionLayout;
  quotient: number;
  /** Última fila: lo que sobra. */
  remainder: number | null;
  /** Primera casilla incorrecta, en el orden en que se escribe. */
  firstError: DivisionField | null;
  correct: boolean;
}

/** Revisa todo el procedimiento; null si la respuesta no es de la galera. */
export function checkDivisionWork(spec: DivisionSpec, response: string): DivisionWorkCheck | null {
  const match = /^([CA])(\d+);(\d*(?:,\d*)*)$/.exec(response.trim());
  if (!match) return null;
  const layout: DivisionLayout = match[1] === "C" ? "completa" : "abreviada";
  const fields = divisionFields(divisionTrace(spec, layout));
  const quotientDigits = match[2];
  const rows = match[3].split(",");
  const rowFields = fields.filter((f) => f.kind !== "q");
  if (quotientDigits.length !== fields.length - rowFields.length || rows.length !== rowFields.length) return null;
  const value = (f: DivisionField) => {
    if (f.kind === "q") return Number(quotientDigits[f.step]);
    const row = rows[rowFields.indexOf(f)];
    return row === "" ? Number.NaN : Number(row);
  };
  const firstError = fields.find((f) => value(f) !== f.expected) ?? null;
  const last = rows.at(-1) ?? "";
  return {
    layout,
    quotient: Number(quotientDigits),
    remainder: last === "" ? null : Number(last),
    firstError,
    correct: firstError === null,
  };
}

/** Qué revisar en la primera casilla incorrecta (sin dar el resultado). */
export function divisionWorkFeedback(spec: DivisionSpec, field: Pick<DivisionField, "step" | "kind">, layout: DivisionLayout): string {
  const step = divisionTrace(spec, layout).steps[field.step];
  const n = field.step + 1;
  if (field.kind === "q")
    return step.digit === 0
      ? `En el paso ${n} queda ${step.part}, que es menor que ${spec.b}: esa cifra del cociente es 0.`
      : `Revisa la cifra ${n} del cociente: ¿cuántas veces cabe ${spec.b} en ${step.part} sin pasarse?`;
  if (field.kind === "p") return `Revisa el producto del paso ${n}: ${step.digit} × ${spec.b}.`;
  return step.down === null
    ? `Revisa el resto: ${step.part} − ${step.product}. Siempre es menor que ${spec.b}.`
    : `Revisa el paso ${n}: resta ${step.part} − ${step.product} y escribe al lado la cifra que bajas.`;
}

/** Respuesta escrita sin la galera: «cociente» si la división es exacta o
 *  «cociente r resto» (también «resto 5»). */
export function parseDivisionText(response: string): { quotient: number; remainder: number | null } | null {
  const m = /^\s*(\d+)\s*(?:(?:r|resto)\s*(\d+))?\s*$/i.exec(response);
  return m ? { quotient: Number(m[1]), remainder: m[2] === undefined ? null : Number(m[2]) } : null;
}

/** ¿Es correcta una respuesta a una división (galera o texto)? */
export function divisionResponseCorrect(spec: DivisionSpec, response: string): boolean {
  const work = checkDivisionWork(spec, response);
  if (work) return work.correct;
  const open = checkOpenDivision(spec, response);
  if (open) return open.correct;
  const text = parseDivisionText(response);
  if (!text) return false;
  const { quotient, remainder } = divisionTrace(spec);
  return text.quotient === quotient && (text.remainder ?? 0) === remainder;
}

/**
 * Valor con el que se busca un error previsto: el cociente que escribió el
 * alumno, o el del error «cero omitido» si puso otra cifra donde iba el 0
 * (con casillas por paso, ese error no cambia la longitud del cociente).
 */
export function divisionResponseValue(spec: DivisionSpec, response: string): number | null {
  const work = checkDivisionWork(spec, response);
  if (work) {
    const f = work.firstError;
    if (f?.kind === "q" && divisionTrace(spec).steps[f.step].digit === 0)
      return divisionBugs(spec).find((b) => b.id === "cero-omitido")?.value ?? work.quotient;
    return work.quotient;
  }
  const open = checkOpenDivision(spec, response);
  if (open) return open.quotient;
  return parseDivisionText(response)?.quotient ?? null;
}

/** La respuesta correcta como se escribiría sin la galera. */
export function divisionAnswerText(spec: DivisionSpec): string {
  const t = divisionTrace(spec);
  return t.remainder ? `${t.quotient} r ${t.remainder}` : String(t.quotient);
}

/** El procedimiento completo y correcto, como lo envía la galera. */
export function divisionWorkResponse(spec: DivisionSpec, layout: DivisionLayout = "completa"): string {
  const fields = divisionFields(divisionTrace(spec, layout));
  return encodeDivisionWork(
    layout,
    fields.filter((f) => f.kind === "q").map((f) => f.text).join(""),
    fields.filter((f) => f.kind !== "q").map((f) => f.text),
  );
}

// ── Galera abierta (comprobaciones y repasos) ───────────────────────────

/** Una fila escrita bajo el dividendo y el paso al que corresponde. */
export interface DivisionRow {
  value: number;
  step: number;
  kind: "p" | "r";
}

/**
 * Maneras correctas de escribir las filas de trabajo, de arriba abajo: con
 * cada producto o restando de memoria, y con una fila propia en los pasos
 * con 0 en el cociente o bajando la cifra junto a la fila anterior.
 */
export function divisionRowVariants(spec: DivisionSpec): DivisionRow[][] {
  const variants: DivisionRow[][] = [];
  for (const layout of ["completa", "abreviada"] as const)
    for (const merge of [false, true]) {
      const rows: { text: string; step: number; kind: "p" | "r" }[] = [];
      for (const s of divisionTrace(spec, layout).steps) {
        const tail = s.down !== null ? String(s.down) : "";
        const last = rows.at(-1);
        if (merge && s.index > 0 && s.digit === 0 && last?.kind === "r") {
          last.text += tail;
          continue;
        }
        if (layout === "completa") rows.push({ text: String(s.product), step: s.index, kind: "p" });
        rows.push({ text: String(s.rest) + tail, step: s.index, kind: "r" });
      }
      const variant = rows.map((r) => ({ value: Number(r.text), step: r.step, kind: r.kind }));
      if (!variants.some((v) => JSON.stringify(v) === JSON.stringify(variant))) variants.push(variant);
    }
  return variants;
}

export interface OpenDivisionCheck {
  quotient: number;
  remainder: number | null;
  quotientCorrect: boolean;
  /** Primera fila que se aparta de la manera correcta más parecida. */
  mismatch: { step: number; kind: "p" | "r" } | null;
  correct: boolean;
}

/** Respuesta de la galera abierta: «L», el cociente y las filas no vacías. */
export function encodeOpenDivision(quotient: string, rows: string[]): string {
  return `L${quotient};${rows.join(",")}`;
}

/**
 * Revisa una galera abierta: el cociente y cada fila, sin exigir una
 * disposición ni la posición exacta de las cifras. Es correcta si el
 * cociente lo es y las filas siguen una de las maneras correctas (la última
 * es el resto).
 */
export function checkOpenDivision(spec: DivisionSpec, response: string): OpenDivisionCheck | null {
  const m = /^L(\d+);(\d+(?:,\d+)*)$/.exec(response.trim());
  if (!m) return null;
  const { quotient } = divisionTrace(spec);
  const given = Number(m[1]);
  const rows = m[2].split(",").map(Number);
  const variants = divisionRowVariants(spec);
  let best = { prefix: -1, variant: variants[0] };
  for (const v of variants) {
    let prefix = 0;
    while (prefix < Math.min(v.length, rows.length) && v[prefix].value === rows[prefix]) prefix++;
    if (prefix === v.length && rows.length === v.length) return { quotient: given, remainder: rows.at(-1)!, quotientCorrect: given === quotient, mismatch: null, correct: given === quotient };
    if (prefix > best.prefix) best = { prefix, variant: v };
  }
  const row = best.variant[Math.min(best.prefix, best.variant.length - 1)];
  return {
    quotient: given,
    remainder: rows.at(-1) ?? null,
    quotientCorrect: given === quotient,
    mismatch: { step: row.step, kind: best.prefix >= best.variant.length ? "r" : row.kind },
    correct: false,
  };
}
