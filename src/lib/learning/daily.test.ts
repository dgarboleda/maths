import { describe, expect, test } from "vitest";
import {
  applyDailyAction,
  DAILY_INTERVALS,
  dailyDue,
  dailyEligible,
  dailyQuestions,
  dailyStrength,
  getLesson,
  initialDaily,
  limaDay,
  planDaily,
  type DailyReviewState,
  type LearningAction,
} from "./domain";

const NOW = Date.UTC(2026, 9, 20, 15, 0, 0);
const DAY = 86_400_000;
const done = (ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, { completedAt: NOW - 10 * DAY, needsSupport: false }]));
const LESSONS_DONE = ["enteros-recta", "enteros-suma-resta", "fracciones-unidad", "razones", "perimetro-area", "media-mediana-moda"];

function answerAll(state: DailyReviewState, eligible: string[], right: (i: number) => boolean | "hint", at = NOW) {
  let s = state;
  for (let i = 0; i < dailyQuestions(s).length; i++) {
    const { question } = dailyQuestions(s)[i];
    const mode = right(i);
    if (mode === "hint") s = applyDailyAction(s, { kind: "hint", questionId: question.id }, eligible, new Set(), at);
    s = applyDailyAction(
      s,
      { kind: "answer", questionId: question.id, response: mode === false ? "987654" : String(question.answer) },
      eligible,
      new Set(),
      at,
    );
    s = applyDailyAction(s, { kind: "next" }, eligible, new Set(), at);
  }
  return s;
}

describe("Repaso espaciado diario", () => {
  test("el día se cuenta en hora de Perú (UTC−5)", () => {
    expect(limaDay(Date.UTC(2026, 9, 20, 3, 0))).toBe("2026-10-19");
    expect(limaDay(Date.UTC(2026, 9, 20, 6, 0))).toBe("2026-10-20");
  });

  test("solo entran clases terminadas o dominadas en la ubicación, en orden del programa", () => {
    expect(dailyEligible(done(["razones", "enteros-recta"]), ["circulo"])).toEqual(["enteros-recta", "razones", "circulo"]);
    expect(dailyEligible({ razones: { completedAt: null, needsSupport: false } }, [])).toEqual([]);
    expect(() => applyDailyAction(undefined, { kind: "begin", stage: "review" }, [], new Set(), NOW)).toThrow(/Termina una clase/);
  });

  test("plan: hasta 6 problemas, como mucho 2 por clase, unidades alternadas y vencidas primero", () => {
    const eligible = dailyEligible(done(LESSONS_DONE), []);
    const items = planDaily(initialDaily(), eligible, new Set(), NOW);
    expect(items).toHaveLength(6);
    const units = items.map((i) => getLesson(i.lessonId)!.unitId);
    for (let i = 1; i < units.length; i++) expect(units[i], `posición ${i}`).not.toBe(units[i - 1]);
    // Con una sola clase hay 2 problemas distintos de ella.
    const one = planDaily(initialDaily(), ["razones"], new Set(), NOW);
    expect(one).toHaveLength(2);
    expect(new Set(one.map((i) => i.questionId)).size).toBe(2);
    // Una clase no vencida cede su lugar a las vencidas.
    const state = { ...initialDaily(), schedule: { razones: { box: 3, dueAt: NOW + 5 * DAY, lastAt: NOW - DAY, seen: 4 } } };
    expect(dailyDue(state, eligible, NOW)).not.toContain("razones");
    expect(planDaily(state, eligible, new Set(), NOW).map((i) => i.lessonId).slice(0, 5)).not.toContain("razones");
  });

  test("recordar sin ayuda aleja el próximo repaso; con pista o error vuelve pronto", () => {
    const eligible = dailyEligible(done(LESSONS_DONE), []);
    const begun = applyDailyAction(undefined, { kind: "begin", stage: "review" }, eligible, new Set(), NOW);
    const first = dailyQuestions(begun)[0].lesson.id;
    const after = answerAll(begun, eligible, (i) => (i === 0 ? true : i === 1 ? "hint" : false));
    expect(after.schedule[first]).toMatchObject({ box: 1, dueAt: NOW + DAILY_INTERVALS[1] * DAY, seen: 1 });
    const second = dailyQuestions(begun)[1].lesson.id;
    expect(after.schedule[second].box).toBe(0);
    expect(after.stage).toBe("summary");
    expect(after.lastResult).toMatchObject({ correct: 1, total: 6 });
    expect(after.sessions).toBe(1);
    expect(after.rewardDay).toBe(limaDay(NOW));
    expect(dailyStrength(after)).toMatchObject({ strong: 0, growing: 1 });
  });

  test("una clase sube como mucho una caja por sesión aunque aparezca dos veces", () => {
    const begun = applyDailyAction(undefined, { kind: "begin", stage: "review" }, ["razones"], new Set(), NOW);
    const after = answerAll(begun, ["razones"], () => true);
    expect(after.schedule.razones).toMatchObject({ box: 1, seen: 2 });
    // En la sesión siguiente (cuando vence) sí sube otra caja.
    const later = NOW + 2 * DAY;
    const again = applyDailyAction(after, { kind: "begin", stage: "review" }, ["razones"], new Set(), later);
    const done2 = answerAll(again, ["razones"], () => true, later);
    expect(done2.schedule.razones.box).toBe(2);
    // Las preguntas rotan entre sesiones.
    expect(again.items.map((i) => i.questionId)).not.toEqual(begun.items.map((i) => i.questionId));
  });

  test("solo se responde la pregunta actual y el desarrollo no se revela durante la sesión", () => {
    const begun = applyDailyAction(undefined, { kind: "begin", stage: "review" }, ["razones"], new Set(), NOW);
    const bad: LearningAction[] = [
      { kind: "answer", questionId: "q2", response: "1" },
      { kind: "reveal", questionId: "q1" },
      { kind: "next" },
    ];
    for (const action of bad) expect(() => applyDailyAction(begun, action, ["razones"], new Set(), NOW)).toThrow();
  });
});
