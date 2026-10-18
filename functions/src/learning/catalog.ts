import { FRACTION_LESSONS } from "./fractions";
import { PROPORTIONALITY_LESSONS } from "./proportionality";
import { ALGEBRA_LESSONS } from "./algebra";
import type { Lesson } from "./types";

export const LEARNING_UNITS = [
  {
    id: "fracciones",
    title: "Fracciones y representaciones",
    description: "Entiende qué representa una parte y cómo calcularla.",
    color: "cyan",
  },
  {
    id: "proporcionalidad",
    title: "Razones y proporcionalidad",
    description: "Compara, escala y decide con una referencia común.",
    color: "amber",
  },
  {
    id: "algebra",
    title: "Álgebra para resolver situaciones",
    description: "Representa lo desconocido y comprueba tus decisiones.",
    color: "violet",
  },
] as const;
export const LESSONS: Lesson[] = [
  ...FRACTION_LESSONS,
  ...PROPORTIONALITY_LESSONS,
  ...ALGEBRA_LESSONS,
];
export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}
export function lessonForModule(moduleId: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.legacyModuleIds.includes(moduleId));
}
