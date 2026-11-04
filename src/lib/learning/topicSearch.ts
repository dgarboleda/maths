import { LEARNING_UNITS, LESSONS, type Lesson } from "./domain";
import { formulasFor } from "./formulas";

/**
 * Nombres con los que un tema suele llamarse en el colegio y que no aparecen
 * en el título de la clase («regla de tres», «sucesiones», «parábola»…).
 */
const SCHOOL_NAMES: Record<string, string[]> = {
  "enteros-recta": ["números negativos", "recta numérica", "valor absoluto"],
  "enteros-suma-resta": ["números negativos", "suma de enteros", "resta de enteros"],
  "enteros-producto-cociente": ["ley de signos", "regla de los signos", "números negativos"],
  "jerarquia-operaciones": ["jerarquía de operaciones", "PEMDAS", "signos de agrupación", "operaciones combinadas"],
  "potencias-raices": ["exponentes", "radicales", "radicación", "potenciación", "leyes de exponentes"],
  "notacion-cientifica": ["potencias de 10", "potencias de diez"],
  "operaciones-decimales": ["números decimales", "decimales"],
  "fracciones-unidad": ["quebrados"],
  "fracciones-equivalentes": ["quebrados", "fracciones equivalentes", "simplificar fracciones", "amplificar"],
  "fracciones-suma-resta": ["quebrados", "mínimo común múltiplo", "mcm"],
  "fracciones-producto-cociente": ["quebrados", "fracción inversa"],
  "fraccion-decimal-porcentaje": ["conversiones", "tanto por ciento"],
  "tasa-unitaria": ["regla de tres", "precio unitario", "valor unitario"],
  proporcionalidad: ["regla de tres", "magnitudes proporcionales", "proporcionalidad directa"],
  "proporcionalidad-inversa": ["regla de tres inversa", "magnitudes inversamente proporcionales"],
  "porcentajes-aplicados": ["descuentos", "aumentos", "tanto por ciento", "IGV"],
  "interes-compuesto": ["interés simple", "capital", "tasa de interés", "matemática financiera"],
  "propiedad-distributiva": ["factor común", "factorización"],
  "productos-notables": ["binomio al cuadrado", "trinomio cuadrado perfecto", "diferencia de cuadrados"],
  progresiones: ["sucesiones", "secuencias", "término enésimo", "PA", "PG"],
  "ecuaciones-cuadraticas": ["ecuación de segundo grado", "fórmula general", "factorización", "aspa simple"],
  "funcion-cuadratica": ["parábola", "vértice"],
  "funciones-lineales": ["recta", "función afín", "pendiente"],
  "funciones-exponenciales": ["exponencial", "crecimiento poblacional", "decrecimiento"],
  "sistemas-ecuaciones": ["sistema 2x2", "sustitución", "reducción", "igualación"],
  inecuaciones: ["desigualdades", "intervalos"],
  angulos: ["polígonos", "triángulos", "ángulos complementarios", "ángulos suplementarios"],
  "perimetro-area": ["áreas", "perímetros", "figuras planas"],
  circulo: ["circunferencia", "pi"],
  volumen: ["sólidos", "cuerpos geométricos", "prismas", "cilindros"],
  "volumen-conos-esferas": ["sólidos", "cuerpos geométricos", "pirámides", "conos", "esferas"],
  pitagoras: ["hipotenusa", "catetos", "triángulo rectángulo"],
  semejanza: ["Tales", "escalas", "planos", "mapas"],
  transformaciones: ["simetría", "traslación", "rotación", "reflexión", "isometrías"],
  "distancia-punto-medio": ["plano cartesiano", "coordenadas", "geometría analítica"],
  trigonometria: ["seno", "coseno", "tangente", "razones trigonométricas"],
  "media-mediana-moda": ["promedio", "medidas de tendencia central", "estadística"],
  "estadistica-dispersion": ["cuartiles", "diagrama de cajas", "bigotes", "estadística"],
  combinatoria: ["permutaciones", "combinaciones", "factorial", "conteo"],
  "probabilidad-simple": ["azar", "regla de Laplace", "dados"],
  "probabilidad-compuesta": ["azar", "sucesos independientes", "diagrama de árbol"],
  "probabilidad-condicional": ["tabla de doble entrada", "probabilidad dado que"],
};

