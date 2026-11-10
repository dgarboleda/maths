import type { Example, Lesson } from "./core";

/**
 * Autoexplicación de los ejemplos resueltos. El primer ejemplo de una clase
 * se estudia completo; desde el segundo, el alumno ve la operación de cada
 * paso y elige su justificación antes de leerla. Las alternativas son las
 * justificaciones de otros pasos del mismo ejemplo: no hace falta contenido
 * nuevo y obliga a relacionar cada transformación con su motivo.
 *
 * Es una ayuda para estudiar, no una evaluación: no se guarda, no da
 * estrellas y nunca impide continuar.
 */
export interface ExplanationPrompt {
  options: string[];
  /** Posición de la justificación del paso dentro de `options`. */
  correct: number;
}

const OPTIONS = 3;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Los ejemplos en columnas tienen su propia animación paso a paso. */
export function selfExplains(lesson: Pick<Lesson, "examples">, exampleIndex: number): boolean {
  const example = lesson.examples[exampleIndex];
  return exampleIndex > 0 && Boolean(example) && !example.column && explanationPrompt(example, 0) !== null;
}

/** Alternativas del paso, en un orden fijo (el mismo al recargar). Devuelve
 *  null si el ejemplo no tiene otras dos justificaciones distintas. */
export function explanationPrompt(example: Example, stepIndex: number): ExplanationPrompt | null {
  const step = example.steps[stepIndex];
  if (!step) return null;
  const others = [...new Set(example.steps.map((item) => item.why))].filter((why) => why !== step.why);
  if (others.length < OPTIONS - 1) return null;
  // Se prefieren los pasos vecinos: son las confusiones más verosímiles.
  const near = example.steps
    .map((item, index) => ({ why: item.why, distance: Math.abs(index - stepIndex) }))
    .filter((item) => item.why !== step.why)
    .sort((a, b) => a.distance - b.distance)
    .map((item) => item.why);
  const options = [step.why, ...[...new Set(near)].slice(0, OPTIONS - 1)];
  let state = hash(`${example.prompt}:${stepIndex}`) || 1;
  for (let i = options.length - 1; i > 0; i--) {
    state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
    const j = state % (i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, correct: options.indexOf(step.why) };
}
