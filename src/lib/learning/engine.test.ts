import { describe, expect, test } from "vitest";
import {
  applyAdventureAction,
  applyLearningAction,
  currentQuestion,
  getLesson,
  initialProgress,
  learningStatus,
  type LearningAction,
  type LearningProgress,
} from "./domain";

const lesson = getLesson("fraccion-cantidad")!;
const NOW = Date.UTC(2026, 9, 18, 12);
const DAY = 86_400_000;
const update = (
  state: LearningProgress | undefined,
  action: LearningAction,
  now = NOW,
) => applyLearningAction(lesson, state, action, now);
function completeCheck(helpOnTransfer = false) {
  let state = update(undefined, { kind: "begin", stage: "check" });
  const answers = ["c1", "60", "20", "c2", "20"];
  for (let i = 0; i < answers.length; i++) {
    const q = currentQuestion(lesson, state)!;
    if (helpOnTransfer && i === 4)
      state = update(state, { kind: "hint", questionId: q.id });
    state = update(state, {
      kind: "answer",
      questionId: q.id,
      response: answers[i],
    });
    state = update(state, { kind: "next" });
  }
  return state;
}

describe("Evidencia educativa", () => {
  test("recorrer clase y ejemplos no acredita comprensión", () => {
    let state = update(undefined, { kind: "begin", stage: "class" });
    for (let i = 0; i < 5; i++) state = update(state, { kind: "next" });
    expect(state.classCompleted).toBe(true);
    expect(state.examplesCompleted).toBe(true);
    expect(state.stage).toBe("guided");
    expect(state.checkPassedAt).toBeNull();
    expect(learningStatus(state)).toBe("Estoy aprendiendo");
  });
  test("un error corregido con ayuda permite continuar, sin volver autónomo el primer intento", () => {
    let state = update(undefined, { kind: "begin", stage: "practice" });
    state = update(state, {
      kind: "answer",
      questionId: "p-1",
      response: "c0",
    });
    state = update(state, { kind: "hint", questionId: "p-1" });
    state = update(state, {
      kind: "answer",
      questionId: "p-1",
      response: "c1",
    });
    expect(state.responses["practice:p-1"]).toMatchObject({
      correct: true,
      firstCorrect: false,
      attempts: 2,
      hintsUsed: 1,
    });
    expect(update(state, { kind: "next" }).index).toBe(1);
    expect(state.checkPassedAt).toBeNull();
  });
  test("necesita evidencia conceptual y transferencia además del porcentaje de aciertos", () => {
    const state = completeCheck(true);
    expect(state.lastCheck).toMatchObject({
      correct: 4,
      total: 5,
      conceptual: true,
      transfer: false,
      passed: false,
    });
    expect(state.checkPassedAt).toBeNull();
    expect(state.stage).toBe("application");
    expect(state.needsSupport).toBe(true);
  });
  test("responder todo de forma autónoma programa el repaso, sin declararlo retenido", () => {
    const state = completeCheck();
    expect(state.lastCheck).toMatchObject({
      correct: 5,
      passed: true,
      conceptual: true,
      transfer: true,
    });
    expect(state.checkPassedAt).toBe(NOW);
    expect(state.reviewDueAt).toBe(NOW + 3 * DAY);
    expect(state.retainedAt).toBeNull();
    expect(learningStatus(state)).toBe("Resuelvo solo");
  });
  test("la comprobación conserva la primera respuesta y rechaza un segundo envío para la misma pregunta", () => {
    let state = update(undefined, { kind: "begin", stage: "check" });
    state = update(state, {
      kind: "answer",
      questionId: "a-1",
      response: "c0",
    });
    expect(() =>
      update(state, { kind: "answer", questionId: "a-1", response: "c1" }),
    ).toThrow(/ya se registró/);
  });
  test("ni la hora del dispositivo ni una práctica inmediata pueden simular retención", () => {
    const state = completeCheck();
    expect(() =>
      update(state, { kind: "begin", stage: "review" }, NOW + DAY),
    ).toThrow(/fecha indicada/);
    let review = update(
      state,
      { kind: "begin", stage: "review" },
      NOW + 3 * DAY,
    );
    const answers = ["c1", "30", "150", "30"];
    for (const answer of answers) {
      review = update(
        review,
        {
          kind: "answer",
          questionId: currentQuestion(lesson, review)!.id,
          response: answer,
        },
        NOW + 3 * DAY,
      );
      review = update(review, { kind: "next" }, NOW + 3 * DAY);
    }
    expect(review.retainedAt).toBe(NOW + 3 * DAY);
    expect(learningStatus(review)).toBe("Lo recuerdo y lo aplico");
    expect(review.reviewDueAt).toBe(NOW + 10 * DAY);
  });
  test("un repaso fallado recomienda apoyo y conserva el logro histórico", () => {
    let state = update(
      completeCheck(),
      { kind: "begin", stage: "review" },
      NOW + 3 * DAY,
    );
    for (let i = 0; i < 4; i++) {
      state = update(
        state,
        {
          kind: "answer",
          questionId: currentQuestion(lesson, state)!.id,
          response: "incorrecta",
        },
        NOW + 3 * DAY,
      );
      state = update(state, { kind: "next" }, NOW + 3 * DAY);
    }
    expect(state.checkPassedAt).toBe(NOW);
    expect(state.needsSupport).toBe(true);
    expect(state.reviewDueAt).toBe(NOW + 6 * DAY);
  });
  test("otra comprobación alterna los datos y borra los aciertos de la ronda anterior", () => {
    const state = completeCheck();
    const retry = update(state, { kind: "begin", stage: "check" });
    expect(retry.checkForm).toBe(1);
    expect(
      Object.keys(retry.responses).filter((key) => key.startsWith("check:")),
    ).toHaveLength(0);
    expect(lesson.checks[0][1].answer).not.toBe(lesson.checks[1][1].answer);
  });
  test("la práctica posterior también abre una comprobación limpia", () => {
    let state = update(completeCheck(), { kind: "begin", stage: "practice" });
    while (state.stage === "practice") {
      state = update(state, {
        kind: "reveal",
        questionId: currentQuestion(lesson, state)!.id,
      });
      state = update(state, { kind: "next" });
    }
    expect(state.stage).toBe("check");
    expect(currentQuestion(lesson, state)!.id).toBe("b-1");
    expect(state.responses["check:b-1"]).toBeUndefined();
  });
  test("es posible completar la aplicación con ayuda sin acreditar autonomía", () => {
    let state = update(undefined, { kind: "begin", stage: "application" });
    state = update(state, { kind: "reveal", questionId: "m-1" });
    state = update(state, { kind: "next" });
    expect(state.completedAt).toBe(NOW);
    expect(state.checkPassedAt).toBeNull();
    expect(learningStatus(state)).toBe("Resuelvo con apoyo");
    expect(initialProgress(lesson).completedAt).toBeNull();
  });
  test("rechaza avanzar sin responder o responder una pregunta de otro punto del recorrido", () => {
    expect(() => update(undefined, { kind: "next" })).toThrow(/Responde/);
    expect(() =>
      update(undefined, { kind: "answer", questionId: "p-1", response: "1" }),
    ).toThrow(/actividad cambió/);
  });
});

