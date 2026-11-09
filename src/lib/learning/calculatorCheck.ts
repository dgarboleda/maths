/** Comprobación bajo demanda: nunca modifica la cuenta ni entrega la solución. */
import { calculateExpression, calculateManyExact } from "./exactEvaluation";
import { checkFactorWork, factorWorkFeedback, isPrime, validFactorSpec, type FactorSpec } from "./core";
import { validateManualSetup, validManualNumber, type ExactOp, type WorkOp } from "./exactCalculator";

export interface CheckReport { ok: boolean; message: string; details: string[] }
export interface ManualStep { operation: string; result: string; left?: string; right?: string; operator?: string }
export interface ManualFactorRow { divisor: string; cells: string[] }
const issue = (message: string, details: string[] = []): CheckReport => ({ ok: false, message, details });
const hint = (op: WorkOp): string => {
  switch (op) {
    case "add": case "subtract": return "Busca un denominador común, transforma cada fracción y opera los numeradores; revisa también los signos.";
    case "multiply": return "Multiplica los numeradores entre sí y los denominadores entre sí; después puedes simplificar.";
    case "divide": return "Comprueba que el divisor no sea cero y multiplica por su fracción inversa.";
    case "simplify": return "Divide numerador y denominador entre un mismo factor común.";
    case "mcm": return "Multiplica los factores primos de la tabla hasta incluir todos los números.";
    case "mcd": return "Busca los factores primos comunes a todos los números.";
    case "expression": return "Empieza por los paréntesis; después revisa multiplicaciones y divisiones antes de sumas y restas.";
  }
};
const equal = (actual: string, expected: string): boolean => {
  const evaluated = calculateExpression(actual);
  return "value" in evaluated && evaluated.value === expected;
};

/** Revisa las filas escritas sin exigir un orden concreto de los primos. */
function checkFactors(op: "mcm" | "mcd", raw: string[], rows: ManualFactorRow[]): string | null {
  const lastUsed = rows.reduce((last, row, index) => row.divisor.trim() || row.cells.some((cell) => cell.trim()) ? index : last, -1);
  const used = rows.slice(0, lastUsed + 1);
  const integers = raw.map((v) => BigInt(v.trim().replace(/[−–]/g, "-")));
  if (integers.some((v) => v === BigInt(0))) return "La revisión de la tabla no admite el cero; el resultado se comprueba por separado.";
  const abs = (value: bigint) => value < BigInt(0) ? -value : value;
  const gcd = (a: bigint, b: bigint): bigint => b === BigInt(0) ? abs(a) : gcd(b, a % b);
  if (!used.length) {
    if ((op === "mcd" && integers.reduce(gcd) === BigInt(1)) || (op === "mcm" && integers.every((value) => abs(value) === BigInt(1)))) return null;
    return "No hay filas de factores escritas para revisar.";
  }
  let previous = integers;
  let allCommon = true;
  for (const [index, row] of used.entries()) {
    const n = index + 1;
    if (!/^\d+$/.test(row.divisor.trim()) || row.cells.slice(0, raw.length).length < raw.length || row.cells.slice(0, raw.length).some((cell) => !/^[+-]?\d+$/.test(cell.trim().replace(/[−–]/g, "-")))) return `Completa el divisor y todos los números de la fila ${n}.`;
    const prime = BigInt(row.divisor.trim());
    if (prime > BigInt(1000000)) return `El divisor de la fila ${n} es demasiado grande para comprobar si es primo.`;
    if (!isPrime(Number(prime))) return `Revisa el divisor de la fila ${n}: debe ser un número primo.`;
    if (!previous.some((value) => value % prime === BigInt(0))) return `Revisa la fila ${n}: el divisor debe dividir al menos uno de sus números.`;
    if (!previous.every((value) => value % prime === BigInt(0))) allCommon = false;
    const next = previous.map((value) => value % prime === BigInt(0) ? value / prime : value);
    if (next.some((value, column) => value !== BigInt(row.cells[column].trim().replace(/[−–]/g, "-")))) return `Revisa la fila ${n}: divide los números que se puedan y baja los demás sin cambiarlos.`;
    previous = next;
  }
  const spec: FactorSpec = { op, values: raw.map(Number) };
  if (validFactorSpec(spec)) {
    const encoded = `T0;${used.map((row) => `${row.divisor.trim()}:${row.cells.slice(0, raw.length).map((v) => v.trim()).join(".")}`).join("|")}`;
    const checked = checkFactorWork(spec, encoded);
    if (checked?.problem) return factorWorkFeedback(spec, checked);
  } else {
    const commonDone = op === "mcd" && allCommon && previous.reduce(gcd) === BigInt(1);
    if (!commonDone && previous.some((value) => abs(value) !== BigInt(1))) return op === "mcd" ? "La tabla aún no termina: comprueba si quedan divisores comunes." : "La tabla aún no termina: continúa hasta que todos los números sean 1.";
  }
  return null;
}

