import { describe, expect, test } from "vitest";
import {
  analyzeItems,
  getLesson,
  itemReportCsv,
  itemReportMarkdown,
  summarizeMisconceptions,
  type ProfileEvent,
} from "./domain";

const lesson = getLesson("perimetro-area")!;
const area = lesson.practice.find((q) => q.errors?.length && q.task === 1)!;
const parallel = lesson.checks[0].find((q) => q.task === 1)!;
const MIN = 60_000;
const answer = (questionId: string, response: string, at: number, profile = "p1"): ProfileEvent => ({
  profile,
  lessonId: lesson.id,
  action: { kind: "answer", questionId, response },
  at,
});

describe("Errores frecuentes de un perfil", () => {
  test("agrupa el mismo error entre formas paralelas y detecta cuándo se supera", () => {
    const wrongA = String(area.errors![0].value);
    const wrongB = String(parallel.errors![0].value);
    const events = [
      answer(area.id, wrongA, 1 * MIN),
      answer(parallel.id, wrongB, 2 * MIN),
      answer(area.id, "987654", 3 * MIN),
    ];
    const first = summarizeMisconceptions(events, getLesson);
    expect(first.misconceptions).toHaveLength(1);
    expect(first.misconceptions[0]).toMatchObject({ lessonId: lesson.id, count: 2, resolved: false });
    expect(first.unexpected[lesson.id]).toBe(1);
    // Más tarde resuelve la misma tarea (otra forma) al primer intento.
    const later = summarizeMisconceptions(
      [...events, answer(lesson.checks[1].find((q) => q.task === 1)!.id, String(lesson.checks[1].find((q) => q.task === 1)!.answer), 4 * MIN)],
      getLesson,
    );
    expect(later.misconceptions[0].resolved).toBe(true);
  });

  test("usa el diagnóstico guardado por el servidor cuando existe", () => {
    const { misconceptions } = summarizeMisconceptions(
      [
        {
          lessonId: "repaso-geometria",
          action: { kind: "answer", questionId: "q1", response: String(area.errors![0].value) },
          outcome: {
            lessonId: lesson.id, questionId: area.id, task: 1, stage: "mixed", correct: false,
            attempt: 1, hintsUsed: 0, revealed: false, error: `e:${area.errors![0].value}`,
          },
          at: MIN,
        },
      ],
      getLesson,
    );
    expect(misconceptions[0]?.lessonId).toBe(lesson.id);
  });
});

describe("Análisis de preguntas", () => {
  test("cuenta una primera respuesta por perfil, pistas, tiempos y respuestas no previstas", () => {
    const events: ProfileEvent[] = [];
    for (let p = 0; p < 12; p++) {
      const profile = `p${p}`;
      const t = p * 100 * MIN;
      events.push({ profile, lessonId: lesson.id, action: { kind: "begin" }, at: t });
      if (p < 7) events.push({ profile, lessonId: lesson.id, action: { kind: "hint", questionId: area.id }, at: t + MIN / 2 });
      // 4 aciertos, 4 errores previstos y 4 errores con la misma respuesta inesperada.
      const response = p < 4 ? String(area.answer) : p < 8 ? String(area.errors![0].value) : "77";
      events.push(answer(area.id, response, t + MIN, profile));
      // Un segundo intento no cuenta como primera respuesta.
      events.push(answer(area.id, String(area.answer), t + 2 * MIN, profile));
    }
    const [item] = analyzeItems(events, getLesson, { minResponses: 10 });
    expect(item).toMatchObject({ questionId: area.id, n: 12, firstCorrect: 4, withHints: 7, wrong: 8, wrongPredicted: 4 });
    expect(item.unexpected[0]).toEqual({ response: "77", count: 4 });
    expect(item.medianSeconds).toBe(60);
    expect(item.flags).toContain("mucha ayuda");
    expect(item.flags.some((f) => f.includes("77"))).toBe(true);
    const md = itemReportMarkdown([item], 12, "2026-10-19");
    expect(md).toContain(area.id);
    expect(md).not.toContain("p1");
    expect(itemReportCsv([item]).split("\n")).toHaveLength(2);
  });

  test("sin suficientes respuestas no emite alertas", () => {
    const [item] = analyzeItems([answer(area.id, "77", MIN)], getLesson);
    expect(item.n).toBe(1);
    expect(item.flags).toEqual([]);
  });
});
