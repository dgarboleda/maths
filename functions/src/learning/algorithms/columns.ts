/**
 * Operaciones en columnas (suma y resta de naturales), como se escriben en
 * el cuaderno. Un solo trazado alimenta el ejemplo animado, las pistas, el
 * desarrollo, la hoja guiada y el diagnóstico de errores: el diagnóstico
 * ejecuta las variantes con error («bugs» de procedimiento) y compara su
 * resultado con la respuesta del alumno, así basta con registrar el número
 * final (sin cambiar el protocolo de evidencias).
 *
 * Puro: sin React ni Firebase, compartido por Functions y el navegador.
 */

export type ColumnOp = "add" | "subtract";
/** Resta: «préstamo» (se desagrupa una decena de la columna siguiente) o
 *  «compensación» (se suman 10 arriba y 1 abajo en la columna siguiente). */
export type SubtractStrategy = "prestamo" | "compensacion";
export const SUBTRACT_STRATEGIES: readonly { id: SubtractStrategy; label: string }[] = [
  { id: "prestamo", label: "Pedir prestado" },
  { id: "compensacion", label: "Compensar" },
];

export interface ArithmeticSpec {
  op: ColumnOp;
  /** Naturales; en la resta, a ≥ b. */
  a: number;
  b: number;
}

export interface ColumnStep {
  /** 0 = unidades, 1 = decenas… */
  column: number;
  /** Cifras originales de la columna (0 si el número no llega). */
  top: number;
  bottom: number;
  /** Lo que realmente se opera, ya con llevadas, préstamos o compensación. */
  workTop: number;
  workBottom: number;
  digit: number;
  /** Suma: llevada a la columna siguiente. Resta: 1 si esta columna sumó 10
   *  arriba (y la siguiente lo paga). */
  regroup: 0 | 1;
  /** Pregunta que orienta sin dar el resultado. */
  ask: string;
  /** Explicación del paso, con el resultado. */
  why: string;
}

export interface ColumnTrace {
  spec: ArithmeticSpec;
  strategy: SubtractStrategy;
  /** Cifras decimales de la operación: las columnas 0…scale−1 son decimales. */
  scale: number;
  /** Número de columnas del resultado (incluye la llevada final). */
  width: number;
  topDigits: number[];
  bottomDigits: number[];
  result: number;
  resultDigits: number[];
  steps: ColumnStep[];
}

const PLACES = [
  "unidades",
  "decenas",
  "centenas",
  "unidades de millar",
  "decenas de millar",
  "centenas de millar",
  "unidades de millón",
];
const DECIMAL_PLACES = ["décimas", "centésimas", "milésimas"];
/** Nombre de una posición: 0 = unidades, 1 = decenas…, −1 = décimas. */
export function placeName(column: number): string {
  return placeNameOf(column);
}
function placeNameOf(column: number): string {
  if (column < 0) return DECIMAL_PLACES[-column - 1] ?? `posición ${column}`;
  return PLACES[column] ?? `columna ${column + 1}`;
}
const SINGULAR = ["unidad", "decena", "centena", "unidad de millar", "decena de millar", "centena de millar", "unidad de millón"];
const SINGULAR_DECIMAL = ["décima", "centésima", "milésima"];
const oneOf = (column: number) =>
  column < 0 ? (SINGULAR_DECIMAL[-column - 1] ?? "parte decimal") : (SINGULAR[column] ?? `unidad de la columna ${column + 1}`);

/** Cifras decimales de un número (hasta 6). */
export function decimalsOf(n: number): number {
  const text = String(n);
  if (/e/i.test(text)) return 6;
  return text.split(".")[1]?.length ?? 0;
}


/** Cifras de menor a mayor posición: 325 → [5, 2, 3]. */
export function digitsOf(value: number, width = 0): number[] {
  const out: number[] = [];
  let rest = Math.trunc(Math.abs(value));
  do {
    out.push(rest % 10);
    rest = Math.floor(rest / 10);
  } while (rest > 0);
  while (out.length < width) out.push(0);
  return out;
}
const fromDigits = (digits: number[]) => digits.reduceRight((acc, d) => acc * 10 + d, 0);

