import { checkOpenDivision, columnTrace, divisionRowVariants, divisionTrace, isDecimalDivision, multiplyTrace, placeName } from "./core";
import { calculateExpression, calculateManyExact } from "./exactEvaluation";
import type { CalculatorSpec, CalculatorOp } from "./calculator";
import type { CheckReport } from "./calculatorCheck";
import type { ColumnDraft } from "@/components/learning/ColumnOperation";
import type { DivisionDraft } from "@/components/learning/DivisionOperation";
import type { MultiplyDraft } from "@/components/learning/MultiplyOperation";
import type { SubtractStrategy } from "./core";

const issue = (message: string, details: string[] = []): CheckReport => ({ ok: false, message, details });

/** Comprueba solo lo que puede interpretar; las anotaciones libres no se corrigen. */
export function checkWrittenWork(spec: CalculatorSpec, work: string, draft: ColumnDraft | MultiplyDraft | DivisionDraft | undefined, strategy: SubtractStrategy): CheckReport & { wrongColumn?: number } {
  if (spec.op === "divide") {
    const check = checkOpenDivision(spec, work);
    if (!check) return issue("Escribe el cociente y al menos una fila de la división para comprobarlos.");
    if (!check.quotientCorrect) return issue("Revisa el cociente y comprueba que hayas escrito todas sus cifras.");
    if (check.mismatch) return issue(`El cociente es correcto. Revisa o completa el procedimiento desde el paso ${check.mismatch.step + 1}.`);
    const divisionDraft = draft as DivisionDraft | undefined;
    let alignmentChecked = false;
    if (divisionDraft && Array.isArray(divisionDraft.rows)) {
      const writtenRows = divisionDraft.rows.filter((row) => Array.isArray(row) && row.some(Boolean));
      const trace = divisionTrace(spec);
      const matching = divisionRowVariants(spec).filter((variant) => variant.length === writtenRows.length && variant.every((row, i) => Number(writtenRows[i].join("")) === row.value));
      if (matching.length) {
        alignmentChecked = true;
        const aligned = matching.some((variant) => variant.every((row, i) => {
          const start = writtenRows[i].findIndex(Boolean);
          const end = writtenRows[i].reduce((last, digit, column) => digit ? column : last, -1);
          if (writtenRows[i].slice(start, end + 1).some((digit) => !digit)) return false;
          const step = trace.steps[row.step];
          const first = step.end + (row.kind === "r" && step.down !== null ? 1 : 0);
          const nextStep = variant[i + 1]?.step ?? trace.steps.length;
          const last = row.kind === "r" && nextStep > row.step + 1 ? (trace.steps[nextStep]?.end ?? trace.dividendDigits.length - 1) : first;
          return end >= first && end <= last;
        }));
        if (!aligned) return issue("Los valores son correctos, pero revisa la alineación de las cifras bajo el dividendo.");
      }
    }
    const approximate = isDecimalDivision(spec) && divisionTrace(spec).remainder !== 0;
    return { ok: true, message: approximate ? "El cociente aproximado y las filas escritas son correctos." : "El cociente y las filas escritas son correctos.", details: [alignmentChecked ? "Se revisaron los valores, el orden y la alineación de las filas." : "Se revisaron los valores y el orden de las filas; no se pudo comprobar la alineación.", ...(approximate ? ["Todavía queda resto, así que el cociente es una aproximación."] : [])] };
  }
  if (!draft || !("digits" in draft) || !Array.isArray(draft.digits) || !draft.digits.some(Boolean)) return issue("Escribe al menos una cifra del resultado para comprobarla.");
  if (spec.op === "multiply") {
    const trace = multiplyTrace(spec);
    const scratch = (draft as MultiplyDraft).scratch ?? [];
    // Cada fila escrita debe corresponder a un producto parcial distinto.
    // Se aceptan filas incompletas y cualquier orden, sin reutilizar un factor.
    const candidates = [...trace.partials.map((partial) => partial.digits), ...trace.bottomDigits.filter((digit) => digit === 0).map(() => [0])];
    const writtenRows = scratch.map((row, index) => ({ row, index })).filter(({ row }) => row.some(Boolean));
    const assigned = new Set<number>();
    const assign = (at: number): boolean => {
      if (at === writtenRows.length) return true;
      const row = writtenRows[at].row;
      for (let i = 0; i < candidates.length; i++) {
        if (assigned.has(i) || !row.every((value, column) => !value || Number(value) === (candidates[i][column] ?? 0))) continue;
        assigned.add(i);
        if (assign(at + 1)) return true;
        assigned.delete(i);
      }
      return false;
    };
    if (!assign(0)) return issue("Revisa los productos parciales: cada fila debe corresponder a una cifra distinta del segundo factor y estar bien alineada.");
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
  for (const [column, note] of (draft as ColumnDraft).notes.entries()) {
    if (!note) continue;
    const step = trace.steps[column];
    if (!step) return issue(`Revisa la anotación de las ${placeName(column - trace.scale)}.`);
    if (spec.op === "add") {
      const carry = column > 0 ? trace.steps[column - 1]?.regroup ?? 0 : 0;
      if (Number(note) !== carry) return issue(`Revisa la llevada anotada en las ${placeName(column - trace.scale)}.`);
    } else if (strategy === "prestamo" && step.workTop !== step.top) {
      const accepted = [step.workTop, 1];
      if (column > 0 && trace.steps[column - 1]?.regroup) accepted.push(step.top === 0 ? 10 : step.top - 1);
      if (!accepted.includes(Number(note))) return issue(`Revisa el préstamo anotado en las ${placeName(column - trace.scale)}.`);
    } else if (strategy === "compensacion" && (step.workTop !== step.top || step.workBottom !== step.bottom)) {
      const accepted = [step.workTop, step.workBottom, 1];
      if (step.regroup) accepted.push(10);
      if (!accepted.includes(Number(note))) return issue(`Revisa la compensación anotada en las ${placeName(column - trace.scale)}.`);
    }
  }
  if (!work) return issue("Completa las casillas del resultado para comprobarlo.");
  const expected = calculateManyExact(spec.op, [String(spec.a), String(spec.b)]);
  const answer = calculateManyExact("simplify", [work]);
  if ("problem" in expected || "problem" in answer || expected.value !== answer.value) return issue("Completa las cifras que faltan y, si usas decimales, revisa la posición de la coma.");
  return { ok: true, message: "El resultado final es correcto.", details: [spec.op === "add" ? "Se revisaron las llevadas escritas; las casillas vacías son opcionales." : strategy === "prestamo" ? "Se revisaron las anotaciones en columnas con préstamo; otras notas pueden representar pasos intermedios." : "Se revisaron las anotaciones de compensación reconocibles; otras pueden representar pasos intermedios."] };
}

export function checkSignedWork(written: { op: CalculatorOp; a: string; b: string }, result: string, steps: string): CheckReport {
  const expected = calculateManyExact(written.op, [written.a, written.b]);
  const answer = calculateManyExact("simplify", [result]);
  if ("problem" in expected) return issue(expected.problem);
  if ("problem" in answer) return issue("Escribe un resultado válido para comprobarlo.");
  if (expected.value !== answer.value) {
    const expectedNumerator = BigInt(expected.value.split("/")[0]);
    const actualNumerator = BigInt(answer.value.split("/")[0]);
    if (actualNumerator !== BigInt(0) && (actualNumerator < BigInt(0)) !== (expectedNumerator < BigInt(0))) return issue("Revisa el resultado y las reglas de los signos.");
    if (written.op === "divide" && expected.value.includes("/")) {
      let denominator = BigInt(expected.value.split("/")[1]);
      while (denominator % BigInt(2) === BigInt(0)) denominator /= BigInt(2);
      while (denominator % BigInt(5) === BigInt(0)) denominator /= BigInt(5);
      if (denominator !== BigInt(1)) return issue("Este cociente tiene decimales periódicos y aquí solo se comprueban resultados exactos.", ["Para comprobar una fracción exacta, usa «Fracciones y MCM»."]);
    }
    return issue("Revisa el resultado y las reglas de los signos.");
  }
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
