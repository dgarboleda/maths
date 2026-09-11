/**
 * Marco de referencia de la currícula: el destino son las 4 categorías de
 * contenido y la escala de niveles de desempeño de la prueba PISA de
 * Matemáticas (OCDE, marco 2022), que evalúa a los 15 años (~9.º–10.º
 * grado); los grados intermedios siguen la progresión de Common Core State
 * Standards for Mathematics (CCSS-M). Ver docs/curricula-pisa.md.
 *
 * Cada módulo de código lleva una etiqueta `pisa` (categoría + nivel) y su
 * `tier` es el grado escolar de referencia (0 = preescolar, 1–10 = 1.º a
 * 10.º). No es una prueba normada: los niveles son una estimación a partir
 * de los descriptores públicos de PISA, no un puntaje oficial.
 */

export type PisaCategory = "cantidad" | "cambio" | "espacio" | "datos";

export interface PisaCategoryDef {
  slug: PisaCategory;
  label: string;
  emoji: string;
  description: string;
}

export const PISA_CATEGORIES: PisaCategoryDef[] = [
  {
    slug: "cantidad",
    label: "Cantidad",
    emoji: "🔢",
    description: "Números, operaciones, medidas, porcentajes y estimación.",
  },
  {
    slug: "cambio",
    label: "Cambio y relaciones",
    emoji: "📈",
    description: "Patrones, ecuaciones, funciones y proporcionalidad.",
  },
  {
    slug: "espacio",
    label: "Espacio y forma",
    emoji: "📐",
    description: "Figuras, cuerpos, medidas geométricas, coordenadas y escalas.",
  },
  {
    slug: "datos",
    label: "Incertidumbre y datos",
    emoji: "🎲",
    description: "Tablas, gráficos, estadística y probabilidad.",
  },
];

export function getPisaCategory(slug: string): PisaCategoryDef | undefined {
  return PISA_CATEGORIES.find((c) => c.slug === slug);
}

export type PisaLevelCode = "B" | "1c" | "1b" | "1a" | "2" | "3" | "4" | "5" | "6";

export interface PisaLevelDef {
  code: PisaLevelCode;
  label: string;
  /** Paráfrasis breve de los descriptores de nivel de PISA 2022 (OCDE). */
  descriptor: string;
}

/**
 * Escala de niveles, de menor a mayor. El índice en este arreglo es el
 * `level` que guardan los módulos y las evaluaciones. "B" (bases) no es un
 * nivel de PISA: agrupa lo que viene antes de 1c (preescolar), para que la
 * escala también ubique a los más chicos.
 */
export const PISA_LEVELS: PisaLevelDef[] = [
  {
    code: "B",
    label: "Bases",
    descriptor:
      "Cuenta, compara y opera con números pequeños con apoyo concreto. Todavía está por debajo de lo que mide PISA.",
  },
  {
    code: "1c",
    label: "Nivel 1c",
    descriptor:
      "Responde preguntas de un solo paso con números enteros, en contextos simples y con instrucciones explícitas.",
  },
  {
    code: "1b",
    label: "Nivel 1b",
    descriptor:
      "Resuelve problemas de un paso en contextos simples donde toda la información está dada, con procedimientos directos.",
  },
  {
    code: "1a",
    label: "Nivel 1a",
    descriptor:
      "Resuelve preguntas en contextos familiares con toda la información presente, aplicando procedimientos rutinarios.",
  },
  {
    code: "2",
    label: "Nivel 2",
    descriptor:
      "Interpreta situaciones que piden una inferencia directa, extrae datos de una fuente y usa algoritmos, fórmulas y razonamiento proporcional básicos. Es el nivel mínimo de competencia según PISA.",
  },
  {
    code: "3",
    label: "Nivel 3",
    descriptor:
      "Sigue procedimientos que requieren decisiones en secuencia, trabaja con porcentajes, fracciones, decimales y proporciones, e interpreta representaciones de distintas fuentes.",
  },
  {
    code: "4",
    label: "Nivel 4",
    descriptor:
      "Usa modelos explícitos en situaciones concretas complejas, integra varias representaciones (también simbólicas) y justifica sus decisiones.",
  },
  {
    code: "5",
    label: "Nivel 5",
    descriptor:
      "Construye y usa modelos para situaciones complejas, identifica restricciones y compara y evalúa estrategias de resolución.",
  },
  {
    code: "6",
    label: "Nivel 6",
    descriptor:
      "Generaliza a partir de la modelación de situaciones complejas, conecta representaciones y razona de forma matemática avanzada.",
  },
];

const LEVEL_INDEX: Record<PisaLevelCode, number> = Object.fromEntries(
  PISA_LEVELS.map((l, i) => [l.code, i]),
) as Record<PisaLevelCode, number>;

/** Nivel 2: el mínimo de competencia que fija PISA. */
export const PISA_BASELINE_LEVEL = LEVEL_INDEX["2"];
export const MAX_PISA_LEVEL = PISA_LEVELS.length - 1;

export interface PisaTag {
  category: PisaCategory;
  /** Índice en `PISA_LEVELS`. */
  level: number;
}

/** Atajo legible para declarar la etiqueta de un módulo: `pisa("cantidad", "1a")`. */
export function pisa(category: PisaCategory, code: PisaLevelCode): PisaTag {
  return { category, level: LEVEL_INDEX[code] };
}

export function pisaLevelLabel(level: number): string {
  if (level < 0) return "Por reforzar las bases";
  return PISA_LEVELS[Math.min(level, MAX_PISA_LEVEL)].label;
}

export function pisaLevelDescriptor(level: number): string {
  if (level < 0) return "Todavía no resuelve con seguridad las preguntas más básicas de esta área.";
  return PISA_LEVELS[Math.min(level, MAX_PISA_LEVEL)].descriptor;
}

export const MAX_GRADE = 10;

/** Nombre de un grado escolar de referencia (`ModuleDef.tier`). */
export function gradeLabel(grade: number): string {
  if (grade <= 0) return "Preescolar";
  return `${Math.min(grade, MAX_GRADE)}.º grado`;
}

/**
 * Nivel PISA que corresponde a dominar los temas de un grado. Es la regla
 * con la que se etiquetaron los módulos (antes de sumar +1 a los de varios
 * pasos en contexto o de interpretación): g0 → B; g1–2 → 1c; g3 → 1b;
 * g4–5 → 1a; g6–7 → 2; g8 → 3; g9 → 4; g10 → 5.
 */
export function levelForGrade(grade: number): number {
  if (grade <= 0) return LEVEL_INDEX.B;
  if (grade <= 2) return LEVEL_INDEX["1c"];
  if (grade === 3) return LEVEL_INDEX["1b"];
  if (grade <= 5) return LEVEL_INDEX["1a"];
  if (grade <= 7) return LEVEL_INDEX["2"];
  if (grade === 8) return LEVEL_INDEX["3"];
  if (grade === 9) return LEVEL_INDEX["4"];
  return LEVEL_INDEX["5"];
}

/** Grado escolar de referencia para una edad: 1.º grado a los 6 años. */
export function expectedGradeForAge(age: number): number {
  return Math.max(0, Math.min(MAX_GRADE, Math.floor(age) - 6));
}
