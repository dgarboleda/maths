import { CONTENT_VERSION } from "./defineLesson";
import { getLesson, LEARNING_UNITS, LESSONS } from "./catalog";
import { LearningError } from "./engine";
import { isAnswerCorrect } from "./questions";
import type {
  Lesson,
  PlacementAction,
  PlacementResult,
  PlacementState,
  Question,
} from "./types";

export const PLACEMENT_ID = "ubicacion";

export function initialPlacement(): PlacementState {
  return {
    contentVersion: CONTENT_VERSION,
    revision: 0,
    stage: "idle",
    items: [],
    attempts: 0,
    result: null,
    updatedAt: 0,
  };
}

/** Pregunta de ubicación de una clase: el procedimiento central de la forma B
 *  de la comprobación (tarea q1), sin ayudas. */
export function placementQuestion(lesson: Lesson): Question {
  return lesson.checks[1].find((q) => q.task === 1) ?? lesson.checks[1][1];
}

const unitOrder = LEARNING_UNITS.map((u) => u.id);
const lessonsOf = (unitId: string) => LESSONS.filter((l) => l.unitId === unitId);

/** Siguiente clase a evaluar: avanza dentro de la unidad mientras acierta y
 *  salta a la unidad siguiente en el primer fallo. */
function nextLesson(items: PlacementState["items"]): Lesson | undefined {
  const last = items.at(-1);
  if (!last) return lessonsOf(unitOrder[0])[0];
  const lesson = getLesson(last.lessonId)!;
  const unit = lessonsOf(lesson.unitId);
  const position = unit.findIndex((l) => l.id === lesson.id);
  if (last.correct && position + 1 < unit.length) return unit[position + 1];
  const nextUnit = unitOrder[unitOrder.indexOf(lesson.unitId) + 1];
  return nextUnit ? lessonsOf(nextUnit)[0] : undefined;
}

function summarize(items: PlacementState["items"], now: number, protocol?: 2): PlacementResult {
  const start: PlacementResult["start"] = {};
  for (const unitId of unitOrder) {
    const failed = items.find((i) => getLesson(i.lessonId)?.unitId === unitId && !i.correct);
    start[unitId] = failed ? failed.lessonId : null;
  }
  return {
    mastered: [...new Set(items.filter((i) => i.correct).map((i) => i.lessonId))].filter((id) => {
      const answers = items.filter((i) => i.lessonId === id);
      return answers.every((i) => i.correct) &&
        (protocol !== 2 || getLesson(id)?.unitId !== "fracciones" || answers.length >= 2);
    }),
    start,
    answered: items.length,
    at: now,
  };
}

/** Pregunta actual con un identificador propio (u1, u2…) para no revelar de
 *  qué banco proviene. */
export function placementCurrent(state: PlacementState): { lesson: Lesson; question: Question } | undefined {
  const item = state.items.at(-1);
  if (state.stage !== "active" || !item || item.correct !== null) return undefined;
  const lesson = getLesson(item.lessonId);
  const question = lesson?.checks[1].find((q) => q.id === item.questionId);
  return lesson && question
    ? { lesson, question: { ...question, id: `u${state.items.length}` } }
    : undefined;
}

export function applyPlacementAction(
  previous: PlacementState | undefined,
  action: PlacementAction,
  now: number,
): PlacementState {
  const base = previous ?? initialPlacement();
  const state: PlacementState = {
    ...base,
    items: base.items.map((i) => ({ ...i })),
    revision: base.revision + 1,
    updatedAt: now,
  };
  if (action.kind === "begin") {
    const first = nextLesson([])!;
    state.contentVersion = CONTENT_VERSION;
    state.placementProtocol = 2;
    state.stage = "active";
    state.attempts = base.attempts + 1;
    state.items = [{ lessonId: first.id, questionId: placementQuestion(first).id, correct: null }];
    return state;
  }
  // Una sesión empezada con otra versión del contenido se reinicia.
  if (state.contentVersion !== CONTENT_VERSION)
    throw new LearningError("El programa cambió. Vuelve a empezar la evaluación.");
  const current = placementCurrent(state);
  if (!current) throw new LearningError("Empieza la evaluación de ubicación para responder.");
  if (action.questionId !== current.question.id)
    throw new LearningError("La pregunta cambió. Actualiza la página para continuar.");
  let correct = false;
  if (action.kind === "answer") {
    if (!action.response.trim() || action.response.length > 64)
      throw new LearningError("Escribe o selecciona una respuesta.");
    correct = isAnswerCorrect(current.question, action.response);
  }
  state.items[state.items.length - 1].correct = correct;
  // Las sesiones antiguas terminan con sus reglas originales. En las nuevas,
  // un acierto de procedimiento en fracciones requiere además concepto.
  if (state.placementProtocol === 2 && correct && current.lesson.unitId === "fracciones" &&
      state.items.filter((item) => item.lessonId === current.lesson.id).length === 1) {
    const concept = current.lesson.checks[1].find((q) => q.task === 0)!;
    state.items.push({ lessonId: current.lesson.id, questionId: concept.id, correct: null });
    return state;
  }
  const following = nextLesson(state.items);
  if (following)
    state.items.push({ lessonId: following.id, questionId: placementQuestion(following).id, correct: null });
  else {
    state.stage = "done";
    state.result = summarize(state.items, now, state.placementProtocol);
  }
  return state;
}

/** Siguiente clase recomendada: la primera del programa que no está
 *  terminada ni dominada en la ubicación. */
export function recommendedLesson(
  completed: Set<string>,
  placement: PlacementResult | null | undefined,
): Lesson | undefined {
  const mastered = new Set(placement?.mastered ?? []);
  return LESSONS.find((l) => !completed.has(l.id) && !mastered.has(l.id));
}
