import type { Example, Intent, Question } from "./types";
import { columnTrace } from "./algorithms/columns";
import {
  checkDivisionWork,
  divisionAnswerText,
  divisionResponseCorrect,
  divisionResponseValue,
  divisionTrace,
  divisionWorkFeedback,
} from "./algorithms/division";
import {
  operationBugs,
  operationExpression,
  operationHints,
  operationResult,
  operationSolution,
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
      options.prompt ??
        (spec.op === "divide"
          ? `Divide ${operationExpression(spec)} con la división larga: escribe el cociente, cada resta y el resto.`
          : `Calcula en columnas: ${operationExpression(spec)}.`),
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
  const steps =
    spec.op === "divide"
      ? divisionTrace(spec).steps.map((step) => ({
          math: `${step.part} ÷ ${spec.b} → ${step.digit}${step.down !== null ? `, bajas el ${step.down}` : ""}`,
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
  return question.column?.op === "divide" ? divisionResponseValue(question.column, response) : parseNumber(response);
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
  if (question.column?.op === "divide") {
    const work = checkDivisionWork(question.column, response);
    if (work?.firstError) return divisionWorkFeedback(question.column, work.firstError, work.layout);
    if (value !== null) {
      const { quotient, remainder } = divisionTrace(question.column);
      if (value === quotient)
        return `El cociente es correcto; falta el resto o no es ${remainder === 0 ? "0" : "ese"}. Escríbelo así: ${quotient} r ${remainder}.`;
    }
  }
  if (question.format !== "choice" && value === null)
    return question.column?.op === "divide"
      ? "Completa la galera, o escribe el cociente y el resto así: 52 r 3."
      : "Escribe un número, un decimal con coma o punto, o una fracción como 3/4. Revisa que el denominador sea distinto de cero.";
  return "Revisa qué cantidad buscas y qué representa cada dato. Puedes consultar la clase o pedir una pista antes de intentarlo otra vez.";
}
