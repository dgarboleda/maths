import type { Example, Intent, Question } from "./types";

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
export function isAnswerCorrect(question: Question, response: string): boolean {
  if (question.format === "choice") return response === question.answer;
  const value = parseNumber(response);
  return (
    value !== null &&
    typeof question.answer === "number" &&
    Math.abs(value - question.answer) < 1e-8
  );
}
export function errorFeedback(question: Question, response: string): string {
  if (question.format === "choice") {
    const feedback = question.choices?.find(
      (choice) => choice.id === response,
    )?.feedback;
    if (feedback) return feedback;
  }
  const value = question.format === "choice" ? response : parseNumber(response);
  const error = question.errors?.find((item) =>
    typeof item.value === "number" && typeof value === "number"
      ? Math.abs(item.value - value) < 1e-8
      : item.value === value,
  );
  if (error) return error.feedback;
  if (question.format !== "choice" && value === null)
    return "Escribe un número, un decimal con coma o punto, o una fracción como 3/4. Revisa que el denominador sea distinto de cero.";
  return "Revisa qué cantidad buscas y qué representa cada dato. Puedes consultar la clase o pedir una pista antes de intentarlo otra vez.";
}
