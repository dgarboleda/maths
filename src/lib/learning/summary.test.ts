import { expect, test } from "vitest";
import { getLesson, initialDaily, initialProgress } from "./domain";
import { learningSummary } from "./summary";

const NOW = Date.parse("2026-10-20T17:00:00Z");
test("completar la clase con apoyo no se convierte en autonomía ni retención", () => {
  const p = { ...initialProgress(getLesson("enteros-recta")!), completedAt: NOW, needsSupport: true };
  expect(learningSummary({ "enteros-recta": p }, null, NOW)).toEqual({ completed: 1, autonomous: 0, retained: 0, support: 1, streak: 0 });
});

test("usa solo evidencias actuales y deja de contar autonomía si aparece una necesidad de apoyo", () => {
  const p = { ...initialProgress(getLesson("enteros-recta")!), completedAt: NOW, checkPassedAt: NOW, retainedAt: NOW, lastReview: { correct: 4, total: 4, conceptual: true, transfer: true, passed: true, at: NOW } };
  expect(learningSummary({ "enteros-recta": p, "aritmetica-d1": p }, null, NOW)).toMatchObject({ completed: 1, autonomous: 1, retained: 1 });
  expect(learningSummary({ "enteros-recta": { ...p, needsSupport: true } }, null, NOW)).toMatchObject({ autonomous: 0, retained: 0 });
});

test("la racha familiar usa el repaso diario y caduca igual que en el inicio", () => {
  const daily = { ...initialDaily(), streak: { current: 4, best: 6, lastDay: "2026-10-20", freezeWeek: null } };
  expect(learningSummary({}, daily, NOW).streak).toBe(4);
  expect(learningSummary({}, daily, NOW + 4 * 86_400_000).streak).toBe(0);
});
