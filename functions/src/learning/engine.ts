import { getAdventure, type AdventureDef } from "./adventures";
import { isAnswerCorrect } from "./questions";
import type {
  AdventureAction,
  AdventureState,
  CheckResult,
  LearningAction,
  LearningProgress,
  Lesson,
  Question,
  QuestionStage,
  ResponseEvidence,
} from "./types";

const DAY_MS = 86_400_000;
export class LearningError extends Error {}
export const STAGE_LABELS = {
  diagnostic: "Punto de partida",
  class: "Clase",
  examples: "Ejemplos",
  guided: "Con ayuda",
  practice: "Práctica",
  check: "Comprueba",
  application: "Aplica",
  summary: "Tu avance",
  review: "Repaso",
} as const;

export function initialProgress(lesson: Lesson): LearningProgress {
  return {
    lessonId: lesson.id,
    contentVersion: lesson.version,
    revision: 0,
    stage: "diagnostic",
    index: 0,
    checkForm: 0,
    responses: {},
    classCompleted: false,
    examplesCompleted: false,
    completedAt: null,
    checkPassedAt: null,
    lastCheck: null,
    bestCheck: null,
    lastReview: null,
    reviewDueAt: null,
    retainedAt: null,
    needsSupport: false,
    updatedAt: 0,
  };
}
/** Avance guardado con una versión anterior del contenido: conserva logros,
 *  fechas e historial de comprobaciones, y reinicia solo la ronda en curso,
 *  porque sus respuestas pertenecen a preguntas que ya no existen. */
