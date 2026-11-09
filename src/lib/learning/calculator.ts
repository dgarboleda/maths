/**
 * Calculadora en columnas: la lógica sin interfaz. Convierte lo que escribe
 * el alumno en la cuenta que se dibuja (suma, resta, multiplicación o
 * división), con los mismos límites que las hojas, y describe cada cuenta
 * terminada para la cadena de resultados. No calcula por el alumno: el
 * resultado es siempre el que él escribe en la hoja.
 */
import {
  divisionTrace,
  exactPlaces,
  isDecimalDivision,
  multiplyScaled,
  multiplyTrace,
  quotientValue,
  scaled,
  validColumnSpec,
  validDivisionSpec,
  validMultiplySpec,
  type ArithmeticSpec,
  type DivisionSpec,
  type MultiplySpec,
} from "./core";

export const CALCULATOR_OPS = [
  { id: "add", label: "Sumar" },
  { id: "subtract", label: "Restar" },
  { id: "multiply", label: "Multiplicar" },
  { id: "divide", label: "Dividir" },
] as const;
export type CalculatorOp = (typeof CALCULATOR_OPS)[number]["id"];
export type CalculatorSpec = ArithmeticSpec | MultiplySpec | DivisionSpec;

const SYMBOL: Record<CalculatorOp, string> = { add: "+", subtract: "−", multiply: "×", divide: "÷" };

/** Cifras y, como mucho, una coma decimal (el punto se lee como coma). */
export function decimalInput(text: string): string {
  const normalized = text.replace(/[−–]/g, "-");
  const sign = normalized.startsWith("-") ? "-" : "";
  const clean = normalized.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [int, ...rest] = clean.split(",");
  return sign + (rest.length ? `${int},${rest.join("")}` : int);
}

/**
 * La cuenta que se escribe con dos números, o por qué no se puede. Con coma
 * (o si se pide seguir con decimales), la división continúa hasta ser exacta
 * o hasta las milésimas.
 */
export function calculatorSpec(
  op: CalculatorOp,
  a: string,
  b: string,
  continueDecimal = false,
): { spec: CalculatorSpec } | { problem: string } {
  const [x, y] = [Number(a.replace(",", ".")), Number(b.replace(",", "."))];
  if (!a || !b || !Number.isFinite(x) || !Number.isFinite(y)) return { problem: "Escribe los dos números." };
  if (/,\d{4,}/.test(`${a} ${b}`)) return { problem: "Usa como mucho tres decimales." };
  if (op === "divide" && /,\d{3,}/.test(b)) return { problem: "En la división, el divisor puede tener como mucho dos decimales." };
  if (op === "subtract" && x < y) return { problem: "En la resta, el primer número no puede ser menor que el segundo." };
  if (op === "divide" && y === 0) return { problem: "No se puede dividir entre 0." };
  if (op === "multiply" && (x === 0 || y === 0)) return { problem: "Multiplicar por 0 da 0: no hace falta escribir la cuenta." };
  if (op === "multiply") {
    // Arriba va el factor de más cifras; se conservan los ceros decimales escritos (2,50).
    const scale = (value: string) => (value.split(",")[1] ?? "").length;
    const swap = String(multiplyScaled({ op, a: y, b: x }).A).length > String(multiplyScaled({ op, a: x, b: y }).A).length;
    const spec: MultiplySpec = swap
      ? { op, a: y, b: x, scaleA: scale(b), scaleB: scale(a) }
      : { op, a: x, b: y, scaleA: scale(a), scaleB: scale(b) };
    return validMultiplySpec(spec) ? { spec } : { problem: "El factor más corto puede tener hasta 3 cifras, y el otro, hasta 6." };
  }
  if (op === "divide") {
    if (y > 999 || Math.round(y * 10 ** (b.split(",")[1]?.length ?? 0)) > 999) return { problem: "El divisor puede tener hasta 3 cifras." };
    let spec: DivisionSpec = { op, a: x, b: y };
    if (isDecimalDivision(spec) || a.includes(",") || b.includes(",") || continueDecimal) spec = { ...spec, places: Math.max(continueDecimal ? 1 : 0, exactPlaces(x, y, 3) ?? 3) };
    return validDivisionSpec(spec) ? { spec } : { problem: "Usa números menores que 10 000 000." };
  }
  // Los mismos límites que la hoja: así nunca se dibuja una cuenta que no puede trazar.
  const spec: ArithmeticSpec = { op, a: x, b: y };
  return validColumnSpec(spec) ? { spec } : { problem: "Usa números menores que 10 000 000." };
}

/** ¿Lleva coma el resultado (o puede llevarla)? Entonces la hoja ofrece la tecla «,». */
export function hasDecimals(spec: CalculatorSpec): boolean {
  if (spec.op === "multiply") return multiplyTrace(spec).scale > 0;
  if (spec.op === "divide") return isDecimalDivision(spec);
  return scaled(spec).scale > 0;
}

/** Resultado escrito en la hoja (en la galera, el cociente con su coma). */
export function calculatorResult(spec: CalculatorSpec, response: string): string {
  if (spec.op === "divide") {
    const written = /^L(\d+(?:,\d+)?|,\d+);/.exec(response)?.[1];
    return written ? String(quotientValue(written)).replace(".", ",") : "";
  }
  return response;
}

/** Una cuenta terminada de la cadena: lo que se calculó y lo que escribió el alumno. */
export interface CalculatorEntry {
  op: CalculatorOp;
  a: string;
  b: string;
  result: string;
  /** División con decimales que no es exacta: el resultado es aproximado. */
  approximate?: boolean;
  /** División de enteros: el resto que escribió el alumno en la última fila. */
  remainder?: string;
}

/** La cuenta terminada, con lo que escribió el alumno (también el resto de la galera). */
export function calculatorEntry(op: CalculatorOp, a: string, b: string, spec: CalculatorSpec, response: string): CalculatorEntry {
  const result = calculatorResult(spec, response);
  if (spec.op !== "divide") return { op, a, b, result };
  if (isDecimalDivision(spec)) return { op, a, b, result, ...(divisionTrace(spec).remainder !== 0 ? { approximate: true } : {}) };
  const remainder = response.split(";")[1]?.split(",").at(-1)?.replace(/^0+(?=\d)/, "");
  return { op, a, b, result, ...(remainder && remainder !== "0" ? { remainder } : {}) };
}

/** «347 + 285 = 632», «17 ÷ 5 = 3 (resto 2)» o «10 ÷ 3 ≈ 3,333». */
export function entryText(entry: CalculatorEntry): string {
  return `${entry.a} ${SYMBOL[entry.op]} ${entry.b} ${entry.approximate ? "≈" : "="} ${entry.result}${entry.remainder ? ` (resto ${entry.remainder})` : ""}`;
}
