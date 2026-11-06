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
          : `${part} es menor que ${b}: cabe 0 veces. Escribes 0 en el cociente; sin ese 0, las demás cifras cambiarían de lugar.`,
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
      feedback: `Al llegar a ${zero.part}, que es menor que ${spec.b}, hay que escribir 0 en el cociente antes de bajar la cifra siguiente. Sin ese 0 el cociente pierde una posición: comprueba que ${fmt(value)} × ${spec.b} queda lejos de ${fmt(spec.a)}.`,
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
