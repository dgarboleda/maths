import type { Lesson, Question } from "./types";

type Draft = Omit<
  Lesson,
  | "version"
  | "editorial"
  | "guided"
  | "practice"
  | "checks"
  | "review"
  | "application"
> & {
  questions: (variant: number) => Question[];
  editorial?: Lesson["editorial"];
};
export function defineLesson(draft: Draft): Lesson {
  const { questions, editorial, ...content } = draft;
  const bank = (
    variant: number,
    prefix: string,
    indexes = [0, 1, 2, 3, 4, 5],
  ) => {
    const items = questions(variant);
    return indexes.map((index, i) => ({
      ...items[index],
      id: `${prefix}-${i + 1}`,
    }));
  };
  return {
    ...content,
    version: 1,
    editorial: editorial ?? {
      status: "pending-teacher-review",
      author: "Maths · borrador de la reorientación",
      source:
        "Contenido original de Maths; conceptos de aritmética y álgebra elemental. Ver docs/reorientacion-aprendizaje.md para revisión y alcance.",
      revisionDate: "2026-10-18",
    },
    guided: bank(0, "g", [0, 1, 2]),
    practice: bank(1, "p"),
    checks: [bank(2, "a", [0, 1, 2, 4, 5]), bank(3, "b", [0, 1, 2, 4, 5])],
    review: bank(4, "r", [0, 2, 3, 5]),
    application: bank(5, "m", [5])[0],
  };
}
