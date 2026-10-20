import { describe, expect, test } from "vitest";
import {
  analyzeItems,
  calibrationData,
  calibrationModule,
  dailyQuestions,
  dailyTarget,
  getLesson,
  initialDaily,
  lessonSummary,
  pickCalibrated,
  planDaily,
  type ProfileEvent,
} from "./domain";

const NOW = Date.UTC(2026, 9, 20, 15);

describe("Calibración de dificultad", () => {
  test("sin datos se respeta la rotación; con datos gana la dificultad más cercana al objetivo", () => {
    const qs = [{ id: "r-1" }, { id: "r-2" }, { id: "r-3" }];
    expect(pickCalibrated(qs, "razones", 0.8, {})).toBe(qs[0]);
    const items = { "razones|r-1": { n: 40, p: 0.98 }, "razones|r-3": { n: 40, p: 0.78 } };
    expect(pickCalibrated(qs, "razones", 0.8, items)).toBe(qs[2]);
    // Una medida lejos del objetivo cede ante una pregunta sin datos.
    expect(pickCalibrated(qs, "razones", 0.6, { "razones|r-1": { n: 40, p: 0.98 } })).toBe(qs[1]);
    expect([0, 1, 2, 3, 4].map(dailyTarget)).toEqual([0.8, 0.8, 0.7, 0.6, 0.6]);
  });

  test("el repaso diario usa la calibración sin repetir pregunta de una clase", () => {
    const base = planDaily(initialDaily(), ["razones"], new Set(), NOW);
    expect(planDaily(initialDaily(), ["razones"], new Set(), NOW, new Map(), {})).toEqual(base);
    const lesson = getLesson("razones")!;
    const pool = [...lesson.review, ...lesson.mixed, ...lesson.checks[1]];
    // La primera de la rotación es casi siempre acertada: se prefiere otra cercana al 80 %.
    const items = { [`razones|${base[0].questionId}`]: { n: 50, p: 0.99 }, [`razones|${pool[2].id}`]: { n: 50, p: 0.8 } };
    const tuned = planDaily(initialDaily(), ["razones"], new Set(), NOW, new Map(), items);
    expect(tuned[0].questionId).toBe(pool[2].id);
    expect(new Set(tuned.map((i) => i.questionId)).size).toBe(tuned.length);
    expect(dailyQuestions({ ...initialDaily(), items: tuned })).toHaveLength(2);
  });

  test("el análisis genera la calibración solo con suficientes respuestas y sin datos personales", () => {
    const lesson = getLesson("razones")!;
    const q = lesson.review[0];
    const events: ProfileEvent[] = Array.from({ length: 40 }, (_, i) => ({
      profile: `parents/p/children/c${i}`,
      lessonId: lesson.id,
      action: { kind: "answer", questionId: q.id, response: i < 30 ? String(q.answer) : "zzz" },
      at: NOW + i,
    }));
    const items = analyzeItems(events, getLesson);
    const data = calibrationData(items, 30, "2026-10-20");
    expect(data.items).toEqual({ [`razones|${q.id}`]: { n: 40, p: 0.75 } });
    expect(calibrationData(items, 50, "2026-10-20").items).toEqual({});
    const source = calibrationModule(data);
    expect(source).toContain("export const CALIBRATION: CalibrationData = {");
    expect(source).not.toMatch(/parents|children|c\d+"/);
    expect(lessonSummary(items)[0]).toMatchObject({ lessonId: "razones", n: 40, firstCorrect: 30 });
  });
});