/** Comprueba equivalencias escritas, sin imponer el mínimo común múltiplo. */
export function checkCommonDenominator(values: string[], equivalents: string[]): string | null {
  if (!equivalents.slice(0, values.length).some((value) => value?.trim())) return null;
  const denominators: bigint[] = [];
  for (const [index, original] of values.entries()) {
    const equivalent = equivalents[index]?.trim() ?? "";
    if (!equivalent) return `Completa la fracción equivalente del número ${index + 1}.`;
    if (!validManualNumber(equivalent)) return `Revisa el formato de la fracción equivalente del número ${index + 1}.`;
    const originalValue = calculateExpression(original);
    if ("problem" in originalValue || !equal(equivalent, originalValue.value)) return `La fracción equivalente del número ${index + 1} no representa la misma cantidad. Multiplica o divide el numerador y el denominador por el mismo número.`;
    const normalized = equivalent.replace(/[−–]/g, "-").replace(/\s/g, "");
    const fraction = /^([+-]?\d+)\/([+-]?\d+)$/.exec(normalized);
    if (!fraction && !/^[+-]?\d+$/.test(normalized)) return `Escribe el número ${index + 1} como fracción para comparar los denominadores.`;
    const denominator = fraction ? BigInt(fraction[2]) : BigInt(1);
    denominators.push(denominator);
  }
  if (denominators.some((denominator) => denominator !== denominators[0])) return "Las fracciones son equivalentes, pero sus denominadores aún no son iguales. Busca un múltiplo común.";
  return null;
}

export function checkManualWork(op: WorkOp, values: string[], expression: string, steps: ManualStep[], rows: ManualFactorRow[], result: string, equivalents: string[] = []): CheckReport {
  const setup = validateManualSetup(op, values, expression);
  if (setup) return issue(setup);
  const expected = op === "expression" ? calculateExpression(expression) : calculateManyExact(op as ExactOp, values);
  if ("problem" in expected) return issue(expected.problem);
  const details: string[] = [];
  let procedureHasIssue = false;
  if ((op === "add" || op === "subtract") && equivalents.slice(0, values.length).some((value) => value?.trim())) {
    const problem = checkCommonDenominator(values, equivalents);
    if (problem) { details.push(problem); procedureHasIssue = true; }
    else details.push("Las fracciones equivalentes representan las mismas cantidades y tienen un denominador común.");
  }
  if (op === "mcm" || op === "mcd") {
    const problem = checkFactors(op, values, rows);
    if (problem) { details.push(problem); procedureHasIssue = true; }
    else details.push(rows.some((row) => row.divisor.trim() || row.cells.some((cell) => cell.trim())) ? "La tabla de factores está bien formada y completa." : "No hace falta escribir filas de factores para estos números.");
  }
  for (const [index, step] of steps.entries()) {
    const structured = step.left !== undefined;
    const operation = structured ? `(${step.left ?? ""}) ${step.operator ?? "+"} (${step.right ?? ""})` : step.operation.trim();
    if (!operation && !step.result.trim()) continue;
    if ((structured && (!step.left || !step.right)) || !operation || !step.result.trim()) { details.push(`Completa el paso ${index + 1} para poder revisarlo.`); procedureHasIssue = true; break; }
    const calculation = calculateExpression(operation);
    if ("problem" in calculation || !validManualNumber(step.result)) { details.push(`No pude interpretar el paso ${index + 1}. Revisa sus números y signos.`); procedureHasIssue = true; break; }
    if (!equal(step.result, calculation.value)) { details.push(`Revisa el resultado del paso ${index + 1} y la operación que escribiste.`); procedureHasIssue = true; break; }
    details.push(`El cálculo del paso ${index + 1} es correcto.`);
  }
  if (!validManualNumber(result, op === "mcm" || op === "mcd")) return issue("Escribe un resultado válido para comprobarlo.", details);
  if (!equal(result, expected.value)) return issue("Revisa el resultado final.", [...details, hint(op)]);
  if (op === "simplify") {
    const normalized = result.trim().replace(/[−–]/g, "-").replace(/\s/g, "");
    const fraction = /^([+-]?\d+)\/([+-]?\d+)$/.exec(normalized);
    const gcd = (a: bigint, b: bigint): bigint => b === BigInt(0) ? (a < BigInt(0) ? -a : a) : gcd(b, a % b);
    if ((fraction && (BigInt(fraction[2]) < BigInt(0) || gcd(BigInt(fraction[1]), BigInt(fraction[2])) !== BigInt(1))) || (!fraction && expected.value.includes("/"))) return issue("La fracción es equivalente, pero aún puedes simplificarla o escribirla con el signo en el numerador.", details);
  }
  if (procedureHasIssue) return issue("El resultado final es correcto; revisa las indicaciones del procedimiento.", details);
  if (!details.length) details.push("No hay pasos escritos para revisar; solo se comprobó el resultado.");
  else if (op !== "mcm" && op !== "mcd") details.push("Se revisó cada cálculo escrito; comprueba que los pasos representen la cuenta original.");
  return { ok: true, message: "El resultado final es correcto.", details };
}
