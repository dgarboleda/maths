/**
 * División larga («galera»): el dividendo a la izquierda, el divisor a la
 * derecha y el cociente debajo del divisor. Se reparte de izquierda a
 * derecha: cabe, multiplica, resta y baja la cifra siguiente. Un solo
 * trazado alimenta el ejemplo, las pistas, la hoja y el diagnóstico (los
 * errores típicos se reconocen por el cociente que producen).
 *
 * Puro: sin React ni Firebase, compartido por Functions y el navegador.
 */
import { decimalsOf, fmt, placeName } from "./columns";

/** «Completa»: se escribe cada producto y se resta debajo. «Abreviada»: la
 *  resta se hace de memoria y solo se escribe lo que sobra. */
export type DivisionLayout = "completa" | "abreviada";
export const DIVISION_LAYOUTS: readonly { id: DivisionLayout; label: string }[] = [
  { id: "completa", label: "Escribir cada resta" },
  { id: "abreviada", label: "Restar de memoria" },
];

export interface DivisionSpec {
  op: "divide";
  /** Dividendo (natural o decimal, hasta 3 decimales). */
  a: number;
  /** Divisor (natural ≥ 1 o decimal, hasta 2 decimales). */
  b: number;
  /** Cifras decimales del cociente que se calculan añadiendo ceros al
   *  dividendo (por defecto, ninguna: cociente natural y resto). */
  places?: number;
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
  /** Decimales del divisor: dividendo y divisor se multiplican por 10^shift. */
  shift: number;
  /** Dividendo y divisor con los que se divide (divisor ya entero). */
  dividend: number;
  divisor: number;
  /** Cifras del dividendo en la galera, con los ceros añadidos. */
  dividendDigits: number[];
  /** Cifras de la parte entera del dividendo: la coma va detrás. */
  intLength: number;
  /** Ceros añadidos a la derecha para seguir dividiendo. */
  padded: number;
  /** Cifras decimales del cociente. */
  decimals: number;
  /** Cociente (con coma si `decimals` > 0) y lo que sobra en la última fila. */
  quotient: number;
  remainder: number;
  /** El cociente como se escribe: «0,75». */
  quotientText: string;
  /** Delante de la primera cifra del cociente cuando empieza en la parte
   *  decimal («0,» o «0,0»); vacío si no. */
  quotientPrefix: string;
  /** Paso tras cuya cifra va la coma del cociente (null: no hay o va en el prefijo). */
  commaAfter: number | null;
  steps: DivisionStep[];
}

/** ¿Tiene decimales la división (en los datos o en el cociente)? Entonces se
 *  responde con el cociente decimal, sin resto. */
export function isDecimalDivision(spec: DivisionSpec): boolean {
  return decimalsOf(spec.a) > 0 || decimalsOf(spec.b) > 0 || (spec.places ?? 0) > 0;
}

function shifted(spec: DivisionSpec) {
  const shift = decimalsOf(spec.b);
  const divisor = Math.round(spec.b * 10 ** shift);
  const dividend = Number((spec.a * 10 ** shift).toFixed(Math.max(0, decimalsOf(spec.a) - shift)));
  return { shift, divisor, dividend };
}

export function validDivisionSpec(spec: DivisionSpec): boolean {
  if (!Number.isFinite(spec.a) || !Number.isFinite(spec.b) || spec.a < 0 || spec.a >= 1e7) return false;
  const places = spec.places ?? 0;
  if (!Number.isInteger(places) || places < 0 || places > 4) return false;
  if (decimalsOf(spec.a) > 3 || decimalsOf(spec.b) > 2) return false;
  const { divisor, dividend } = shifted(spec);
  const extended = dividend * 10 ** Math.max(decimalsOf(dividend), places);
  return divisor >= 1 && divisor < 1000 && Number.isSafeInteger(Math.round(extended)) && extended < 1e9;
}

/** Cuántas cifras decimales hacen falta para que la división sea exacta
 *  (null si no lo es con hasta `max`). */
export function exactPlaces(a: number, b: number, max = 3): number | null {
  for (let places = 0; places <= max; places++) {
    const spec: DivisionSpec = { op: "divide", a, b, places };
    if (validDivisionSpec(spec) && divisionTrace(spec).remainder === 0) return places;
  }
  return null;
}