const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "lo", "y", "e", "o", "en", "a", "al", "un", "una", "unos", "unas", "con", "por", "para", "que", "como", "sobre", "tema", "temas"]);

export const normalizeSearch = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Palabras con valor de búsqueda; el plural se reduce para que «fracciones» encuentre «fracción». */
function tokens(text: string): string[] {
  return normalizeSearch(text).split(" ").filter((word) => word && !STOPWORDS.has(word))
    .map((word) => (word.length > 4 && word.endsWith("es") ? word.slice(0, -2) : word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word));
}

export interface TopicResult {
  lesson: Lesson;
  unitTitle: string;
  /** Por qué aparece: el nombre escolar o el término que coincidió, si no es el título. */
  matchedBy?: string;
}

interface Field { text: string; words: string[]; weight: number; label?: string }
interface Entry { lesson: Lesson; unitTitle: string; order: number; fields: Field[] }

const INDEX: Entry[] = LESSONS.map((lesson, order) => {
  const unitTitle = LEARNING_UNITS.find((unit) => unit.id === lesson.unitId)?.title ?? "";
  return {
    lesson, unitTitle, order,
    fields: ([
      { text: lesson.title, weight: 6 },
      ...(SCHOOL_NAMES[lesson.id] ?? []).map((name) => ({ text: name, weight: 4, label: name })),
      ...lesson.vocabulary.map(({ term }) => ({ text: term, weight: 3, label: term })),
      ...formulasFor(lesson.id).map(({ name }) => ({ text: name, weight: 2, label: name })),
      { text: unitTitle, weight: 1 },
      { text: lesson.objective, weight: 1 },
    ] as Omit<Field, "words">[]).map((field) => ({ ...field, words: tokens(field.text) })),
  };
});

/** El término coincide con una palabra del campo si es su comienzo (o la
 *  palabra entera, para siglas cortas como «PA»). */
const wordMatches = (field: string[], term: string) =>
  field.some((word) => (term.length <= 2 ? word === term : word.startsWith(term)));

/**
 * Busca clases por título, nombre escolar, vocabulario o fórmula, sin
 * distinguir mayúsculas ni tildes. Todas las palabras de la búsqueda deben
 * aparecer en la clase; se ordenan por relevancia y luego por el orden del
 * catálogo.
 */
export function searchTopics(query: string, limit = 8): TopicResult[] {
  const terms = tokens(query);
  if (!terms.length) return [];
  const phrase = normalizeSearch(query);
  const scored: { entry: Entry; score: number; matchedBy?: string }[] = [];
  for (const entry of INDEX) {
    let score = 0;
    let best: Field | undefined;
    let complete = true;
    for (const term of terms) {
      const hits = entry.fields.filter((field) => wordMatches(field.words, term));
      if (!hits.length) { complete = false; break; }
      const top = hits.reduce((a, b) => (b.weight > a.weight ? b : a));
      score += top.weight;
      if (!best || top.weight > best.weight) best = top;
    }
    if (!complete) continue;
    const exact = entry.fields.find((field) => normalizeSearch(field.text).includes(phrase));
    if (exact) score += exact.weight * 2;
    const label = (exact ?? best)?.label;
    scored.push({ entry, score, matchedBy: label });
  }
  return scored.sort((a, b) => b.score - a.score || a.entry.order - b.entry.order).slice(0, limit)
    .map(({ entry, matchedBy }) => ({ lesson: entry.lesson, unitTitle: entry.unitTitle, matchedBy }));
}

/** Clases con nombres escolares, para validar el catálogo. */
export const SCHOOL_NAME_LESSON_IDS = Object.keys(SCHOOL_NAMES);
