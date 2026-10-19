import { NUMBER_LESSONS } from "./numbers";
import { FRACTION_LESSONS } from "./fractions";
import { FRACTION_OPERATION_LESSONS } from "./fractionOps";
import { INVERSE_LESSONS } from "./inverse";
import { EXPRESSION_LESSONS } from "./expressions";
import { GEOMETRY_LESSONS } from "./geometry";
import { DATA_LESSONS } from "./data";
import { PROPORTIONALITY_LESSONS } from "./proportionality";
import { ALGEBRA_LESSONS } from "./algebra";
import {
  ANGLE_LESSONS,
  DECIMAL_LESSONS,
  NUMBER_EXTRA_LESSONS,
  QUADRATIC_LESSONS,
  SIMILARITY_LESSONS,
} from "./extraTopics";
import {
  COUNTING_LESSONS,
  EXPONENTIAL_LESSONS,
  SPREAD_LESSONS,
  SYSTEM_LESSONS,
  TRANSFORMATION_LESSONS,
  TRIGONOMETRY_LESSONS,
} from "./upperGrades";
import type { Lesson, UnitId } from "./types";

export const LEARNING_UNITS = [
  {
    id: "numeros",
    title: "Números enteros y operaciones",
    description: "Ubica, compara y opera con números positivos y negativos.",
  },
  {
    id: "fracciones",
    title: "Fracciones y representaciones",
    description: "Entiende qué representa una parte, cómo calcularla y cómo operar con ella.",
  },
  {
    id: "proporcionalidad",
    title: "Razones y proporcionalidad",
    description: "Compara, escala y decide con una referencia común.",
  },
  {
    id: "algebra",
    title: "Ecuaciones para resolver situaciones",
    description: "Representa lo desconocido y comprueba tus decisiones.",
  },
  {
    id: "expresiones",
    title: "Expresiones, ecuaciones y funciones",
    description: "Transforma expresiones, equilibra ecuaciones completas y describe relaciones lineales.",
  },
  {
    id: "geometria",
    title: "Geometría y medida",
    description: "Mide superficies, contornos, volúmenes y distancias con sentido.",
  },
  {
    id: "datos",
    title: "Datos y probabilidad",
    description: "Resume un conjunto de datos y cuantifica la incertidumbre.",
  },
] as const satisfies readonly { id: UnitId; title: string; description: string }[];
export const LESSONS: Lesson[] = [
  ...NUMBER_LESSONS,
  ...NUMBER_EXTRA_LESSONS,
  ...FRACTION_LESSONS,
  ...FRACTION_OPERATION_LESSONS,
  ...DECIMAL_LESSONS,
  ...PROPORTIONALITY_LESSONS,
  ...INVERSE_LESSONS,
  ...ALGEBRA_LESSONS,
  ...EXPRESSION_LESSONS,
  ...QUADRATIC_LESSONS,
  ...SYSTEM_LESSONS,
  ...EXPONENTIAL_LESSONS,
  ...ANGLE_LESSONS,
  ...GEOMETRY_LESSONS,
  ...SIMILARITY_LESSONS,
  ...TRANSFORMATION_LESSONS,
  ...TRIGONOMETRY_LESSONS,
  ...DATA_LESSONS,
  ...SPREAD_LESSONS,
  ...COUNTING_LESSONS,
];
export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}
export function lessonForModule(moduleId: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.legacyModuleIds.includes(moduleId));
}