export function divisionTrace(spec: DivisionSpec, layout: DivisionLayout = "completa"): DivisionTrace {
  if (!validDivisionSpec(spec)) throw new Error(`División no válida: ${JSON.stringify(spec)}`);
  const { shift, divisor: b, dividend } = shifted(spec);
  const [intText, fracText = ""] = String(dividend).split(".");
  const decimals = Math.max(fracText.length, spec.places ?? 0);
  const padded = decimals - fracText.length;
  const intLength = intText.length;
  const digits = (intText + fracText + "0".repeat(padded)).split("").map(Number);
  const decimalMode = isDecimalDivision(spec);
  /** Nombre de la posición de la cifra j del dividendo (desde la izquierda). */
  const place = (j: number) => placeName(intLength - 1 - j);
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
    if (index === 0 && decimalMode && end >= intLength)
      parts.unshift(`En la parte entera no cabe ${b}: llegas hasta las ${place(end)}, así que el cociente empieza con «${quotientStart(end, intLength)}».`);
    if (down !== null) {
      const next = end + 1;
      if (next >= digits.length - padded)
        parts.push(`${next === intLength ? "No quedan cifras enteras" : "No quedan cifras"}: añades un 0 en las ${place(next)} y lo bajas${
          next === intLength ? "; como empiezas con las décimas, pones la coma en el cociente" : ""
        }: queda ${rest * 10 + down}.`);
      else if (next === intLength)
        parts.push(`Bajas el ${down}, que son ${place(next)}: pones la coma en el cociente antes de seguir. Queda ${rest * 10 + down}.`);
      else parts.push(`Bajas el ${down}: queda ${rest * 10 + down}.`);
    } else if (!decimalMode) parts.push(rest ? `No quedan cifras por bajar: sobran ${rest}, menos que ${b}.` : "No quedan cifras por bajar y no sobra nada.");
    else
      parts.push(
        rest
          ? `Ya tienes ${decimals} ${decimals === 1 ? "cifra decimal" : "cifras decimales"} en el cociente; todavía sobran ${rest} ${place(end)}.`
          : "No sobra nada: la división es exacta.",
      );
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
  const whole = Number(digits.join(""));
  const q = Number(steps.map((s) => s.digit).join(""));
  const remainder = steps[steps.length - 1].rest;
  if (q !== Math.floor(whole / b) || remainder !== whole % b) throw new Error("Trazado de división inconsistente");
  const quotient = Number((q / 10 ** decimals).toFixed(decimals));
  const m = steps.length;
  const qDigits = steps.map((s) => s.digit).join("");
  const quotientPrefix = decimals && m <= decimals ? `0,${"0".repeat(decimals - m)}` : "";
  const commaAfter = decimals && m > decimals ? m - decimals - 1 : null;
  const quotientText = quotientPrefix
    ? quotientPrefix + qDigits
    : commaAfter !== null
      ? `${fmt(Number(qDigits.slice(0, commaAfter + 1)))},${qDigits.slice(commaAfter + 1)}`
      : fmt(q);
  return {
    spec,
    layout,
    shift,
    dividend,
    divisor: b,
    dividendDigits: digits,
    intLength,
    padded,
    decimals,
    quotient,
    remainder,
    quotientText,
    quotientPrefix,
    commaAfter,
    steps,
  };
}

/** Cómo empieza un cociente cuya primera cifra cae en la parte decimal. */
function quotientStart(end: number, intLength: number): string {
  return `0,${"0".repeat(end - intLength)}`;
}

/** Valor de las cifras del cociente escritas (sin coma) en una galera. */
export function quotientValue(trace: DivisionTrace, digits: string): number {
  return Number((Number(digits) / 10 ** trace.decimals).toFixed(trace.decimals));
}

/** El dividendo como se escribe en la galera, con la coma («4,80»). */
export function dividendText(trace: DivisionTrace): string {
  const d = trace.dividendDigits.join("");
  return trace.decimals ? `${fmt(Number(d.slice(0, trace.intLength)))},${d.slice(trace.intLength)}` : fmt(Number(d));
}

