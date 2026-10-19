import type { UnitId } from "./types";

/**
 * Correspondencia ORIENTATIVA con el Currículo Nacional de la Educación
 * Básica del Perú (CNEB, MINEDU 2016), área de Matemática, nivel secundaria.
 * Las cuatro competencias son las del CNEB; el grado indica dónde suele
 * trabajarse el contenido según el Programa curricular de Educación
 * Secundaria. Es una propuesta de Maths pendiente de validación docente: no
 * certifica un grado ni sustituye la evaluación de la institución educativa.
 */
export type PeruCompetency = "cantidad" | "regularidad" | "forma" | "datos";

export const PERU_COMPETENCIES: Record<PeruCompetency, string> = {
  cantidad: "Resuelve problemas de cantidad",
  regularidad: "Resuelve problemas de regularidad, equivalencia y cambio",
  forma: "Resuelve problemas de forma, movimiento y localización",
  datos: "Resuelve problemas de gestión de datos e incertidumbre",
};

/** Grado de secundaria (1.° a 5.°). Ciclo VI: 1.° y 2.°; ciclo VII: 3.° a 5.°. */
export type PeruGrade = 1 | 2 | 3 | 4 | 5;

export const PERU_MAP: Record<string, { competency: PeruCompetency; grade: PeruGrade }> = {
  "enteros-recta": { competency: "cantidad", grade: 1 },
  "enteros-suma-resta": { competency: "cantidad", grade: 1 },
  "enteros-producto-cociente": { competency: "cantidad", grade: 1 },
  "jerarquia-operaciones": { competency: "cantidad", grade: 1 },
  "potencias-raices": { competency: "cantidad", grade: 2 },
  "notacion-cientifica": { competency: "cantidad", grade: 2 },
  "fracciones-unidad": { competency: "cantidad", grade: 1 },
  "fracciones-equivalentes": { competency: "cantidad", grade: 1 },
  "fraccion-decimal-porcentaje": { competency: "cantidad", grade: 1 },
  "fraccion-cantidad": { competency: "cantidad", grade: 1 },
  "fracciones-suma-resta": { competency: "cantidad", grade: 1 },
  "fracciones-producto-cociente": { competency: "cantidad", grade: 1 },
  "operaciones-decimales": { competency: "cantidad", grade: 1 },
  razones: { competency: "regularidad", grade: 1 },
  "tasa-unitaria": { competency: "regularidad", grade: 1 },
  proporcionalidad: { competency: "regularidad", grade: 2 },
  "porcentajes-aplicados": { competency: "cantidad", grade: 2 },
  "proporcionalidad-inversa": { competency: "regularidad", grade: 2 },
  "igualdad-incognita": { competency: "regularidad", grade: 1 },
  "ecuaciones-un-paso": { competency: "regularidad", grade: 1 },
  "ecuaciones-dos-pasos": { competency: "regularidad", grade: 1 },
  "modelar-ecuaciones": { competency: "regularidad", grade: 2 },
  "expresiones-algebraicas": { competency: "regularidad", grade: 1 },
  "propiedad-distributiva": { competency: "regularidad", grade: 2 },
  "ecuaciones-ambos-lados": { competency: "regularidad", grade: 2 },
  inecuaciones: { competency: "regularidad", grade: 3 },
  "funciones-lineales": { competency: "regularidad", grade: 3 },
  "ecuaciones-cuadraticas": { competency: "regularidad", grade: 4 },
  angulos: { competency: "forma", grade: 1 },
  "perimetro-area": { competency: "forma", grade: 1 },
  circulo: { competency: "forma", grade: 2 },
  volumen: { competency: "forma", grade: 2 },
  pitagoras: { competency: "forma", grade: 3 },
  semejanza: { competency: "forma", grade: 3 },
  "media-mediana-moda": { competency: "datos", grade: 1 },
  "probabilidad-simple": { competency: "datos", grade: 2 },
  "probabilidad-compuesta": { competency: "datos", grade: 4 },
};

export function peruGradeLabel(grade: PeruGrade): string {
  return `${grade}.° de secundaria`;
}

/** Unidad del programa de Maths → competencia principal del CNEB. */
export const UNIT_COMPETENCY: Record<UnitId, PeruCompetency> = {
  numeros: "cantidad",
  fracciones: "cantidad",
  proporcionalidad: "regularidad",
  algebra: "regularidad",
  expresiones: "regularidad",
  geometria: "forma",
  datos: "datos",
};

/**
 * Grado orientativo alcanzado en una competencia: el mayor grado cuyas
 * clases de esa competencia (y las de grados anteriores) están todas
 * dominadas. 0 = todavía ninguno completo.
 */
export function peruLevel(competency: PeruCompetency, mastered: Set<string>): number {
  let level = 0;
  for (let grade = 1; grade <= 5; grade++) {
    const lessons = Object.entries(PERU_MAP).filter(
      ([, m]) => m.competency === competency && m.grade === grade,
    );
    if (lessons.length === 0) continue;
    if (lessons.every(([id]) => mastered.has(id))) level = grade;
    else break;
  }
  return level;
}