/** Escala común (decimales) y operandos como enteros: 3,5 y 1,25 → 350 y 125. */
export function scaled(spec: ArithmeticSpec): { scale: number; a: number; b: number } {
  const scale = Math.max(decimalsOf(spec.a), decimalsOf(spec.b));
  const k = 10 ** scale;
  return { scale, a: Math.round(spec.a * k), b: Math.round(spec.b * k) };
}

export function validColumnSpec(spec: ArithmeticSpec): boolean {
  if (!Number.isFinite(spec.a) || !Number.isFinite(spec.b)) return false;
  const { scale, a, b } = scaled(spec);
  return (
    scale <= 3 &&
    Number.isSafeInteger(a) &&
    Number.isSafeInteger(b) &&
    spec.a >= 0 &&
    spec.b >= 0 &&
    spec.a < 1e7 &&
    spec.b < 1e7 &&
    (spec.op === "add" || spec.a >= spec.b)
  );
}

export function columnTrace(spec: ArithmeticSpec, strategy: SubtractStrategy = "prestamo"): ColumnTrace {
  if (!validColumnSpec(spec)) throw new Error(`Operación en columnas no válida: ${JSON.stringify(spec)}`);
  // Con decimales se opera con la coma alineada: 3,5 + 1,25 es 3,50 + 1,25.
  const { scale, a: A, b: B } = scaled(spec);
  const placeName = (column: number) => placeNameOf(column - scale);
  const one = (column: number) => oneOf(column - scale);
  const the = (column: number) => `las ${placeName(column)}`;
  const operandWidth = Math.max(digitsOf(A).length, digitsOf(B).length, scale + 1);
  const topDigits = digitsOf(A, operandWidth);
  const bottomDigits = digitsOf(B, operandWidth);
  const steps: ColumnStep[] = [];
  if (spec.op === "add") {
    let carry = 0;
    for (let i = 0; i < operandWidth; i++) {
      const top = topDigits[i], bottom = bottomDigits[i];
      const sum = top + bottom + carry;
      const digit = sum % 10;
      const out = sum >= 10 ? 1 : 0;
      const terms = carry ? `${top} + ${bottom} + ${carry} (la llevada)` : `${top} + ${bottom}`;
      steps.push({
        column: i,
        top,
        bottom,
        workTop: top + carry,
        workBottom: bottom,
        digit,
        regroup: out,
        ask: `Suma ${the(i)}: ${terms}. ¿Pasa de 9?`,
        why: out
          ? `${the(i).replace(/^las/, "En las")}: ${terms} = ${sum}. Escribes ${digit} y llevas 1 a ${the(i + 1)}, porque 10 ${placeName(i)} forman 1 ${one(i + 1)}.`
          : `${the(i).replace(/^las/, "En las")}: ${terms} = ${sum}. Escribes ${digit}; no llevas nada.`,
      });
      carry = out;
    }
    if (carry)
      steps.push({
        column: operandWidth,
        top: 0,
        bottom: 0,
        workTop: 1,
        workBottom: 0,
        digit: 1,
        regroup: 0,
        ask: `Queda una llevada. ¿Qué escribes en ${the(operandWidth)}?`,
        why: `No quedan cifras, pero sí la llevada: escribes 1 en ${the(operandWidth)}.`,
      });
  } else {
    // pending: lo que la columna anterior pidió a esta (préstamo: 1 menos
    // arriba; compensación: 1 más abajo).
    let pending = 0;
    for (let i = 0; i < operandWidth; i++) {
      const top = topDigits[i], bottom = bottomDigits[i];
      const workTopBase = strategy === "prestamo" ? top - pending : top;
      const workBottom = strategy === "prestamo" ? bottom : bottom + pending;
      const needs = workTopBase < workBottom ? 1 : 0;
      const workTop = workTopBase + 10 * needs;
      const digit = workTop - workBottom;
      const In = the(i).replace(/^las/, "En las");
      let why: string;
      let ask: string;
      if (strategy === "prestamo") {
        const before = pending ? `esta columna prestó 1: el ${top} queda en ${workTopBase}. ` : "";
        const borrowed = needs
          ? `${workTopBase} es menor que ${workBottom}: pides 1 ${one(i + 1)} a ${the(i + 1)}, que son 10 ${placeName(i)} → ${workTop}. `
          : "";
        why = `${In}: ${before}${borrowed}${workTop} − ${workBottom} = ${digit}.`;
        ask = pending
          ? `${In}, el ${top} ya prestó 1 y queda en ${workTopBase}. ¿Alcanza para quitarle ${workBottom}?`
          : `${In}: ¿alcanza el ${top} para quitarle ${workBottom}?`;
        // El cero que presta: se lee como «10 − 1 = 9» en lugar de «−1 + 10».
        if (pending && top === 0) {
          why = `${In}: el 0 no puede prestar sin antes pedir 1 ${one(i + 1)}: se convierte en 10 y, tras prestar 1, queda 9. 9 − ${workBottom} = ${digit}.`;
          ask = `${In} hay un 0 que debe prestar 1. ¿A quién le pide primero?`;
        }
      } else {
        const before = pending ? `compensas la columna anterior: abajo ${bottom} + 1 = ${workBottom}. ` : "";
        const added = needs
          ? `${top} es menor que ${workBottom}: sumas 10 arriba (${workTop}) y, para no cambiar la diferencia, sumarás 1 abajo en ${the(i + 1)}. `
          : "";
        why = `${In}: ${before}${added}${workTop} − ${workBottom} = ${digit}.`;
        ask = pending
          ? `${In}, abajo hay que sumar 1: ${bottom} + 1 = ${workBottom}. ¿Alcanza el ${top} para quitarle ${workBottom}?`
          : `${In}: ¿alcanza el ${top} para quitarle ${workBottom}?`;
      }
      steps.push({ column: i, top, bottom, workTop, workBottom, digit, regroup: needs as 0 | 1, ask, why });
      pending = needs;
    }
  }
  // Los ceros a la izquierda del resultado no se escriben (1 000 − 999 = 1),
  // pero sí el de las unidades en un decimal (0,75).
  let width = steps.length;
  while (width > scale + 1 && steps[width - 1].digit === 0) width--;
  const resultDigits = steps.slice(0, width).map((s) => s.digit);
  const resultInt = fromDigits(resultDigits);
  const expected = spec.op === "add" ? A + B : A - B;
  if (resultInt !== expected) throw new Error(`Trazado inconsistente: ${resultInt} ≠ ${expected}`);
  const result = Number((resultInt / 10 ** scale).toFixed(scale));
  return { spec, strategy, scale, width, topDigits, bottomDigits, result, resultDigits, steps };
}