export function migrateProgress(
  lesson: Lesson,
  progress: LearningProgress,
): LearningProgress {
  if (progress.contentVersion === lesson.version) return progress;
  const questionStage = !["class", "examples", "summary"].includes(progress.stage);
  return {
    ...progress,
    contentVersion: lesson.version,
    responses: {},
    index: questionStage ? 0 : progress.index,
  };
}
export function questionsFor(
  lesson: Lesson,
  progress: LearningProgress,
): Question[] {
  switch (progress.stage) {
    case "diagnostic":
      return lesson.diagnostic;
    case "guided":
      return lesson.guided;
    case "practice":
      return lesson.practice;
    case "check":
      return lesson.checks[progress.checkForm];
    case "review":
      return lesson.review;
    case "application":
      return [lesson.application];
    default:
      return [];
  }
}
export function currentQuestion(
  lesson: Lesson,
  progress: LearningProgress,
): Question | undefined {
  return questionsFor(lesson, progress)[progress.index];
}
export function evidenceKey(stage: string, question: Question): string {
  return `${stage}:${question.id}`;
}
export function currentEvidence(
  lesson: Lesson,
  progress: LearningProgress,
): ResponseEvidence | undefined {
  const q = currentQuestion(lesson, progress);
  return q ? progress.responses[evidenceKey(progress.stage, q)] : undefined;
}
function newEvidence(now: number): ResponseEvidence {
  return {
    firstCorrect: false,
    correct: false,
    attempts: 0,
    hintsUsed: 0,
    revealed: false,
    response: null,
    updatedAt: now,
  };
}
function clearResponses(state: LearningProgress, stage: string) {
  for (const key of Object.keys(state.responses))
    if (key.startsWith(`${stage}:`)) delete state.responses[key];
}
export function independent(evidence: ResponseEvidence | undefined): boolean {
  return Boolean(
    evidence &&
      evidence.firstCorrect &&
      evidence.hintsUsed === 0 &&
      !evidence.revealed,
  );
}
function score(
  questions: Question[],
  progress: LearningProgress,
  stage: QuestionStage,
  now: number,
): CheckResult {
  const passed = (q: Question) =>
    independent(progress.responses[evidenceKey(stage, q)]);
  const correct = questions.filter(passed).length;
  const conceptual = questions.some((q) => q.intent === "concept" && passed(q));
  const transfer = questions.some((q) => q.intent === "transfer" && passed(q));
  return {
    correct,
    total: questions.length,
    conceptual,
    transfer,
    passed:
      correct >= Math.ceil(questions.length * 0.8) && conceptual && transfer,
    at: now,
  };
}
export function learningStatus(
  progress: LearningProgress | undefined,
):
  | "Sin empezar"
  | "Estoy aprendiendo"
  | "Resuelvo con apoyo"
  | "Resuelvo solo"
  | "Lo recuerdo y lo aplico" {
  if (!progress) return "Sin empezar";
  if (
    progress.retainedAt &&
    progress.lastReview?.passed &&
    !progress.needsSupport
  )
    return "Lo recuerdo y lo aplico";
  if (progress.checkPassedAt && !progress.needsSupport) return "Resuelvo solo";
  if (
    progress.completedAt ||
    progress.needsSupport ||
    Object.values(progress.responses).some(
      (r) => r.correct && (r.hintsUsed > 0 || !r.firstCorrect),
    )
  )
    return "Resuelvo con apoyo";
  return "Estoy aprendiendo";
}
export function applyLearningAction(
  lesson: Lesson,
  previous: LearningProgress | undefined,
  action: LearningAction,
  now: number,
): LearningProgress {
  const base = previous ? migrateProgress(lesson, previous) : initialProgress(lesson);
  const state: LearningProgress = {
    ...base,
    responses: { ...base.responses },
    revision: base.revision + 1,
    updatedAt: now,
  };
  if (action.kind === "begin") {
    if (
      action.stage === "review" &&
      (!state.checkPassedAt ||
        state.reviewDueAt === null ||
        state.reviewDueAt > now)
    )
      throw new LearningError(
        "El repaso estará disponible en la fecha indicada. Mientras tanto puedes practicar.",
      );
    state.stage = action.stage;
    state.index = 0;
    if (action.stage === "check" && state.lastCheck)
      state.checkForm = state.checkForm === 0 ? 1 : 0;
    // Una ronda nueva no hereda aciertos ni ayudas de una ronda anterior.
    clearResponses(state, action.stage);
    return state;
  }
  if (action.kind === "next") {
    if (state.stage === "class") {
      if (state.index + 1 < lesson.sections.length) state.index++;
      else {
        state.classCompleted = true;
        state.stage = "examples";
        state.index = 0;
      }
      return state;
    }
    if (state.stage === "examples") {
      if (state.index + 1 < lesson.examples.length) state.index++;
      else {
        state.examplesCompleted = true;
        state.stage = "guided";
        state.index = 0;
        clearResponses(state, "guided");
      }
      return state;
    }
    const question = currentQuestion(lesson, state),
      evidence = currentEvidence(lesson, state);
    if (!question || !evidence)
      throw new LearningError("Responde la actividad antes de continuar.");
    const assessment = ["diagnostic", "check", "review"].includes(state.stage);
    if (
      assessment
        ? evidence.attempts === 0
        : !evidence.correct && !evidence.revealed
    )
      throw new LearningError(
        "Intenta resolver la actividad o consulta su desarrollo antes de continuar.",
      );
    const questions = questionsFor(lesson, state);
    if (state.index + 1 < questions.length) {
      state.index++;
      return state;
    }
    const stage = state.stage;
    state.index = 0;
    if (stage === "diagnostic") {
      state.needsSupport ||=
        questions.filter((q) =>
          independent(state.responses[evidenceKey(stage, q)]),
        ).length < 2;
      state.stage = "class";
    } else if (stage === "guided") {
      state.stage = "practice";
      clearResponses(state, "practice");
    } else if (stage === "practice") {
      state.stage = "check";
      if (state.lastCheck) state.checkForm = state.checkForm === 0 ? 1 : 0;
      clearResponses(state, "check");
    } else if (stage === "check") {
      const result = score(questions, state, stage, now);
      state.lastCheck = result;
      if (
        !state.bestCheck ||
        result.correct > state.bestCheck.correct ||
        (result.passed && !state.bestCheck.passed)
      )
        state.bestCheck = result;
      state.needsSupport = !result.passed;
      if (result.passed) {
        state.checkPassedAt ??= now;
        state.reviewDueAt ??= now + 3 * DAY_MS;
      }
      state.stage = "application";
      clearResponses(state, "application");
    } else if (stage === "review") {
      const result = score(questions, state, stage, now);
      state.lastReview = result;
      state.needsSupport = !result.passed;
      if (result.passed) state.retainedAt = now;
      state.reviewDueAt = now + (result.passed ? 7 : 3) * DAY_MS;
      state.stage = "summary";
    } else if (stage === "application") {
      state.completedAt ??= now;
      state.stage = "summary";
    }
    return state;
  }
  const question = currentQuestion(lesson, state);
  if (!question || question.id !== action.questionId)
    throw new LearningError(
      "La actividad cambió. Actualiza la página para continuar.",
    );
  const key = evidenceKey(state.stage, question);
  const evidence = {
    ...(state.responses[key] ?? newEvidence(now)),
    updatedAt: now,
  };
  if (action.kind === "hint") {
    evidence.hintsUsed = Math.min(3, evidence.hintsUsed + 1);
  } else if (action.kind === "reveal") {
    evidence.revealed = true;
  } else if (action.kind === "answer") {
    if (
      ["diagnostic", "check", "review"].includes(state.stage) &&
      evidence.attempts > 0
    )
      throw new LearningError(
        "Esta respuesta ya se registró. Podrás practicar después de la comprobación.",
      );
    if (
      typeof action.response !== "string" ||
      action.response.length > 64 ||
      !action.response.trim()
    )
      throw new LearningError("Escribe o selecciona una respuesta.");
    evidence.correct = isAnswerCorrect(question, action.response);
    if (evidence.attempts === 0) evidence.firstCorrect = evidence.correct;
    evidence.attempts++;
    evidence.response = action.response;
  }
  state.responses[key] = evidence;
  return state;
}

