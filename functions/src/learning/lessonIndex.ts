import { LESSON_INDEX } from "./lessonIndexData";
import type { LessonSummary } from "./types";

export { LESSON_INDEX };

/** Resumen de una clase sin cargar el catálogo (títulos, unidad, bases). */
export function getLessonSummary(id: string): LessonSummary | undefined {
  return LESSON_INDEX.find((lesson) => lesson.id === id);
}
