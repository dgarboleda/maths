/**
 * Clases con tutor visual. Lista ligera para que la clase decida si cargarlo
 * sin descargar el guion ni los materiales; `VisualTutor.test.tsx` comprueba
 * que coincide con `guion.json`.
 */
export const TUTOR_LESSONS: readonly string[] = ["suma-resta-columnas", "multiplicacion-grupos", "fracciones-suma-resta"];

export function hasVisualTutor(lessonId: string): boolean {
  return TUTOR_LESSONS.includes(lessonId);
}
