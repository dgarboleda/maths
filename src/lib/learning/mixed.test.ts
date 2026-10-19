import { describe, expect, test } from "vitest";
import {
  applyMixedReviewAction,
  getLesson,
  LEARNING_UNITS,
  LESSONS,
  mixedQuestions,
  MIXED_REVIEW_SIZE,
  planMixedReview,
  unitForReviewId,
  type MixedReviewState,
} from "./domain";

const NOW = Date.UTC(2026, 9, 19, 12);
const unit = "fracciones" as const;
const done = LESSONS.filter((l) => l.unitId === unit).slice(0, 3).map((l) => l.id);

function play(state: MixedReviewState, correct: (i: number) => boolean) {
  let s = state;
  mixedQuestions(s).forEach(({ question }, i) => {
    const response = correct(i)
      ? String(question.answer)
      : question.choices
        ? question.choices.find((o) => o.id !== question.answer)!.id
        : "123456";
    s = applyMixedReviewAction(unit, s, { kind: "answer", questionId: question.id, response }, done, NOW);
    s = applyMixedReviewAction(unit, s, { kind: "next" }, done, NOW);
  });
  return s;
}

describe("Repaso intercalado de una unidad", () => {
  test("solo existe para unidades reales", () => {
    expect(unitForReviewId("repaso-fracciones")).toBe("fracciones");
    expect(unitForReviewId("repaso-inventada")).toBeUndefined();
    expect(unitForReviewId("fracciones-unidad")).toBeUndefined();
  });

  test("cada lección tiene un banco propio para el repaso mixto, que no repite otros bancos", () => {
    for (const l of LESSONS) {
      expect(l.mixed.length, l.id).toBe(4);
      const elsewhere = new Set([...l.guided, ...l.practice, ...l.checks.flat(), ...l.review, l.application].map((q) => q.prompt));
      for (const q of l.mixed) expect(elsewhere.has(q.prompt), `${l.id} ${q.id}`).toBe(false);
    }
  });

  test("exige al menos dos clases terminadas de la unidad", () => {
    expect(() =>
      applyMixedReviewAction(unit, undefined, { kind: "begin", stage: "review" }, done.slice(0, 1), NOW),
    ).toThrow(/al menos dos clases/);
    // Clases de otra unidad no cuentan.
    const other = LESSONS.filter((l) => l.unitId !== unit).map((l) => l.id);
    expect(() =>
      applyMixedReviewAction(unit, undefined, { kind: "begin", stage: "review" }, other, NOW),
    ).toThrow(/al menos dos clases/);
  });

  test("alterna las clases: dos problemas seguidos nunca son de la misma clase", () => {
    for (const unitDef of LEARNING_UNITS) {
      const ids = LESSONS.filter((l) => l.unitId === unitDef.id).map((l) => l.id);
      for (let round = 1; round <= 4; round++) {
        const items = planMixedReview(ids, round);
        expect(items).toHaveLength(MIXED_REVIEW_SIZE);
        for (let i = 1; i < items.length; i++) expect(items[i].lessonId).not.toBe(items[i - 1].lessonId);
        items.forEach((item) => expect(getLesson(item.lessonId)!.mixed.some((q) => q.id === item.questionId)).toBe(true));
      }
    }
    // Sesiones sucesivas cambian los problemas.
    expect(planMixedReview(done, 1)).not.toEqual(planMixedReview(done, 2));
  });

  test("registra la primera respuesta, cuenta las pistas como apoyo y premia la primera sesión superada", () => {
    let s = applyMixedReviewAction(unit, undefined, { kind: "begin", stage: "review" }, done, NOW);
    expect(s.stage).toBe("active");
    const first = mixedQuestions(s)[0].question;
    expect(() => applyMixedReviewAction(unit, s, { kind: "reveal", questionId: first.id }, done, NOW)).toThrow(/al terminar/);
    s = applyMixedReviewAction(unit, s, { kind: "hint", questionId: first.id }, done, NOW);
    s = applyMixedReviewAction(unit, s, { kind: "answer", questionId: first.id, response: String(first.answer) }, done, NOW);
    expect(() => applyMixedReviewAction(unit, s, { kind: "answer", questionId: first.id, response: "1" }, done, NOW)).toThrow(/ya se registró/);
    s = applyMixedReviewAction(unit, s, { kind: "next" }, done, NOW);
    // El resto, de forma autónoma: 5 de 6 → superada.
    let rest = s;
    mixedQuestions(rest).slice(1).forEach(({ question }) => {
      rest = applyMixedReviewAction(unit, rest, { kind: "answer", questionId: question.id, response: String(question.answer) }, done, NOW);
      rest = applyMixedReviewAction(unit, rest, { kind: "next" }, done, NOW);
    });
    expect(rest.stage).toBe("summary");
    expect(rest.lastResult).toMatchObject({ correct: 5, total: 6, passed: true });
    expect(rest.completedAt).toBe(NOW);
  });

  test("una sesión con dos fallos no se supera y conserva el mejor resultado y el logro previos", () => {
    const begin = (s?: MixedReviewState) => applyMixedReviewAction(unit, s, { kind: "begin", stage: "review" }, done, NOW);
    const passed = play(begin(), () => true);
    expect(passed.completedAt).toBe(NOW);
    const failed = play(begin(passed), (i) => i > 1);
    expect(failed.lastResult).toMatchObject({ correct: 4, passed: false });
    expect(failed.bestResult?.correct).toBe(6);
    expect(failed.completedAt).toBe(NOW);
    expect(failed.round).toBe(2);
  });
});
