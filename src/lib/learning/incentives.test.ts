import { describe, expect, test } from "vitest";
import {
  applyLearningAction,
  correctResponse,
  currentQuestion,
  getLesson,
  independent,
  lessonStars,
  lessonStarsEarned,
  LESSON_STARS_MAX,
  MIN_THINK_MS,
  type LearningAction,
  type LearningProgress,
} from "./domain";
import { answerHabits } from "./habits";

const lesson = getLesson("fraccion-cantidad")!;
const NOW = Date.UTC(2026, 10, 6, 12);
const DAY = 86_400_000;
const run = (state: LearningProgress | undefined, action: LearningAction, at: number) => applyLearningAction(lesson, state, action, at);

/** Responde toda la comprobación con `gap` ms entre ver cada pregunta y responderla. */
function check(gap: number, from = NOW) {
  let t = from;
  let state = run(undefined, { kind: "begin", stage: "check" }, t);
  for (const q of lesson.checks[0]) {
    state = run(state, { kind: "answer", questionId: currentQuestion(lesson, state)!.id, response: correctResponse(q) }, (t += gap));
    state = run(state, { kind: "next" }, (t += 1000));
  }
  return { state, t };
}

describe("Responder sin pensar no cuenta", () => {
  test("una respuesta en menos de MIN_THINK_MS se marca apresurada y no es autónoma", () => {
    const fast = check(1000).state;
    expect(Object.values(fast.responses).every((e) => e.rushed)).toBe(true);
    expect(fast.lastCheck?.passed).toBe(false);
    expect(fast.checkPassedAt).toBeNull();
    const calm = check(MIN_THINK_MS + 500).state;
    expect(Object.values(calm.responses).some((e) => e.rushed)).toBe(false);
    expect(calm.checkPassedAt).not.toBeNull();
    expect(independent({ firstCorrect: true, correct: true, attempts: 1, hintsUsed: 0, revealed: false, response: "1", updatedAt: 0, rushed: true })).toBe(false);
  });

  test("opción múltiple en la práctica: tras un fallo, pista; tras dos, el desarrollo", () => {
    let t = NOW;
    let state = run(undefined, { kind: "begin", stage: "practice" }, t);
    const q = lesson.practice[0];
    const wrong = q.choices!.filter((c) => c.id !== q.answer).map((c) => c.id);
    state = run(state, { kind: "answer", questionId: "p-1", response: wrong[0] }, (t += 6000));
    expect(() => run(state, { kind: "answer", questionId: "p-1", response: wrong[1] }, (t += 6000))).toThrow(/Pide una pista/);
    state = run(state, { kind: "hint", questionId: "p-1" }, (t += 6000));
    state = run(state, { kind: "answer", questionId: "p-1", response: wrong[1] }, (t += 6000));
    expect(() => run(state, { kind: "answer", questionId: "p-1", response: String(q.answer) }, (t += 6000))).toThrow(/revisa el desarrollo/);
    state = run(state, { kind: "reveal", questionId: "p-1" }, (t += 6000));
    expect(run(state, { kind: "next" }, (t += 6000)).index).toBe(1);
  });
});

describe("Estrellas: terminar, demostrar y recordar", () => {
  const base = { lessonId: lesson.id, completedAt: null, checkPassedAt: null, retainedAt: null } as unknown as LearningProgress;
  test("cada parte se paga una sola vez", () => {
    let r = lessonStars(base, { ...base, completedAt: 1 });
    expect(r).toEqual({ stars: 1, rewarded: { lesson: true } });
    const done = { ...base, completedAt: 1, rewarded: r.rewarded };
    r = lessonStars(done, { ...done, checkPassedAt: 2 });
    expect(r.stars).toBe(4);
    const proven = { ...done, checkPassedAt: 2, rewarded: r.rewarded };
    r = lessonStars(proven, { ...proven, retainedAt: 3 });
    expect(r.stars).toBe(2);
    const all = { ...proven, retainedAt: 3, rewarded: r.rewarded };
    expect(lessonStars(all, all).stars).toBe(0);
    expect(lessonStarsEarned(all)).toBe(LESSON_STARS_MAX);
  });
  test("terminar adivinando da 1 estrella; demostrar después da las 4 de la comprobación", () => {
    expect(lessonStars(undefined, { ...base, completedAt: 1 }).stars).toBe(1);
    expect(lessonStars(undefined, { ...base, completedAt: 1, checkPassedAt: 1 }).stars).toBe(5);
  });
  test("lo ganado antes del cambio se conserva y no se paga otra vez", () => {
    const legacy = { ...base, completedAt: 1, checkPassedAt: 1 };
    expect(lessonStarsEarned(legacy)).toBe(5);
    const after = lessonStars(legacy, { ...legacy, retainedAt: NOW });
    expect(after.stars).toBe(0);
    // Tras guardar las marcas, la clase sigue mostrando lo que cobró (5), no 7.
    expect(lessonStarsEarned({ ...legacy, retainedAt: NOW, rewarded: after.rewarded })).toBe(5);
    // Un avance anterior sin terminar sí cobra según el reparto nuevo.
    expect(lessonStars({ ...base, checkPassedAt: 1 }, { ...base, checkPassedAt: 1, completedAt: 2 }).stars).toBe(5);
  });
});

describe("Hábitos de respuesta para la familia", () => {
  test("cuenta respuestas apresuradas de la semana y clases terminadas sin demostrar", () => {
    const outcome = (rushed: boolean) => ({ lessonId: lesson.id, questionId: "a-1", task: 1, stage: "check", correct: true, attempt: 1, hintsUsed: 0, revealed: false, rushed, error: null });
    const events = [
      { lessonId: lesson.id, action: { kind: "answer" }, outcome: outcome(true), at: NOW - DAY },
      { lessonId: lesson.id, action: { kind: "answer" }, outcome: outcome(false), at: NOW - DAY },
      { lessonId: lesson.id, action: { kind: "answer" }, outcome: outcome(true), at: NOW - 10 * DAY },
      { lessonId: lesson.id, action: { kind: "next" }, at: NOW },
    ];
    const progress = {
      [lesson.id]: { lessonId: lesson.id, completedAt: 1, checkPassedAt: null } as unknown as LearningProgress,
      razones: { lessonId: "razones", completedAt: 1, checkPassedAt: 1 } as unknown as LearningProgress,
    };
    expect(answerHabits(progress, events, NOW)).toEqual({
      unproven: [{ lessonId: lesson.id, title: lesson.title }],
      answers: 2,
      rushed: 1,
    });
  });
});
