import { getLesson, type EvidenceEvent, type LearningProgress } from "./domain";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface AnswerHabits {
  /** Clases terminadas sin superar la comprobación (avanzó sin demostrarlo). */
  unproven: { lessonId: string; title: string }[];
  /** Respuestas de los últimos 7 días y cuántas fueron apresuradas. */
  answers: number;
  rushed: number;
}

/**
 * Hábitos de respuesta para la familia: clases que se terminaron sin
 * demostrar lo aprendido y respuestas dadas antes de poder leer la pregunta
 * (`rushed`, que marca el servidor). Es un aviso, no una nota.
 */
export function answerHabits(
  progress: Record<string, LearningProgress | undefined>,
  events: EvidenceEvent[],
  now: number,
): AnswerHabits {
  const unproven = Object.values(progress)
    .filter((p): p is LearningProgress => Boolean(p?.completedAt && !p.checkPassedAt))
    .map((p) => ({ lessonId: p.lessonId, title: getLesson(p.lessonId)?.title ?? p.lessonId }));
  const recent = events.filter((e) => e.outcome && now - e.at <= WEEK_MS);
  return { unproven, answers: recent.length, rushed: recent.filter((e) => e.outcome?.rushed).length };
}
