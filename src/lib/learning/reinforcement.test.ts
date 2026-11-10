import { expect, test } from "vitest";
import { getLesson, initialProgress, type CheckResult, type LearningProgress, type ResponseEvidence } from "./domain";
import { reinforcementPlan } from "./reinforcement";

const lesson = getLesson("fraccion-cantidad")!;
const questions = lesson.checks[0];
const bases = [{ id: "fracciones-unidad", title: "Qué representa una fracción" }];
const ok: ResponseEvidence = { firstCorrect: true, correct: true, attempts: 1, hintsUsed: 0, revealed: false, response: "1", updatedAt: 1 };
const wrong: ResponseEvidence = { ...ok, firstCorrect: false, correct: false };
const failed: CheckResult = { correct: 2, total: 5, conceptual: false, transfer: false, passed: false, at: 1 };

function plan(evidence: (intent: string, index: number) => ResponseEvidence | undefined, extra: Partial<Parameters<typeof reinforcementPlan>[0]> = {}) {
  const responses: Record<string, ResponseEvidence> = {};
  questions.forEach((q, index) => {
    const e = evidence(q.intent, index);
    if (e) responses[`check:${q.id}`] = e;
  });
  return reinforcementPlan({ stage: "check", questions, responses, result: failed, prerequisites: bases, progress: {}, ...extra });
}

test("una comprobación superada o sin resultado no genera plan", () => {
  expect(plan(() => ok, { result: { ...failed, passed: true } })).toEqual([]);
  expect(plan(() => ok, { result: null })).toEqual([]);
});

test("cada tipo de fallo lleva a la parte de la clase que lo trabaja", () => {
  expect(plan((intent) => (intent === "concept" ? wrong : ok), { prerequisites: [] }).map((s) => s.stage)).toEqual(["class"]);
  const procedure = plan((intent, index) => (intent === "procedure" && index === questions.findIndex((q) => q.intent === "procedure") ? wrong : ok));
  expect(procedure.map((s) => s.id)).toEqual(["examples"]);
  expect(plan((intent) => (intent === "transfer" ? wrong : ok)).map((s) => s.stage)).toEqual(["practice"]);
});

test("con varios fallos propone primero la base sin afianzar", () => {
  const steps = plan(() => wrong);
  expect(steps.map((s) => s.id)).toEqual(["base", "class", "examples", "practice"]);
  expect(steps[0]).toMatchObject({ lessonId: "fracciones-unidad", title: "Afianza antes la base: Qué representa una fracción" });
  const solid: LearningProgress = { ...initialProgress(getLesson("fracciones-unidad")!), checkPassedAt: 5 };
  expect(plan(() => wrong, { progress: { "fracciones-unidad": solid } }).some((s) => s.id === "base")).toBe(false);
  expect(plan(() => wrong, { progress: { "fracciones-unidad": { ...solid, needsSupport: true } } })[0].id).toBe("base");
  expect(plan(() => wrong, { mastered: ["fracciones-unidad"] }).some((s) => s.id === "base")).toBe(false);
});

test("distingue responder deprisa y depender de las pistas de no saber", () => {
  const hurried = plan(() => ({ ...ok, rushed: true }));
  expect(hurried.map((s) => s.id)).toEqual(["pace"]);
  expect(hurried[0].detail).toContain("5 respuestas correctas llegaron");
  expect(plan((_, index) => (index === 0 ? { ...ok, rushed: true } : ok))[0].detail).toContain("Una respuesta correcta llegó");
  const hinted = plan(() => ({ ...ok, hintsUsed: 1 }));
  expect(hinted).toHaveLength(1);
  expect(hinted[0]).toMatchObject({ id: "practice", title: "Resuelve sin pistas" });
  // Sin respuesta registrada cuenta como fallo, no como apoyo.
  expect(plan(() => undefined).map((s) => s.id)).toContain("class");
});
