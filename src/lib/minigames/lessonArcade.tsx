import type { LessonExercise } from "./lessonExercise";

/**
 * Reglas comunes del modo clase de los minijuegos de reflejos (serpiente,
 * carrera, laberinto, invasores y bloques). El juego conserva su mecánica
 * real, pero solo una decisión deliberada (comer, disparar, cruzar una
 * puerta tras elegir carril, romper el bloque correcto) envía una respuesta
 * a la clase. Los fallos de reflejos —chocar, que te alcance el fantasma,
 * que la oleada aterrice, perder la pelota, no decidir a tiempo— no se
 * registran, no restan vidas y la partida sigue con el mismo ejercicio.
 */
export const REFLEX_MISS = "Eso fue un fallo del juego, no de matemáticas: no cuenta como respuesta. ¡Sigue intentándolo!";

export function lessonValues(exercise: LessonExercise): number[] {
  return exercise.problem.choices ?? [exercise.problem.answer];
}

export function lessonLabel(exercise: LessonExercise | undefined, value: number): string {
  if (!exercise) return String(value);
  const index = lessonValues(exercise).indexOf(value);
  return exercise.problem.choiceLabels?.[index] ?? String(value).replace(".", ",");
}

/** Estado derivado que comparten los cinco juegos en modo clase. */
export function lessonArcadeState(exercise: LessonExercise | undefined) {
  return {
    lesson: Boolean(exercise),
    frozen: Boolean(exercise && (exercise.disabled || exercise.paused)),
    solved: Boolean(exercise?.solved),
  };
}

export const AWAITING_INPUT = "Pulsa una flecha para empezar a moverte.";

/** `waiting`: en la clase, la serpiente y el laberinto no se mueven solos
 *  hasta la primera flecha, para que lo que se come sea siempre una decisión. */
export function ReflexNotice({ show, waiting = false, message = REFLEX_MISS }: { show: boolean; waiting?: boolean; message?: string }) {
  return (
    <p role="status" className="min-h-5 text-sm font-semibold text-amber-200">
      {show ? message : waiting ? AWAITING_INPUT : ""}
    </p>
  );
}