const symbol = (op: ColumnOp) => (op === "add" ? "+" : "−");
/** Miles separados con espacio fijo, como en el resto del catálogo. */
export const fmt = (n: number) => {
  const [int, frac] = String(n).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + (frac ? `,${frac}` : "");
};
/** Con un número fijo de decimales (4,5 con 2 → «4,50»). */
export const fmtFixed = (n: number, decimals: number) => fmt(Number(n.toFixed(decimals))).replace(/(,\d*)?$/, (m) => {
  if (!decimals) return m;
  const frac = (m.slice(1) || "").padEnd(decimals, "0");
  return `,${frac}`;
});
export function columnExpression(spec: ArithmeticSpec): string {
  return `${fmt(spec.a)} ${symbol(spec.op)} ${fmt(spec.b)}`;
}

/** Desarrollo completo para «Ver el desarrollo» y la solución. */
export function columnSolution(spec: ArithmeticSpec, strategy: SubtractStrategy = "prestamo"): string[] {
  const trace = columnTrace(spec, strategy);
  return [
    trace.scale
      ? `Escribe ${columnExpression(spec)} en columnas con la coma alineada (${fmtFixed(spec.a, trace.scale)} y ${fmtFixed(spec.b, trace.scale)}) y empieza por la derecha.`
      : `Escribe ${columnExpression(spec)} en columnas: unidades bajo unidades, decenas bajo decenas, y empieza por la derecha.`,
    ...trace.steps.map((s) => s.why),
    spec.op === "add"
      ? `Resultado: ${fmtFixed(trace.result, trace.scale)}. Comprobación: ${fmtFixed(trace.result, trace.scale)} − ${fmt(spec.b)} = ${fmt(spec.a)}.`
      : `Resultado: ${fmtFixed(trace.result, trace.scale)}. Comprobación: ${fmtFixed(trace.result, trace.scale)} + ${fmt(spec.b)} = ${fmt(spec.a)}.`,
  ];
}

