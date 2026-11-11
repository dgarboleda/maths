import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { WrongAnswerDetail } from "@/components/learning/WrongAnswerDetail";
import {
  choice,
  correctText,
  errorFeedback,
  getLesson,
  isAnswerCorrect,
  numeric,
  responseText,
  type Question,
  type ResponseEvidence,
} from "./domain";

/** Todas las preguntas de una clase, en cualquier banco o variante. */
function questionsOf(value: unknown, found: Question[] = []): Question[] {
  if (Array.isArray(value)) value.forEach((item) => questionsOf(item, found));
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.prompt === "string" && "answer" in record && "format" in record) found.push(record as unknown as Question);
    else Object.values(record).forEach((item) => questionsOf(item, found));
  }
  return found;
}

const evidence = (response: string, correct = false): ResponseEvidence => ({
  firstCorrect: correct, correct, attempts: 1, hintsUsed: 0, revealed: false, response, updatedAt: 1,
});

describe("respuesta dada y respuesta correcta, legibles", () => {
  const number = numeric("q", "¿Cuánto?", 12, ["Son 12."], ["a", "b", "c"], { unit: "L" });
  const options = choice("q", "¿Cuál?", ["Uno", "Dos", "Tres"], 1, "Es dos.");

  test("una pregunta numérica muestra el número con su unidad", () => {
    expect(responseText(number, " 10 ")).toBe("10 L");
    expect(correctText(number)).toBe("12 L");
  });

  test("una pregunta de opciones muestra el texto, no el identificador", () => {
    expect(responseText(options, "c2")).toBe("Tres");
    expect(correctText(options)).toBe("Dos");
  });

  test("sin respuesta no inventa nada", () => {
    expect(responseText(number, null)).toBeNull();
    expect(responseText(number, "  ")).toBeNull();
  });
});

describe("«cada parte es 1/__»", () => {
  const blanks = questionsOf(getLesson("fracciones-unidad")).filter((q) => q.prompt.includes("cada parte es 1/__"));

  test("existe en la clase", () => {
    expect(blanks.length).toBeGreaterThan(0);
  });

  test("escribir la fracción completa explica qué pide el hueco", () => {
    for (const q of blanks) {
      const den = q.answer as number;
      expect(isAnswerCorrect(q, `1/${den}`)).toBe(false);
      expect(errorFeedback(q, `1/${den}`)).toContain(`solo el número que va debajo de la raya: ${den}`);
    }
  });
});

describe("WrongAnswerDetail", () => {
  const q = numeric("q", "¿Cuánto?", 12, ["Son 12."], ["a", "b", "c"], {
    errors: [{ value: 20, feedback: "Calculaste con la capacidad, no con lo que contiene." }],
  });

  test("una respuesta incorrecta muestra la respuesta dada, la correcta y por qué no", () => {
    render(<WrongAnswerDetail question={q} evidence={evidence("20")} />);
    expect(screen.getByText("Tu respuesta:", { exact: false })).toBeTruthy();
    expect(screen.getByText("Respuesta correcta:", { exact: false })).toBeTruthy();
    expect(screen.getByText("Calculaste con la capacidad, no con lo que contiene.")).toBeTruthy();
  });

  test("no aparece si la respuesta es correcta o no hay respuesta", () => {
    const { container: ok } = render(<WrongAnswerDetail question={q} evidence={evidence("12", true)} />);
    const { container: none } = render(<WrongAnswerDetail question={q} />);
    expect(ok.textContent).toBe("");
    expect(none.textContent).toBe("");
  });
});
