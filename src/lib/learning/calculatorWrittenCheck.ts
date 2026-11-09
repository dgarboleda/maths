import { checkOpenDivision, columnTrace, multiplyTrace, placeName } from "./core";
import { calculateExpression, calculateManyExact } from "./exactEvaluation";
import type { CalculatorSpec, CalculatorOp } from "./calculator";
import type { CheckReport } from "./calculatorCheck";
import type { ColumnDraft } from "@/components/learning/ColumnOperation";
import type { MultiplyDraft } from "@/components/learning/MultiplyOperation";
import type { SubtractStrategy } from "./core";

const issue = (message: string, details: string[] = []): CheckReport => ({ ok: false, message, details });

/** Comprueba solo lo que puede interpretar; las anotaciones libres no se corrigen. */
export function checkWrittenWork(spec: CalculatorSpec, work: string, draft: ColumnDraft | MultiplyDraft | undefined, strategy: SubtractStrategy): CheckReport & { wrongColumn?: number } {
  if (spec.op === "divide") {
    const check = checkOpenDivision(spec, work);
    if (!check) return issue("Escribe el cociente y al menos una fila de la división para comprobarlos.");
    if (!check.quotientCorrect) return issue("Revisa el cociente y comprueba que hayas escrito todas sus cifras.");
    if (check.mismatch) return issue(`El cociente es correcto. Revisa o completa el procedimiento desde el paso ${check.mismatch.step + 1}.`);
    return { ok: true, message: "El cociente y el procedimiento escrito son correctos.", details: [] };
  }
  if (!draft || !Array.isArray(draft.digits) || !draft.digits.some(Boolean)) return issue("Escribe al menos una cifra del resultado para comprobarla.");
  if (spec.op === "multiply") {
    const trace = multiplyTrace(spec);
    const scratch = (draft as MultiplyDraft).scratch ?? [];
    for (const [rowIndex, row] of scratch.entries()) {
      if (!row.some(Boolean)) continue;
      const matches = trace.partials.some((partial) => row.every((value, column) => !value || Number(value) === (partial.digits[column] ?? 0))) || (trace.bottomDigits.includes(0) && row.every((value) => !value || Number(value) === 0));
      if (!matches) return issue(`Revisa el producto parcial de la fila ${rowIndex + 1}: multiplica por una cifra del segundo factor y comprueba la posición.`);
    }
    if (!work) return issue("Completa las casillas del resultado para comprobarlo.");
    const expected = calculateManyExact("multiply", [String(spec.a), String(spec.b)]);
    const answer = calculateManyExact("simplify", [work]);
    if ("problem" in expected || "problem" in answer || expected.value !== answer.value) return issue("Revisa el producto final. Comprueba los productos parciales, la suma y la coma decimal.");
    return { ok: true, message: "El resultado final es correcto.", details: [scratch.some((row) => row.some(Boolean)) ? "Las cifras de productos parciales escritas son compatibles; no se han comprobado el orden ni las llevadas." : "No hay productos parciales escritos para revisar."] };
  }
  const trace = columnTrace(spec, strategy);
  for (const [column, value] of draft.digits.entries()) {
    if (value && Number(value) !== (trace.resultDigits[column] ?? 0)) {
      return { ...issue(`Revisa la cifra de las ${placeName(column - trace.scale)} y las llevadas o préstamos de esa columna.`), wrongColumn: column };
    }
  }
  if (!work) return issue("Completa las casillas del resultado para comprobarlo.");
  const expected = calculateManyExact(spec.op, [String(spec.a), String(spec.b)]);
  const answer = calculateManyExact("simplify", [work]);
  if ("problem" in expected || "problem" in answer || expected.value !== answer.value) return issue("Completa las cifras que faltan y, si usas decimales, revisa la posición de la coma.");
  return { ok: true, message: "El resultado final es correcto.", details: ["Las notas de llevadas o préstamos no se han comprobado."] };
}

export function checkSignedWork(written: { op: CalculatorOp; a: string; b: string }, result: string, steps: string): CheckReport {
  const expected = calculateManyExact(written.op, [written.a, written.b]);
  const answer = calculateManyExact("simplify", [result]);
  if ("problem" in expected) return issue(expected.problem);
  if ("problem" in answer) return issue("Escribe un resultado válido para comprobarlo.");
  if (expected.value !== answer.value) return issue("Revisa el resultado y las reglas de los signos.");
  if (steps.trim()) {
    const parts = steps.split("=");
    if (parts.length !== 2) return issue("El resultado final es correcto, pero no pude revisar los pasos.", ["Escribe el paso como una operación seguida del signo igual y su resultado."]);
    const left = calculateExpression(parts[0]), right = calculateExpression(parts[1]);
    if ("problem" in left || "problem" in right) return issue("El resultado final es correcto, pero no pude interpretar el paso escrito.");
    if (left.value !== right.value) return issue("El resultado final es correcto, pero revisa la operación y los signos del paso escrito.");
    return { ok: true, message: "El resultado final es correcto.", details: ["El cálculo del paso escrito es correcto; comprueba que corresponda a la cuenta original."] };
  }
  return { ok: true, message: "El resultado final es correcto.", details: ["No hay pasos escritos para revisar."] };
}