export function divisionExpression(spec: DivisionSpec): string {
  return `${fmt(spec.a)} ÷ ${fmt(spec.b)}`;
}

export function divisionSolution(spec: DivisionSpec, layout: DivisionLayout = "completa"): string[] {
  const t = divisionTrace(spec, layout);
  const intro: string[] = [];
  if (t.shift)
    intro.push(
      `El divisor tiene coma: multiplica dividendo y divisor por ${fmt(10 ** t.shift)} y el cociente no cambia. ${fmt(spec.a)} ÷ ${fmt(spec.b)} = ${fmt(t.dividend)} ÷ ${fmt(t.divisor)}.`,
    );
  intro.push(
    `Escribe ${fmt(t.dividend)} en la galera con ${fmt(t.divisor)} a la derecha y reparte de izquierda a derecha: cabe, multiplica, resta y baja.${
      t.decimals && t.intLength < t.dividendDigits.length - t.padded ? " Cuando bajes la primera cifra decimal, pon la coma en el cociente." : ""
    }${t.padded ? ` Para seguir con decimales, añades ${t.padded === 1 ? "un cero" : `${t.padded} ceros`} a la derecha: ${dividendText(t)}.` : ""}`,
  );
  const check = !isDecimalDivision(spec)
    ? `Cociente ${fmt(t.quotient)}${t.remainder ? ` y resto ${t.remainder}` : ", resto 0"}. Comprobación: ${fmt(t.quotient)} × ${fmt(spec.b)}${t.remainder ? ` + ${t.remainder}` : ""} = ${fmt(spec.a)}.`
    : t.remainder
      ? `Cociente ${t.quotientText}, con ${t.decimals} ${t.decimals === 1 ? "cifra decimal" : "cifras decimales"}: la división no es exacta. Comprobación: ${t.quotientText} × ${fmt(spec.b)} = ${fmt(Number((t.quotient * spec.b).toFixed(6)))}, casi ${fmt(spec.a)}.`
      : `Cociente ${t.quotientText}. Comprobación: ${t.quotientText} × ${fmt(spec.b)} = ${fmt(spec.a)}.`;
  return [...intro, ...t.steps.map((s) => s.why), check];
}

export function divisionHints(spec: DivisionSpec, layout: DivisionLayout = "completa"): [string, string, string] {
  const t = divisionTrace(spec, layout);
  const digits = t.steps.map((s) => s.digit);
  const start = t.decimals ? t.quotientText.slice(0, -1) : digits.slice(0, -1).join("");
  return [
    (t.shift ? `Primero convierte el divisor en entero: multiplica los dos por ${fmt(10 ** t.shift)}. ` : "") +
      "Empieza por la izquierda: busca el primer número del dividendo en el que quepa el divisor. En cada paso: cabe, multiplica, resta y baja la cifra siguiente." +
      (t.decimals ? " Al bajar la primera cifra decimal, pon la coma en el cociente; si se acaban las cifras, añade ceros." : ""),
    t.steps[0].why,
    digits.length > 1
      ? `El cociente empieza por ${start}…: solo falta la última cifra. Cada cifra que bajas da una cifra del cociente, aunque sea 0.`
      : `El cociente tiene una sola cifra${t.quotientPrefix ? ` después de ${t.quotientPrefix}` : ""}. ${t.steps[0].why}`,
  ];
}

export interface DivisionBug {
  id: "cero-omitido" | "cifra-por-cifra" | "coma-olvidada" | "divisor-sin-ajustar";
  value: number;
  feedback: string;
}

