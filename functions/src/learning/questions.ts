import type { Example, Intent, Question } from "./types";
import { columnTrace, fmt } from "./algorithms/columns";
import { multiplyTrace } from "./algorithms/multiplication";
import { checkFactorWork, factorTrace, factorWorkFeedback } from "./algorithms/factors";
import { checkRuffiniWork, ruffiniTrace, ruffiniWorkFeedback } from "./algorithms/ruffini";
import {
  checkDivisionWork,
  checkOpenDivision,
  divisionAnswerText,
  divisionResponseCorrect,
  divisionResponseValue,
  divisionTrace,
  divisionWorkFeedback,
  isDecimalDivision,
} from "./algorithms/division";
import {
  operationBugs,
  operationExpression,
  operationHints,
  operationResult,
  operationSolution,
  isFactorSpec,
  isMultiplySpec,
  isRuffiniSpec,
  type ColumnSpec,
} from "./algorithms/operations";

export function numeric(
  id: string,
  prompt: string,
  answer: number,
  solution: string[],
  hints: [string, string, string],
  options: {
    intent?: Intent;
    unit?: string;
    step?: boolean;
    errors?: Question["errors"];
  } = {},
): Question {
  return {
    id,
    format: options.step ? "step" : "number",
    intent: options.intent ?? "procedure",
    prompt,
    answer,
    solution,
    explanation: solution.join(" "),
    hints,
    ...(options.unit ? { unit: options.unit } : {}),
    ...(options.errors ? { errors: options.errors } : {}),
  };
}
/**
 * Pregunta que se resuelve en columnas. El desarrollo, las pistas y los
 * errores previstos salen del mismo trazado (con «pedir prestado»; la hoja
 * los muestra también con «compensar»). `errors` extra se suman a los
 * errores sistemáticos del algoritmo.
 */
export function columnar(
  id: string,
  spec: ColumnSpec,
  options: {
    prompt?: string;
    intent?: Intent;
    unit?: string;
    errors?: Question["errors"];
  } = {},
): Question {
  const result = operationResult(spec);
  const errors = [
    ...operationBugs(spec).map(({ value, feedback }) => ({ value, feedback })),
    ...(options.errors ?? []),
  ].filter((e, i, all) => e.value !== result && all.findIndex((o) => o.value === e.value) === i);
  return {
    ...numeric(
      id,
      (options.prompt ??
        (isRuffiniSpec(spec)
          ? `Divide ${operationExpression(spec)} con la regla de Ruffini: completa la tabla y escribe el resto.`
          : isFactorSpec(spec)
          ? `Calcula el ${operationExpression(spec)} con la tabla de factores primos.`
          : isMultiplySpec(spec)
            ? `Multiplica en columnas: ${operationExpression(spec)}.`
          : spec.op === "divide"
            ? `Divide ${operationExpression(spec)} con la división larga: escribe ${divisionTrace(spec).decimals ? "cada resta y el cociente con su coma" : "el cociente, cada resta y el resto"}.`
            : `Calcula en columnas: ${operationExpression(spec)}.`)) +
        (spec.op === "divide" && isDecimalDivision(spec) && divisionTrace(spec).remainder
          ? ` Da el cociente truncado a ${divisionTrace(spec).decimals} cifras decimales.` : ""),
      result,
      operationSolution(spec),
      operationHints(spec),
      {
        intent: options.intent ?? "procedure",
        ...(options.unit ? { unit: options.unit } : {}),
        ...(errors.length ? { errors } : {}),
      },
    ),
    column: spec,
  };
}
export function columnExample(spec: ColumnSpec, prompt?: string): Example {
  const steps = isRuffiniSpec(spec)
    ? ruffiniTrace(spec).steps.map((step) => ({
        math: step.product === null ? `Bajas ${step.result}` : `${step.coefficient} + (${step.product}) = ${step.result}`,
        why: step.why,
      }))
    : isFactorSpec(spec)
    ? factorTrace(spec).rows.map((row) => ({ math: `${row.values.join("  ")} | ${row.prime}`, why: row.why }))
    : isMultiplySpec(spec)
    ? multiplyTrace(spec).steps
        .filter((step) => step.kind !== "row" || step.topIndex >= 0 || step.digit !== 0)
        .map((step) => ({
          math:
            step.kind === "comma"
              ? `${step.digit} decimales → ${fmt(multiplyTrace(spec).result)}`
              : `${step.kind === "sum" ? "Suma" : "Fila"} ${step.row + 1}: escribes ${step.digit}${step.carry ? `, llevas ${step.carry}` : ""}`,
          why: step.why,
        }))
    : spec.op === "divide"
      ? divisionTrace(spec).steps.map((step) => ({
          math: `${step.part} ÷ ${divisionTrace(spec).divisor} → ${step.digit}${step.down !== null ? `, bajas el ${step.down}` : ""}`,
          why: step.why,
        }))
      : columnTrace(spec).steps.map((step) => ({
          math: `${step.workTop} ${spec.op === "add" ? "+" : "−"} ${step.workBottom} → escribes ${step.digit}`,
          why: step.why,
        }));
  return {
    prompt: prompt ?? `Calcula ${operationExpression(spec)}.`,
    steps,
    conclusion: operationSolution(spec).at(-1)!,
    column: spec,
  };
}
/** Una opción es su texto o `[texto, feedback]`: el feedback propio explica
 *  el error concreto de esa alternativa en vez de revelar la idea correcta. */