/** Pistas de tres niveles: idea → primera columna → todo menos la última. */
export function columnHints(spec: ArithmeticSpec, strategy: SubtractStrategy = "prestamo"): [string, string, string] {
  const trace = columnTrace(spec, strategy);
  const { scale } = trace;
  const placeName = (column: number) => placeNameOf(column - scale);
  const the = (column: number) => `las ${placeName(column)}`;
  const first = trace.steps[0];
  const lastShown = trace.steps.slice(0, Math.max(1, trace.width - 1));
  const shown = lastShown.map((s) => s.digit).reverse().join("");
  const cut = shown.length - trace.scale;
  const partial = trace.scale && cut >= 0 ? `${shown.slice(0, cut)},${shown.slice(cut)}` : shown;
  const regroups = trace.steps.filter((s) => s.regroup).map((s) => placeName(s.column));
  return [
    (trace.scale ? "Alinea la coma y completa con ceros. " : "") +
    (spec.op === "add"
      ? "Alinea las cifras por su posición y suma columna por columna desde las unidades. Si una columna pasa de 9, llevas 1 a la siguiente."
      : strategy === "prestamo"
        ? "Alinea las cifras por su posición y resta desde las unidades. Si la cifra de arriba es menor, pide 1 a la columna de la izquierda: vale 10 en la tuya."
        : "Alinea las cifras por su posición y resta desde las unidades. Si la cifra de arriba es menor, suma 10 arriba y 1 abajo en la columna siguiente."),
    first.why,
    trace.width > 1
      ? `${regroups.length ? `Reagrupas en ${regroups.join(", ")}. ` : ""}Las últimas cifras del resultado son …${partial}: solo falta la columna de ${the(trace.width - 1)}.`
      : `El resultado tiene una sola cifra. ${first.why}`,
  ];
}

export interface ColumnBug {
  id: "sin-llevar" | "sin-reagrupar" | "menor-del-mayor" | "sin-devolver" | "cero-sin-restar" | "coma-desalineada";
  value: number;
  feedback: string;
}

/**
 * Errores sistemáticos clásicos del algoritmo (Brown y Burton, 1978), con un
 * feedback que nombra la columna donde aparece por primera vez. Solo los que
 * dan un resultado distinto del correcto y entre sí.
 */