/** Errores sistemáticos de la división larga reconocibles por el cociente. */
export function divisionBugs(spec: DivisionSpec): DivisionBug[] {
  const t = divisionTrace(spec);
  const bugs: DivisionBug[] = [];
  const zero = t.steps.find((s) => s.index > 0 && s.digit === 0);
  if (zero) {
    const kept = t.steps.filter((s) => s.index === 0 || s.digit !== 0);
    // Sin los ceros, las cifras decimales que quedan siguen detrás de la coma.
    const lost = t.steps.length - kept.length;
    const fracLost = t.commaAfter === null ? 0 : t.steps.filter((s) => s.index > t.commaAfter! && s.index > 0 && s.digit === 0).length;
    const keptDecimals = Math.max(0, t.decimals - (t.commaAfter === null ? lost : fracLost));
    const value = Number((Number(kept.map((s) => s.digit).join("")) / 10 ** keptDecimals).toFixed(keptDecimals));
    bugs.push({
      id: "cero-omitido",
      value,
      feedback: `Al llegar a ${zero.part}, que es menor que ${t.divisor}, la cifra del cociente es 0: se escribe y se baja la cifra siguiente. Si se omite o se pone otra cifra, el cociente cambia; compruébalo multiplicando por ${fmt(spec.b)}.`,
    });
  }
  // Dividir cada cifra por separado, sin arrastrar lo que sobra.
  if (!isDecimalDivision(spec) && spec.b < 10 && t.steps.some((s) => s.rest > 0 && s.down !== null)) {
    const value = Number(t.dividendDigits.map((d) => Math.floor(d / spec.b)).join(""));
    bugs.push({
      id: "cifra-por-cifra",
      value,
      feedback: "Dividiste cada cifra por separado y perdiste lo que sobraba. Lo que sobra en un paso se junta con la cifra que bajas: forma el siguiente número que divides.",
    });
  }
  if (t.decimals)
    bugs.push({
      id: "coma-olvidada",
      value: Number(t.steps.map((s) => s.digit).join("")),
      feedback: "Falta la coma del cociente. Cuando bajas la primera cifra decimal del dividendo (o el primer 0 que añades), pones la coma en el cociente.",
    });
  if (t.shift)
    bugs.push({
      id: "divisor-sin-ajustar",
      value: Number((spec.a / t.divisor).toFixed(6)),
      feedback: `Multiplicaste solo el divisor por ${fmt(10 ** t.shift)}. Para que el cociente no cambie, el dividendo también se multiplica: ${fmt(t.dividend)} ÷ ${fmt(t.divisor)}.`,
    });
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
  const width = String(trace.divisor).length + 1;
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
    quotient: quotientValue(divisionTrace(spec, layout), quotientDigits),
    remainder: last === "" ? null : Number(last),
    firstError,
    correct: firstError === null,
  };
}

/** Qué revisar en la primera casilla incorrecta (sin dar el resultado). */
export function divisionWorkFeedback(spec: DivisionSpec, field: Pick<DivisionField, "step" | "kind">, layout: DivisionLayout): string {
  const t = divisionTrace(spec, layout);
  const step = t.steps[field.step];
  const b = t.divisor;
  const n = field.step + 1;
  if (field.kind === "q")
    return step.digit === 0
      ? `En el paso ${n} queda ${step.part}, que es menor que ${b}: esa cifra del cociente es 0.`
      : `Revisa la cifra ${n} del cociente: ¿cuántas veces cabe ${b} en ${step.part} sin pasarse?`;
  if (field.kind === "p") return `Revisa el producto del paso ${n}: ${step.digit} × ${b}.`;
  return step.down === null
    ? `Revisa ${isDecimalDivision(spec) ? "lo que sobra al final" : "el resto"}: ${step.part} − ${step.product}. Siempre es menor que ${b}.`
    : `Revisa el paso ${n}: resta ${step.part} − ${step.product} y escribe al lado la cifra que bajas.`;
}

/** Respuesta escrita sin la galera: «cociente» si la división es exacta o
 *  «cociente r resto» (también «resto 5»). */
export function parseDivisionText(response: string): { quotient: number; remainder: number | null } | null {
  const m = /^\s*(\d+(?:[,.]\d+)?)\s*(?:(?:r|resto)\s*(\d+))?\s*$/i.exec(response);
  return m ? { quotient: Number(m[1].replace(",", ".")), remainder: m[2] === undefined ? null : Number(m[2]) } : null;
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
  // Con decimales se responde el cociente; el resto no se pide.
  if (isDecimalDivision(spec)) return Math.abs(text.quotient - quotient) < 1e-9 && text.remainder === null;
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
  if (isDecimalDivision(spec)) return String(t.quotient).replace(".", ",");
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
  const trace = divisionTrace(spec);
  const { quotient } = trace;
  const given = quotientValue(trace, m[1]);
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
