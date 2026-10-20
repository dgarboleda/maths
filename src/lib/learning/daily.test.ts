import { describe, expect, test } from "vitest";
import {
  advanceStreak,
  applyDailyAction,
  dailyFocus,
  streakToday,
  weekOf,
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

  test("racha: días seguidos, un comodín por semana y reinicio tras dos días sin repasar", () => {
    expect(weekOf("2026-10-21")).toBe("2026-10-19"); // miércoles → lunes
    expect(weekOf("2026-10-19")).toBe("2026-10-19");
    expect(weekOf("2026-10-25")).toBe("2026-10-19"); // domingo
    let s = advanceStreak(undefined, "2026-10-19");
    expect(s).toMatchObject({ current: 1, best: 1 });
    expect(advanceStreak(s, "2026-10-19")).toBe(s); // mismo día: sin cambio
    s = advanceStreak(s, "2026-10-20");
    expect(s.current).toBe(2);
    // Salta el 21: el comodín de la semana la mantiene.
    s = advanceStreak(s, "2026-10-22");
    expect(s).toMatchObject({ current: 3, freezeWeek: "2026-10-19" });
    // Otro salto en la misma semana ya no se perdona.
    s = advanceStreak(s, "2026-10-24");
    expect(s).toMatchObject({ current: 1, best: 3 });
    // La semana siguiente hay comodín nuevo; dos días sin repasar reinician.
    s = advanceStreak(advanceStreak(s, "2026-10-25"), "2026-10-27");
    expect(s.current).toBe(3);
    expect(advanceStreak(s, "2026-10-30").current).toBe(1);
  });

  test("racha vista hoy: viva, en riesgo, con comodín o perdida", () => {
    const at = (day: string) => Date.parse(`${day}T17:00:00Z`);
    const state = { ...initialDaily(), streak: { current: 4, best: 6, lastDay: "2026-10-20", freezeWeek: null } };
    expect(streakToday(state, at("2026-10-20"))).toMatchObject({ current: 4, doneToday: true, atRisk: false, nextMilestone: 7 });
    expect(streakToday(state, at("2026-10-21"))).toMatchObject({ current: 4, atRisk: true, usesFreeze: false });
    expect(streakToday(state, at("2026-10-22"))).toMatchObject({ current: 4, atRisk: true, usesFreeze: true });
    expect(streakToday(state, at("2026-10-23"))).toMatchObject({ current: 0, best: 6, atRisk: false });
    // Terminar una sesión actualiza la racha.
    const begun = applyDailyAction(state, { kind: "begin", stage: "review" }, ["razones"], new Set(), at("2026-10-21"));
    expect(answerAll(begun, ["razones"], () => true, at("2026-10-21")).streak).toMatchObject({ current: 5, lastDay: "2026-10-21" });
  });

  test("un error que se repite trae la clase antes y con una pregunta de la misma tarea", () => {
    const eligible = dailyEligible(done(LESSONS_DONE), []);
    const lesson = getLesson("perimetro-area")!;
    const q = lesson.practice.find((x) => x.errors?.length)!;
    const wrong = (at: number) => ({
      lessonId: lesson.id,
      action: { kind: "answer", questionId: q.id, response: String(q.errors![0].value) },
      at,
    });
    // Un solo error no basta; dos sin resolver sí.
    expect(dailyFocus([wrong(1)], eligible).size).toBe(0);
    const focus = dailyFocus([wrong(1), wrong(2)], eligible);
    expect(focus.get(lesson.id)).toBe(q.task);
    // Una clase no terminada no entra aunque tenga errores.
    expect(dailyFocus([wrong(1), wrong(2)], ["razones"]).size).toBe(0);
    // Resuelto después (primer intento correcto, misma tarea): deja de priorizarse.
    const right = { lessonId: lesson.id, action: { kind: "answer", questionId: q.id, response: String(q.answer) }, at: 3 };
    expect(dailyFocus([wrong(1), wrong(2), right], eligible).size).toBe(0);
    // La clase aunque no esté vencida va primero, con una forma de la misma tarea.
    const state = { ...initialDaily(), schedule: { [lesson.id]: { box: 4, dueAt: NOW + 20 * DAY, lastAt: NOW - DAY, seen: 3 } } };
    const items = planDaily(state, eligible, new Set(), NOW, focus);
    expect(items[0]).toMatchObject({ lessonId: lesson.id, focus: true });
    const asked = dailyQuestions({ ...state, items })[0];
    expect(asked.question.task).toBe(q.task);
  });
});