export type ChoiceLabel = string | [string, string];
export function choice(
  id: string,
  prompt: string,
  labels: ChoiceLabel[],
  correct: number,
  explanation: string,
  intent: Intent = "concept",
): Question {
  return {
    id,
    format: "choice",
    intent,
    prompt,
    answer: `c${correct}`,
    choices: labels.map((item, i) => {
      const [label, feedback] = typeof item === "string" ? [item] : item;
      return {
        id: `c${i}`,
        label,
        ...(i !== correct
          ? { feedback: feedback ?? `Revisa esa afirmación: ${explanation}` }
          : {}),
      };
    }),
    solution: [explanation],
    explanation,
    hints: [
      "Identifica qué representa cada cantidad antes de elegir.",
      "Contrasta cada alternativa con la idea de la clase; puedes volver a los ejemplos.",
      explanation,
    ],
  };
}
export function example(
  prompt: string,
  steps: [string, string][],
  conclusion: string,
): Example {
  return {
    prompt,
    steps: steps.map(([math, why]) => ({ math, why })),
    conclusion,
  };
}

/** Se aceptan coma/punto decimal y fracciones equivalentes, nunca eval(). */
export function parseNumber(value: string): number | null {
  const clean = value.trim().replace(/−/g, "-").replace(/,/g, ".");
  if (
    !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+))?$/.test(
      clean,
    )
  )
    return null;
  const [numerator, denominator = "1"] = clean
    .split("/")
    .map((part) => part.trim());
  const bottom = Number(denominator);
  const result = Number(numerator) / bottom;
  return bottom !== 0 && Number.isFinite(result) && Math.abs(result) <= 1e9
    ? result
    : null;
}
/** Longitud máxima de una respuesta: la galera envía el procedimiento completo. */
export const MAX_RESPONSE_LENGTH = 160;

export function isAnswerCorrect(question: Question, response: string): boolean {
  if (question.format === "choice") return response === question.answer;
  if (question.column?.op === "divide") return divisionResponseCorrect(question.column, response);
  if (question.column && isFactorSpec(question.column)) {
    const work = checkFactorWork(question.column, response);
    if (work) return work.correct;
  }
  if (question.column && isRuffiniSpec(question.column)) {
    const work = checkRuffiniWork(question.column, response);
    if (work) return work.correct;
  }
  const value = parseNumber(response);
  return (
    value !== null &&
    typeof question.answer === "number" &&
    Math.abs(value - question.answer) < 1e-8
  );
}
/** La respuesta correcta tal como se escribe (en una división con resto,
 *  «cociente r resto»). */
export function correctResponse(question: Question): string {
  return question.column?.op === "divide" ? divisionAnswerText(question.column) : String(question.answer);
}
/** Valor numérico con el que se buscan los errores previstos. */
export function responseValue(question: Question, response: string): number | null {
  if (question.column?.op === "divide") return divisionResponseValue(question.column, response);
  if (question.column && isFactorSpec(question.column)) {
    const work = checkFactorWork(question.column, response);
    if (work) return work.answer;
  }
  if (question.column && isRuffiniSpec(question.column)) {
    const work = checkRuffiniWork(question.column, response);
    if (work) return Number.isFinite(work.remainder) ? work.remainder : null;
  }
  return parseNumber(response);
}
export function errorFeedback(question: Question, response: string): string {
  if (question.format === "choice") {
    const feedback = question.choices?.find(
      (choice) => choice.id === response,
    )?.feedback;
    if (feedback) return feedback;
  }
  const value = question.format === "choice" ? response : responseValue(question, response);
  const error = question.errors?.find((item) =>
    typeof item.value === "number" && typeof value === "number"
      ? Math.abs(item.value - value) < 1e-8
      : item.value === value,
  );
  if (error) return error.feedback;
  if (question.column && isFactorSpec(question.column)) {
    const work = checkFactorWork(question.column, response);
    const text = work && factorWorkFeedback(question.column, work);
    if (text) return text;
  }
  if (question.column && isRuffiniSpec(question.column)) {
    const work = checkRuffiniWork(question.column, response);
    const text = work && ruffiniWorkFeedback(question.column, work);
    if (text) return text;
  }
  if (question.column?.op === "divide") {
    const work = checkDivisionWork(question.column, response);
    if (work?.firstError) return divisionWorkFeedback(question.column, work.firstError, work.layout);
    if (work && !work.commaCorrect)
      return divisionTrace(question.column).decimals
        ? "Las cifras del cociente están bien; revisa la coma: se pone en el cociente justo al bajar la primera cifra decimal del dividendo."
        : "Las cifras del cociente están bien, pero este cociente no lleva coma: todas sus cifras salen de la parte entera.";
    const open = checkOpenDivision(question.column, response);
    if (open && !open.quotientCorrect)
      return "El cociente no es correcto. Comprueba con la multiplicación: cociente × divisor + resto tiene que dar el dividendo.";
    if (open?.mismatch)
      return divisionWorkFeedback(question.column, open.mismatch, open.mismatch.kind === "p" ? "completa" : "abreviada");
    if (value !== null && !isDecimalDivision(question.column)) {
      const { quotient, remainder } = divisionTrace(question.column);
      if (value === quotient)
        return `El cociente es correcto; falta el resto o no es ${remainder === 0 ? "0" : "ese"}. Escríbelo así: ${quotient} r ${remainder}.`;
    }
  }
  if (question.format !== "choice" && value === null)
    return question.column?.op === "divide"
      ? isDecimalDivision(question.column)
        ? "Completa la galera, o escribe el cociente con su coma, por ejemplo 0,75."
        : "Completa la galera, o escribe el cociente y el resto así: 52 r 3."
      : "Escribe un número, un decimal con coma o punto, o una fracción como 3/4. Revisa que el denominador sea distinto de cero.";
  return "Revisa qué cantidad buscas y qué representa cada dato. Puedes consultar la clase o pedir una pista antes de intentarlo otra vez.";
}
