import { expect, test } from "vitest";
import { getLesson, initialProgress } from "./domain";
import { FORMULA_LESSON_IDS, formulasFor } from "./formulas";
import { hasHelpContent, lessonScreenHelp, questionHelp } from "./screenHelp";
import { parseMath, type MathPart } from "@/lib/math/parseMath";

const hasFraction = (parts: MathPart[]): boolean =>
  parts.some((part) => typeof part !== "string" && (part.kind === "frac" || hasFraction(part.kind === "sqrt" ? part.body : part.kind === "sup" ? part.base : [])));

test("cada formulario pertenece a una clase publicada y no repite nombres", () => {
  for (const id of FORMULA_LESSON_IDS) {
    expect(getLesson(id), id).toBeDefined();
    const names = formulasFor(id).map((formula) => formula.name);
    expect(new Set(names).size, id).toBe(names.length);
  }
  expect(formulasFor("no-existe")).toEqual([]);
});

test("toda barra de una fórmula se dibuja como fracción apilada", () => {
  for (const id of FORMULA_LESSON_IDS)
    for (const { expression } of formulasFor(id))
      if (expression.includes("/")) expect(hasFraction(parseMath(expression)), expression).toBe(true);
});

test("las progresiones ofrecen el término general y la suma de ambos tipos", () => {
  const expressions = formulasFor("progresiones").map((formula) => formula.expression);
  expect(expressions).toEqual(expect.arrayContaining(["aₙ = a₁ + (n − 1) · d", "aₙ = a₁ · rⁿ⁻¹", "Sₙ = (n · (a₁ + aₙ))/2"]));
});

test("el foco muestra el formulario en la clase y la práctica, pero no en el punto de partida ni en el repaso mixto", () => {
  const lesson = getLesson("progresiones")!;
  const start = initialProgress(lesson);
  expect(lessonScreenHelp(lesson, { ...start, stage: "class", index: 0 }).formulas).toHaveLength(formulasFor("progresiones").length);
  const practice = lessonScreenHelp(lesson, { ...start, stage: "practice", index: 0 }, lesson.practice[0]);
  expect(practice.formulas?.length).toBeGreaterThan(0);
  expect(hasHelpContent({ ...practice, ideas: [] })).toBe(true);
  expect(lessonScreenHelp(lesson, { ...start, stage: "diagnostic", index: 0 }, lesson.diagnostic[0]).formulas).toEqual([]);
  expect(questionHelp(lesson, lesson.mixed[0], { formulas: false }).formulas).toEqual([]);
});
