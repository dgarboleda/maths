import type { Lesson, Question } from "./types";

/** Versión del contenido: al cambiar los bancos se incrementa y el motor
 *  migra el avance guardado (`migrateProgress`) sin perder logros. */
export const CONTENT_VERSION = 2;

type Draft = Omit<
  Lesson,
  | "version"
  | "editorial"
  | "guided"
  | "practice"
  | "checks"
  | "review"
  | "mixed"
  | "application"
> & {
  /** Seis formas paralelas (v = 0…5) de siete tareas:
   *  q0 concepto · q1 procedimiento · q2 paso · q3 variante · q4 concepto o
   *  análisis de errores · q5 transferencia cercana · q6 transferencia con
   *  otra estructura (problema inverso, comparación o cambio de
   *  representación). */
  questions: (variant: number) => Question[];
  /** Tarea de aplicación propia, distinta de las de los bancos. */
  application: Question;
  editorial?: Lesson["editorial"];
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Orden de opciones fijo por pregunta (mismo en servidor y navegador, y al
 *  recargar), pero distinto entre preguntas y formas: la respuesta correcta
 *  no queda siempre en la misma posición. */
export function arrangeChoices(question: Question, seed: string): Question {
  if (!question.choices) return question;
  const choices = [...question.choices];
  let state = hash(`${seed}:${question.id}`) || 1;
  for (let i = choices.length - 1; i > 0; i--) {
    state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
    const j = state % (i + 1);
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { ...question, choices };
}

export function defineLesson(draft: Draft): Lesson {
  const { questions, editorial, application, diagnostic, ...content } = draft;
  const arrange = (q: Question) => arrangeChoices(q, content.id);
  const bank = (variant: number, prefix: string, indexes: number[]) => {
    const items = questions(variant);
    return indexes.map((index, i) => arrange({ ...items[index], id: `${prefix}-${i + 1}` }));
  };
  return {
    ...content,
    version: CONTENT_VERSION,
    editorial: editorial ?? {
      status: "pending-teacher-review",
      author: "Maths · borrador de la reorientación",
      source:
        "Contenido original de Maths; conceptos de aritmética y álgebra elemental. Ver docs/reorientacion-aprendizaje.md para revisión y alcance.",
      revisionDate: "2026-10-19",
    },
    diagnostic: diagnostic.map(arrange),
    guided: bank(0, "g", [0, 1, 2]),
    practice: bank(1, "p", [0, 1, 2, 3, 4, 5, 6]),
    // La comprobación exige la transferencia de otra estructura (q6); el
    // repaso diferido recupera la transferencia cercana (q5).
    checks: [bank(2, "a", [0, 1, 2, 4, 6]), bank(3, "b", [0, 1, 2, 4, 6])],
    review: bank(4, "r", [0, 2, 3, 5]),
    // Problemas que no aparecen en ningún otro banco (forma 5, y la
    // transferencia de la forma 0, que la guiada no usa): solo el repaso
    // mixto de la unidad los muestra.
    mixed: [...bank(5, "x", [1, 3, 6]), ...bank(0, "y", [5])],
    application: arrange({ ...application, id: "m-1" }),
  };
}
