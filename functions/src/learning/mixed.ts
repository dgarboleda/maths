import { CONTENT_VERSION } from "./defineLesson";
import { getLesson, LEARNING_UNITS, LESSONS } from "./catalog";
import { independent, LearningError } from "./engine";
import { isAnswerCorrect } from "./questions";
import type {
  CheckResult,
  LearningAction,
  Lesson,
  MixedReviewState,
  Question,
  ResponseEvidence,
  UnitId,
} from "./types";

export const MIXED_REVIEW_SIZE = 6;
export const MIXED_REVIEW_MIN_LESSONS = 2;
const PREFIX = "repaso-";

export function mixedReviewId(unitId: UnitId): string {
  return `${PREFIX}${unitId}`;
}
export function unitForReviewId(id: string): UnitId | undefined {
  if (!id.startsWith(PREFIX)) return undefined;
  const unit = id.slice(PREFIX.length);
  return LEARNING_UNITS.some((u) => u.id === unit) ? (unit as UnitId) : undefined;
}
export function unitLessons(unitId: UnitId): Lesson[] {
  return LESSONS.filter((lesson) => lesson.unitId === unitId);
}

export function initialMixedReview(unitId: UnitId): MixedReviewState {
  return {
    unitId,
    contentVersion: CONTENT_VERSION,
    revision: 0,
    round: 0,
    stage: "idle",
    items: [],
    index: 0,
    responses: {},
    lastResult: null,
    bestResult: null,
    completedAt: null,
    updatedAt: 0,
  };
}

/**
 * Alterna las clases terminadas para que dos problemas seguidos nunca sean
 * del mismo tipo (con dos clases o más) y rota el banco con cada sesión.
 * Determinista: el servidor y el navegador calculan la misma secuencia.
 */
export function planMixedReview(
  lessonIds: string[],
  round: number,
): MixedReviewState["items"] {
  const lessons = lessonIds
    .map((id) => getLesson(id))
    .filter((lesson): lesson is Lesson => Boolean(lesson));
  const n = lessons.length;
  return Array.from({ length: MIXED_REVIEW_SIZE }, (_, k) => {
    const lesson = lessons[(k + round) % n];
    const bank = lesson.mixed;
    const question = bank[(Math.floor(k / n) + round) % bank.length];
    return { lessonId: lesson.id, questionId: question.id };
  });
}

/** Problemas de la sesión con identificadores propios (q1…q6) y la clase de
 *  la que provienen, para mostrar su explicación. */
export function mixedQuestions(
  state: MixedReviewState,
): { question: Question; lesson: Lesson }[] {
  return state.items.flatMap((item, i) => {
    const lesson = getLesson(item.lessonId);
    const question = lesson?.mixed.find((q) => q.id === item.questionId);
    return lesson && question
      ? [{ lesson, question: { ...question, id: `q${i + 1}` } }]
      : [];
  });
}

function score(state: MixedReviewState, now: number): CheckResult {
  const questions = mixedQuestions(state);
  const passed = (q: Question) => independent(state.responses[q.id]);
  const correct = questions.filter(({ question }) => passed(question)).length;
  return {
    correct,
    total: questions.length,
    conceptual: questions.some(({ question }) => question.intent !== "transfer" && passed(question)),
    transfer: questions.some(({ question }) => question.intent === "transfer" && passed(question)),
    passed: correct >= Math.ceil(questions.length * 0.8),
    at: now,
  };
}

export function applyMixedReviewAction(
  unitId: UnitId,
  previous: MixedReviewState | undefined,
  action: LearningAction,
  completedLessonIds: string[],
  now: number,
): MixedReviewState {
  let base = previous ?? initialMixedReview(unitId);
  // Una sesión empezada con otra versión del contenido se descarta; los
  // resultados y el premio se conservan.
  if (base.contentVersion !== CONTENT_VERSION)
    base = { ...base, contentVersion: CONTENT_VERSION, stage: "idle", items: [], index: 0, responses: {} };
  const state: MixedReviewState = {
    ...base,
    responses: { ...base.responses },
    revision: base.revision + 1,
    updatedAt: now,
  };
  if (action.kind === "begin") {
    const available = unitLessons(unitId)
      .map((lesson) => lesson.id)
      .filter((id) => completedLessonIds.includes(id));
    if (available.length < MIXED_REVIEW_MIN_LESSONS)
      throw new LearningError(
        "Termina al menos dos clases de esta unidad para mezclar sus problemas.",
      );
    state.round = base.round + 1;
    state.items = planMixedReview(available, state.round);
    state.stage = "active";
    state.index = 0;
    state.responses = {};
    return state;
  }
  if (state.stage !== "active")
    throw new LearningError("Empieza una sesión de repaso mixto para responder.");
  const questions = mixedQuestions(state);
  const current = questions[state.index]?.question;
  if (!current) throw new LearningError("La sesión cambió. Vuelve a empezarla.");
  if (action.kind === "next") {
    if (!state.responses[current.id]?.attempts)
      throw new LearningError("Responde la actividad antes de continuar.");
    if (state.index + 1 < questions.length) {
      state.index++;
      return state;
    }
    const result = score(state, now);
    state.lastResult = result;
    if (!state.bestResult || result.correct > state.bestResult.correct)
      state.bestResult = result;
    if (result.passed) state.completedAt ??= now;
    state.stage = "summary";
    state.index = 0;
    return state;
  }
  if (action.questionId !== current.id)
    throw new LearningError("La actividad cambió. Actualiza la página para continuar.");
  const evidence: ResponseEvidence = {
    ...(state.responses[current.id] ?? {
      firstCorrect: false,
      correct: false,
      attempts: 0,
      hintsUsed: 0,
      revealed: false,
      response: null,
    }),
    updatedAt: now,
  };
  if (action.kind === "reveal")
    throw new LearningError(
      "En el repaso mixto el desarrollo se muestra al terminar. Puedes pedir una pista.",
    );
  if (action.kind === "hint") {
    evidence.hintsUsed = Math.min(3, evidence.hintsUsed + 1);
  } else if (action.kind === "answer") {
    if (evidence.attempts > 0)
      throw new LearningError("Esta respuesta ya se registró.");
    if (!action.response.trim() || action.response.length > 64)
      throw new LearningError("Escribe o selecciona una respuesta.");
    evidence.correct = isAnswerCorrect(current, action.response);
    evidence.firstCorrect = evidence.correct;
    evidence.attempts = 1;
    evidence.response = action.response;
  }
  state.responses[current.id] = evidence;
  return state;
}
