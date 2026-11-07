import { describeCustomLessonErrors, type CustomLesson, type CustomQuestion } from "../../../../functions/src/customLessons/schema";
import { blankLesson, newQuestionId } from "./lessonDraft";

/** Copia como borrador nuevo: sin publicar, sin posición y con preguntas propias. */
export function duplicateLesson(lesson: CustomLesson): CustomLesson {
  const copy: CustomLesson = {
    ...structuredClone(lesson),
    title: `${lesson.title} (copia)`.slice(0, 120),
    published: false,
    updatedAt: Date.now(),
    questions: lesson.questions.map((q) => ({ ...structuredClone(q), id: newQuestionId() })),
  };
  delete copy.contentVersion;
  delete copy.order;
  return copy;
}

export const EXPORT_FORMAT = "numerario-clase";

export function exportLesson(lesson: CustomLesson): string {
  const clean = { ...lesson };
  delete clean.contentVersion;
  delete clean.order;
  // Los alumnos asignados y la clase previa solo valen en esta familia.
  delete clean.assignedTo;
  delete clean.requires;
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, lesson: { ...clean, published: false } }, null, 2);
}

/** Lee un archivo exportado (o una clase suelta) y lo deja listo como borrador nuevo. */
export function importLesson(text: string): { ok: true; lesson: CustomLesson } | { ok: false; message: string } {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, message: "El archivo no es un JSON válido." }; }
  const raw = (data && typeof data === "object" && (data as { format?: unknown }).format === EXPORT_FORMAT ? (data as { lesson: unknown }).lesson : data) as Partial<CustomLesson> | null;
  if (!raw || typeof raw !== "object") return { ok: false, message: "El archivo no contiene una clase." };
  const lesson: CustomLesson = {
    ...blankLesson(),
    ...raw,
    published: false,
    updatedAt: Date.now(),
    questions: Array.isArray(raw.questions) ? raw.questions.map((q: CustomQuestion) => ({ ...q, id: newQuestionId() })) : [],
  };
  delete lesson.contentVersion;
  delete lesson.order;
  delete lesson.assignedTo;
  delete lesson.requires;
  const errors = describeCustomLessonErrors(lesson, { draft: true });
  if (errors.length) return { ok: false, message: `No se puede importar: ${errors[0].message}` };
  return { ok: true, lesson };
}

export function downloadLesson(lesson: CustomLesson): void {
  const blob = new Blob([exportLesson(lesson)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(lesson.title || "clase").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "clase"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Plantillas de partida: muestran cada tipo de pregunta y los comentarios por respuesta. */
export interface LessonTemplate { id: string; name: string; build: () => CustomLesson }
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
const q = (question: WithoutId<CustomQuestion>): CustomQuestion => ({ ...question, id: newQuestionId() } as CustomQuestion);

export const TEMPLATES: LessonTemplate[] = [
  {
    id: "fracciones",
    name: "Fracciones equivalentes (opción múltiple con comentarios)",
    build: () => ({
      ...blankLesson("Fracciones"),
      title: "Fracciones equivalentes",
      content: "# Fracciones equivalentes\nDos fracciones son **equivalentes** si representan la misma cantidad.\n\n- Multiplica numerador y denominador por el mismo número: 1/2 = 2/4.\n- Divide los dos entre el mismo número: 6/8 = 3/4.",
      questions: [
        q({ kind: "choice", prompt: "¿Qué fracción es equivalente a 1/2?", options: ["2/4", "1/4", "2/3"], answer: 0, explanation: "1/2 = (1·2)/(2·2) = 2/4.", hint: "Multiplica arriba y abajo por el mismo número.", optionFeedback: ["", "Solo has cambiado el denominador.", "Has sumado 1 arriba y abajo: eso no conserva el valor."] }),
        q({ kind: "numeric", prompt: "Simplifica 6/8.", value: "3/4", explanation: "6/8 = (6÷2)/(8÷2) = 3/4.", hint: "Busca un número que divida a 6 y a 8." }),
      ],
    }),
  },
  {
    id: "verdadero-falso",
    name: "Verdadero o falso",
    build: () => ({
      ...blankLesson("Repaso"),
      title: "¿Verdadero o falso?",
      content: "Lee cada afirmación y decide si es verdadera o falsa.",
      questions: [
        q({ kind: "choice", prompt: "Todo número par es divisible entre 2.", options: ["Verdadero", "Falso"], answer: 0, explanation: "Un número es par justo cuando es múltiplo de 2." }),
        q({ kind: "choice", prompt: "0,5 es mayor que 0,45.", options: ["Verdadero", "Falso"], answer: 0, explanation: "0,50 > 0,45: compara las décimas.", optionFeedback: ["", "Compara cifra a cifra: 5 décimas frente a 4 décimas."] }),
      ],
    }),
  },
  {
    id: "calculo-mental",
    name: "Cálculo mental (respuesta numérica)",
    build: () => ({
      ...blankLesson("Cálculo mental"),
      title: "Multiplicar por 10, 100 y 1000",
      content: "Al multiplicar por 10, 100 o 1000, cada cifra **sube** una, dos o tres posiciones.",
      questions: [
        q({ kind: "numeric", prompt: "¿Cuánto es 3,7 × 100?", value: "370", explanation: "La coma se desplaza dos lugares a la derecha.", hint: "×100 mueve la coma dos lugares." }),
        q({ kind: "numeric", prompt: "¿Cuánto es 45 × 10?", value: "450", explanation: "45 decenas son 450." }),
        q({ kind: "numeric", prompt: "Redondea π a las centésimas.", value: "3,14", tolerance: 0, explanation: "π ≈ 3,14159…: la cifra de las milésimas es 1, se queda 3,14." }),
      ],
    }),
  },
];