export function columnBugs(spec: ArithmeticSpec): ColumnBug[] {
  const trace = columnTrace(spec);
  const { scale } = trace;
  const placeName = (column: number) => placeNameOf(column - scale);
  const one = (column: number) => oneOf(column - scale);
  const the = (column: number) => `las ${placeName(column)}`;
  const value = (digits: number[]) => Number((fromDigits(digits) / 10 ** scale).toFixed(scale));
  const n = trace.topDigits.length;
  const top = trace.topDigits, bottom = trace.bottomDigits;
  const bugs: ColumnBug[] = [];
  const firstRegroup = trace.steps.find((s) => s.regroup)?.column;
  if (spec.op === "add") {
    if (firstRegroup !== undefined) {
      const noCarry = value(top.map((t, i) => (t + bottom[i]) % 10));
      bugs.push({
        id: "sin-llevar",
        value: noCarry,
        feedback: `En ${the(firstRegroup)} la suma pasa de 9: escribiste la cifra de las unidades pero no llevaste 1 a ${the(firstRegroup + 1)}. Diez ${placeName(firstRegroup)} forman 1 ${one(firstRegroup + 1)}.`,
      });
      const glued = scale ? Number.NaN : Number(top.map((t, i) => String(t + bottom[i])).reverse().join(""));
      bugs.push({
        id: "sin-reagrupar",
        value: glued,
        feedback: `Escribiste la suma completa de cada columna una al lado de otra. En ${the(firstRegroup)} solo cabe una cifra: el resto se lleva a ${the(firstRegroup + 1)}.`,
      });
    }
  } else if (firstRegroup !== undefined) {
    bugs.push({
      id: "menor-del-mayor",
      value: value(top.map((t, i) => Math.abs(t - bottom[i]))),
      feedback: `En ${the(firstRegroup)} restaste la cifra menor de la mayor (${bottom[firstRegroup]} − ${top[firstRegroup]}). Siempre se resta la de abajo a la de arriba: como ${top[firstRegroup]} es menor, hay que reagrupar.`,
    });
    bugs.push({
      id: "sin-devolver",
      value: value(top.map((t, i) => (t < bottom[i] ? t + 10 : t) - bottom[i])),
      feedback: `Sumaste 10 en ${the(firstRegroup)} pero no lo compensaste en ${the(firstRegroup + 1)}: hay que quitar 1 arriba (pedir prestado) o sumar 1 abajo (compensar).`,
    });
    // Préstamo a través de un cero: el 0 pasa a 10 en lugar de a 9.
    let pending = 0;
    let crossedZero: number | undefined;
    const digits: number[] = [];
    let readable = true;
    for (let i = 0; i < n; i++) {
      let t = top[i] - pending;
      if (pending && top[i] === 0) {
        crossedZero ??= i;
        t = 10;
      }
      const needs = t < bottom[i] ? 1 : 0;
      const digit = t + 10 * needs - bottom[i];
      if (digit > 9) readable = false;
      digits.push(digit);
      pending = needs || (pending && top[i] === 0) ? 1 : 0;
    }
    if (crossedZero !== undefined && readable)
      bugs.push({
        id: "cero-sin-restar",
        value: value(digits),
        feedback: `En ${the(crossedZero)} el 0 recibe 10 de ${the(crossedZero + 1)}, pero también presta 1 a ${the(crossedZero - 1)}: queda 9, no 10.`,
      });
  }
  // Alinear por la derecha en lugar de por la coma (3,5 + 1,25 como 35 + 125).
  const [da, db] = [decimalsOf(spec.a), decimalsOf(spec.b)];
  if (da !== db) {
    const raw = (x: number) => Number(String(x).replace(".", ""));
    const misaligned = spec.op === "add" ? raw(spec.a) + raw(spec.b) : raw(spec.a) - raw(spec.b);
    if (misaligned >= 0)
      bugs.push({
        id: "coma-desalineada",
        value: Number((misaligned / 10 ** Math.max(da, db)).toFixed(Math.max(da, db))),
        feedback: "Alineaste las cifras por la derecha. Con decimales se alinea la coma: unidades bajo unidades, décimas bajo décimas; completa con ceros (3,5 = 3,50).",
      });
  }
  const seen = new Set([trace.result]);
  return bugs.filter((bug) => (!Number.isFinite(bug.value) || seen.has(bug.value) ? false : (seen.add(bug.value), true)));
}
