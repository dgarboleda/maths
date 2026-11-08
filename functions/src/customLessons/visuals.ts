import type { Visual } from "../learning/types";

/** Modelos disponibles en las clases integradas, reutilizados sin ejecutar código de la familia. */
export const VISUAL_CATALOG = [
  ["fraction", "Fracciones", "Fracciones y números"], ["equivalence", "Fracciones equivalentes", "Fracciones y números"],
  ["percent", "Porcentajes", "Fracciones y números"], ["quantity", "Fracción de una cantidad", "Fracciones y números"],
  ["fraction-sum", "Suma de fracciones", "Fracciones y números"], ["fraction-product", "Producto de fracciones", "Fracciones y números"],
  ["integers", "Recta de enteros", "Fracciones y números"], ["integer-product", "Producto de enteros", "Fracciones y números"],
  ["order", "Orden de operaciones", "Fracciones y números"], ["square-root", "Raíces cuadradas", "Fracciones y números"],
  ["powers", "Potencias", "Fracciones y números"], ["decimal-grid", "Cuadrícula decimal", "Fracciones y números"],
  ["sieve", "Números primos", "Fracciones y números"], ["roman", "Números romanos", "Fracciones y números"],
  ["columns", "Suma y resta en columnas", "Operaciones"], ["equal-groups", "Grupos iguales", "Operaciones"],
  ["long-division", "División larga", "Operaciones"], ["column-multiplication", "Multiplicación en columnas", "Operaciones"],
  ["decimal-division", "División decimal", "Operaciones"], ["factor-table", "Tabla de factores", "Operaciones"], ["ruffini", "Regla de Ruffini", "Operaciones"],
  ["ratio", "Razones", "Proporcionalidad"], ["rate", "Tasas", "Proporcionalidad"], ["change", "Cambio proporcional", "Proporcionalidad"],
  ["direct", "Proporcionalidad directa", "Proporcionalidad"], ["inverse", "Proporcionalidad inversa", "Proporcionalidad"], ["interest", "Interés compuesto", "Proporcionalidad"],
  ["balance", "Balanza", "Álgebra y funciones"], ["equation", "Ecuaciones", "Álgebra y funciones"], ["inequality", "Inecuaciones", "Álgebra y funciones"],
  ["linear", "Función lineal", "Álgebra y funciones"], ["parabola", "Parábola", "Álgebra y funciones"], ["vertex", "Vértice de una parábola", "Álgebra y funciones"],
  ["system", "Sistema de ecuaciones", "Álgebra y funciones"], ["exponential", "Función exponencial", "Álgebra y funciones"], ["sequence", "Sucesiones", "Álgebra y funciones"],
  ["binomial-square", "Cuadrado de un binomio", "Álgebra y funciones"], ["distributive", "Propiedad distributiva", "Álgebra y funciones"],
  ["expression", "Expresiones algebraicas", "Álgebra y funciones"], ["trinomial", "Trinomios", "Álgebra y funciones"],
  ["area", "Área de un rectángulo", "Geometría"], ["angles", "Ángulos", "Geometría"], ["pythagoras", "Teorema de Pitágoras", "Geometría"],
  ["circle", "Círculo", "Geometría"], ["similarity", "Semejanza", "Geometría"], ["volume", "Volumen", "Geometría"],
  ["solids", "Sólidos geométricos", "Geometría"], ["distance", "Distancia y punto medio", "Geometría"], ["transform", "Transformaciones", "Geometría"],
  ["trig", "Trigonometría", "Geometría"], ["net", "Desarrollo plano", "Geometría"], ["metric", "Unidades de medida", "Geometría"],
  ["data", "Datos y media", "Datos y probabilidad"], ["probability", "Probabilidad", "Datos y probabilidad"],
  ["tree", "Árbol de probabilidad", "Datos y probabilidad"], ["boxplot", "Diagrama de caja", "Datos y probabilidad"],
  ["counting", "Conteo", "Datos y probabilidad"], ["two-way", "Tabla de doble entrada", "Datos y probabilidad"], ["frequency", "Frecuencias", "Datos y probabilidad"],
] as const satisfies readonly (readonly [Visual, string, string])[];

export type LessonVisualKind = Visual | "custom-number-line";
export interface LessonVisual {
  id: string;
  kind: LessonVisualKind;
  title: string;
  description: string;
  /** Solo para la recta configurable; enteros con amplitud máxima de 100. */
  min?: number;
  max?: number;
  initial?: number;
}
export const MAX_VISUALS = 8;
export const VISUAL_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const kinds = new Set<string>(VISUAL_CATALOG.map(([kind]) => kind));
export function isLessonVisual(value: unknown): value is LessonVisual {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Partial<LessonVisual>;
  if (typeof v.id !== "string" || !VISUAL_ID.test(v.id) || typeof v.kind !== "string" || (v.kind !== "custom-number-line" && !kinds.has(v.kind))) return false;
  if (typeof v.title !== "string" || v.title.length > 100 || typeof v.description !== "string" || v.description.length > 500) return false;
  if (v.kind === "custom-number-line") {
    const { min, max, initial } = v;
    return Number.isInteger(min) && Number.isInteger(max) && Number.isInteger(initial) && min! >= -100 && max! <= 100 && min! < max! && max! - min! <= 100 && initial! >= min! && initial! <= max!;
  }
  return v.min === undefined && v.max === undefined && v.initial === undefined;
}
export function validLessonVisuals(value: unknown): value is LessonVisual[] {
  return Array.isArray(value) && value.length <= MAX_VISUALS && value.every(isLessonVisual) && new Set(value.map((v) => v.id)).size === value.length;
}