describe("El apagón", () => {
  test("las decisiones modifican suministros y el presupuesto de energía es una restricción real", () => {
    const inspected = applyAdventureAction(undefined, { kind: "inspect" }, NOW);
    const overloaded = applyAdventureAction(
      inspected,
      { kind: "dispatch", allocation: [100, 30, 10] },
      NOW,
    );
    expect(overloaded.feedback).toMatch(/corta el suministro/);
    expect(overloaded.completedAt).toBeNull();
    const wrongBase = applyAdventureAction(
      inspected,
      { kind: "dispatch", allocation: [90, 5, 25] },
      NOW,
    );
    expect(wrongBase.feedback).toMatch(/reserva original/);
    const success = applyAdventureAction(
      wrongBase,
      { kind: "dispatch", allocation: [90, 20, 10] },
      NOW,
    );
    expect(success.completedAt).toBe(NOW);
    expect(success.attempts).toBe(2);
    expect(success.feedback).toMatch(/conserva las 120/);
  });
  test("no se puede conectar antes de inspeccionar ni usar suministros inválidos", () => {
    expect(() =>
      applyAdventureAction(
        undefined,
        { kind: "dispatch", allocation: [90, 20, 10] },
        NOW,
      ),
    ).toThrow(/Inspecciona/);
    expect(() =>
      applyAdventureAction(
        applyAdventureAction(undefined, { kind: "inspect" }, NOW),
        { kind: "dispatch", allocation: [NaN, 20, 10] },
        NOW,
      ),
    ).toThrow(/entero/);
  });
});