export function initialAdventure(id = "apagon"): AdventureState {
  const adventure = requireAdventure(id);
  return {
    revision: 0,
    completedAt: null,
    attempts: 0,
    inspected: false,
    allocation: adventure.inputs.map((input) => input.start),
    feedback: adventure.initialFeedback,
    updatedAt: 0,
  };
}
function requireAdventure(id: string) {
  const adventure = getAdventure(id);
  if (!adventure) throw new LearningError("Esta aventura no existe.");
  return adventure;
}
/** Un plan válido trae un entero dentro del rango de cada entrada. */
export function validAllocation(adventure: AdventureDef, allocation: unknown) {
  return (
    Array.isArray(allocation) &&
    allocation.length === adventure.inputs.length &&
    allocation.every(
      (n, i) =>
        Number.isSafeInteger(n) &&
        n >= adventure.inputs[i].min &&
        n <= adventure.inputs[i].max,
    )
  );
}
export function applyAdventureAction(
  previous: AdventureState | undefined,
  action: AdventureAction,
  now: number,
  id = "apagon",
): AdventureState {
  const adventure = requireAdventure(id);
  const state = {
    ...(previous ?? initialAdventure(id)),
    revision: (previous?.revision ?? 0) + 1,
    updatedAt: now,
  };
  if (action.kind === "inspect") {
    state.inspected = true;
    state.feedback = adventure.inspectFeedback;
    return state;
  }
  if (!state.inspected) throw new LearningError(adventure.inspectFirst);
  if (!validAllocation(adventure, action.allocation)) {
    const [first] = adventure.inputs;
    throw new LearningError(
      adventure.inputs.every((i) => i.min === first.min && i.max === first.max)
        ? `Cada valor debe ser un número entero entre ${first.min} y ${first.max}.`
        : "Cada valor debe ser un número entero dentro de su rango.",
    );
  }
  state.allocation = [...action.allocation];
  state.attempts++;
  const result = adventure.evaluate(state.allocation);
  state.feedback = result.feedback;
  if (result.goals.every(Boolean)) state.completedAt ??= now;
  return state;
}
