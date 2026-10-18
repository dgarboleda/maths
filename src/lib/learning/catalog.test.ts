import { describe, expect, test } from "vitest";
import { MODULES } from "@/lib/curriculum";
import {
  getLesson,
  isAnswerCorrect,
  LEARNING_UNITS,
  LESSONS,
  parseNumber,
} from "./domain";

describe("Contrato editorial del programa inicial", () => {
  test("doce clases completas, sin prerrequisitos ausentes ni ciclos", () => {
    expect(LESSONS).toHaveLength(12);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(12);
    const visit = (id: string, path: string[] = []) => {
      expect(path).not.toContain(id);
      const l = getLesson(id);
      expect(l).toBeDefined();
      l!.prerequisites.forEach((p) => visit(p, [...path, id]));
    };
    for (const unit of LEARNING_UNITS)
      expect(LESSONS.filter((l) => l.unitId === unit.id)).toHaveLength(4);
    for (const l of LESSONS) {
      visit(l.id);
      expect(l.sections).toHaveLength(3);
      expect(l.examples.length).toBeGreaterThanOrEqual(2);
      expect(l.guided).toHaveLength(3);
      expect(l.practice).toHaveLength(6);
      expect(new Set(l.practice.map((q) => q.format)).size).toBe(3);
      expect(l.commonErrors.length).toBeGreaterThanOrEqual(3);
      l.legacyModuleIds.forEach((id) =>
        expect(MODULES.some((m) => m.id === id)).toBe(true),
      );
      l.examples.forEach((ex) => {
        expect(ex.steps.length).toBeGreaterThanOrEqual(3);
        ex.steps.forEach((step) => expect(step.why.length).toBeGreaterThan(10));
      });
      for (const bank of [
        l.diagnostic,
        l.guided,
        l.practice,
        ...l.checks,
        l.review,
        [l.application],
      ]) {
        expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length);
        bank.forEach((q) => {
          expect(q.prompt.length).toBeGreaterThan(10);
          expect(q.solution.length).toBeGreaterThan(0);
          expect(q.hints).toHaveLength(3);
          expect(isAnswerCorrect(q, String(q.answer))).toBe(true);
          if (q.choices) {
            expect(new Set(q.choices.map((o) => o.label)).size).toBe(
              q.choices.length,
            );
            expect(q.choices.some((o) => o.id === q.answer)).toBe(true);
          } else expect(Number.isFinite(q.answer)).toBe(true);
        });
      }
      for (const bank of [...l.checks, l.review]) {
        expect(bank.some((q) => q.intent === "concept")).toBe(true);
        expect(bank.some((q) => q.intent === "transfer")).toBe(true);
      }
      expect(l.editorial.author.trim()).not.toBe("");
      // Una aprobación futura debe registrar una revisión de esta versión.
      if (l.editorial.status === "teacher-reviewed") {
        expect(l.editorial.review?.reviewer.trim()).toBeTruthy();
        expect(l.editorial.review?.reviewer).not.toBe(l.editorial.author);
        expect(l.editorial.review?.version).toBe(l.version);
        expect(l.editorial.review?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else expect(l.editorial.review).toBeUndefined();
    }
  });
  test("valores independientes para los problemas de fracción de cantidad, porcentajes y ecuaciones", () => {
    const fraction = getLesson("fraccion-cantidad")!;
    expect(fraction.practice[1].answer).toBe(45); // 3/4 de 60
    expect(fraction.practice[2].answer).toBe(15); // 1/4 de 60
    expect(fraction.practice[3].answer).toBe(75); // 5/4 de 60
    expect(fraction.checks[0][4].answer).toBe(20); // resto de 80 tras entregar 3/4
    expect(fraction.review[2].answer).toBe(150); // 5/4 de 120
    const percentages = getLesson("porcentajes-aplicados")!;
    expect(percentages.practice[1].answer).toBe(60); // 20% de 300
    expect(percentages.practice[2].answer).toBe(240);
    expect(percentages.practice[3].answer).toBe(360);
    expect(getLesson("ecuaciones-un-paso")!.practice[3].answer).toBe(-3); // x+5=2
    expect(getLesson("ecuaciones-dos-pasos")!.checks[0][1].answer).toBe(4); // 4x+5=21
    expect(getLesson("modelar-ecuaciones")!.practice[3].answer).toBe(4); // (19-6)/3, solo enteros
  });
});

describe("Entradas matemáticas", () => {
  test.each([
    ["3/4", 0.75],
    ["6/8", 0.75],
    ["0,75", 0.75],
    [".75", 0.75],
    ["−3", -3],
    ["1 / -2", -0.5],
    ["10/10", 1],
  ])("interpreta %s", (input, expected) =>
    expect(parseNumber(String(input))).toBe(expected),
  );
  test.each([
    "1/0",
    "Infinity",
    "2+3",
    "1,2,3",
    "",
    "<script>",
    "1e99",
    "1/2/3",
  ])("rechaza %s sin evaluar código", (input) =>
    expect(parseNumber(input)).toBeNull(),
  );
  test("acepta fracciones equivalentes, pero no redondeos que cambian el valor solicitado", () => {
    const q = getLesson("fracciones-unidad")!.practice[1]; // 2/6
    expect(isAnswerCorrect(q, "1/3")).toBe(true);
    expect(isAnswerCorrect(q, "0,3")).toBe(false);
  });
});
