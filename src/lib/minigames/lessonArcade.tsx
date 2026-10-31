import { choiceSet, shuffle, type Problem } from "@/lib/problem";
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

/**
 * Texto de una alternativa: el que el problema define para ese valor (una
 * fracción, un símbolo, el nombre de una figura) o el número con coma
 * decimal y signo tipográfico. Lo que se lee es siempre lo que se envía.
 */
export function choiceLabel(problem: Problem, value: number): string {
  const index = problem.choices?.indexOf(value) ?? -1;
  const label = index >= 0 ? problem.choiceLabels?.[index] : undefined;
  return label ?? String(Number(value.toFixed(6))).replace(".", ",").replace(/^-/, "−");
}

/**
 * Alternativas del modo legado (módulos del currículo en los niveles). Si el
 * problema trae sus propias opciones —de texto o numéricas razonadas— se
 * usan esas, con la respuesta siempre incluida; si no, vecinos de la
 * respuesta. Puede devolver menos de `count` valores.
 */
export function arcadeValues(problem: Problem, count: number, spread: number): number[] {
  if (problem.choices?.length) {
    const others = shuffle(problem.choices.filter((value) => value !== problem.answer)).slice(0, count - 1);
    return shuffle([problem.answer, ...others]);
  }
  return choiceSet(problem.answer, spread, count);
}

/** Estado derivado que comparten los cinco juegos en modo clase. */
export function lessonArcadeState(exercise: LessonExercise | undefined) {
  return {
    lesson: Boolean(exercise),
    frozen: Boolean(exercise && (exercise.disabled || exercise.paused)),
    solved: Boolean(exercise?.solved),
  };
}

/** Tamaño del enunciado en los minijuegos: los problemas con contexto son
 *  largos y, con la letra grande, empujan el tablero fuera de la pantalla. */
export function gamePromptSize(prompt: string): string {
  if (prompt.length > 180) return "text-base sm:text-lg";
  return prompt.length > 110 ? "text-lg sm:text-xl" : prompt.length > 60 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl";
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
