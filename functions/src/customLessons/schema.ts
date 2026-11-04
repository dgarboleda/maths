/** Contenido creado por una familia. Las opciones se identifican por posición para poder usar texto en los minijuegos. */
export const CUSTOM_GAMES = ["write", "frogger", "cohete", "snake", "runner", "numberpac", "invaders", "breakout", "topos", "cajas"] as const;
export type CustomGame = typeof CUSTOM_GAMES[number];
export interface CustomQuestion { id: string; prompt: string; answer: number; options: string[]; explanation: string }
export interface CustomLesson {
  title: string; topic: string; content: string; game: CustomGame; questions: CustomQuestion[]; published: boolean; updatedAt: number;
  /** Versión con la que se guarda el progreso. Solo cambia si cambian las preguntas, sus opciones o la respuesta correcta. */
  contentVersion?: number;
  /** Posición dentro de su tema. */
  order?: number;
}

export const LIMITS = { title: 120, topic: 120, content: 10000, prompt: 500, option: 120, explanation: 1000, questions: 30, minOptions: 2, maxOptions: 5, gameOptions: 5 } as const;
const QUESTION_ID = /^[a-zA-Z0-9_-]{1,64}$/;

export interface LessonError { question?: number; field: "topic" | "title" | "content" | "questions" | "prompt" | "options" | "answer" | "explanation" | "id"; message: string }

/** Todos los motivos por los que una clase no se puede publicar, para mostrarlos junto a cada campo. */
export function describeCustomLessonErrors(value: unknown): LessonError[] {
  if (!value || typeof value !== "object") return [{ field: "questions", message: "La clase no tiene un formato válido." }];
  const v = value as Partial<CustomLesson>;
  const errors: LessonError[] = [];
  const text = (x: unknown, max: number, field: LessonError["field"], name: string, question?: number) => {
    if (typeof x !== "string" || !x.trim()) errors.push({ question, field, message: `Escribe ${name}.` });
    else if (x.length > max) errors.push({ question, field, message: `${name[0].toUpperCase()}${name.slice(1)} supera ${max} caracteres.` });
  };
  text(v.topic, LIMITS.topic, "topic", "el tema");
  text(v.title, LIMITS.title, "title", "el título");
  text(v.content, LIMITS.content, "content", "el contenido de la clase");
  const minigame = v.game !== "write";
  if (!CUSTOM_GAMES.includes(v.game as CustomGame)) errors.push({ field: "questions", message: "Elige un minijuego válido." });
  if (typeof v.published !== "boolean" || !Number.isSafeInteger(v.updatedAt)) errors.push({ field: "questions", message: "La clase no tiene un formato válido." });
  if (v.contentVersion !== undefined && !(Number.isSafeInteger(v.contentVersion) && v.contentVersion >= 1)) errors.push({ field: "questions", message: "La versión de la clase no es válida." });
  if (v.order !== undefined && !Number.isSafeInteger(v.order)) errors.push({ field: "questions", message: "La posición de la clase no es válida." });
  if (!Array.isArray(v.questions) || v.questions.length === 0) { errors.push({ field: "questions", message: "Añade al menos una pregunta." }); return errors; }
  if (v.questions.length > LIMITS.questions) errors.push({ field: "questions", message: `Una clase admite como máximo ${LIMITS.questions} preguntas.` });
  const ids = new Set<unknown>();
  v.questions.forEach((q: Partial<CustomQuestion> | null | undefined, i) => {
    if (!q || typeof q !== "object") { errors.push({ question: i, field: "prompt", message: "La pregunta no tiene un formato válido." }); return; }
    if (typeof q.id !== "string" || !QUESTION_ID.test(q.id) || ids.has(q.id)) errors.push({ question: i, field: "id", message: "La pregunta tiene un identificador repetido o no válido." });
    ids.add(q.id);
    text(q.prompt, LIMITS.prompt, "prompt", "el enunciado", i);
    const options = Array.isArray(q.options) ? q.options : [];
    if (minigame && options.length !== LIMITS.gameOptions) errors.push({ question: i, field: "options", message: `Los minijuegos necesitan ${LIMITS.gameOptions} respuestas (hay ${options.length}).` });
    else if (options.length < LIMITS.minOptions || options.length > LIMITS.maxOptions) errors.push({ question: i, field: "options", message: `Escribe entre ${LIMITS.minOptions} y ${LIMITS.maxOptions} respuestas (hay ${options.length}).` });
    if (options.some((o) => typeof o !== "string" || !o.trim())) errors.push({ question: i, field: "options", message: "Hay respuestas vacías." });
    else if (options.some((o) => o.length > LIMITS.option)) errors.push({ question: i, field: "options", message: `Cada respuesta admite como máximo ${LIMITS.option} caracteres.` });
    if (new Set(options).size !== options.length) errors.push({ question: i, field: "options", message: "Hay respuestas repetidas." });
    if (!Number.isSafeInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) >= options.length) errors.push({ question: i, field: "answer", message: "Marca la respuesta correcta." });
    if (typeof q.explanation !== "string") errors.push({ question: i, field: "explanation", message: "La explicación no es válida." });
    else if (q.explanation.length > LIMITS.explanation) errors.push({ question: i, field: "explanation", message: `La explicación supera ${LIMITS.explanation} caracteres.` });
  });
  return errors;
}

export function validateCustomLesson(value: unknown): value is CustomLesson {
  return describeCustomLessonErrors(value).length === 0;
}

/** Versión con la que se comparan las respuestas y el progreso. Las clases antiguas no tienen `contentVersion`. */
export function lessonVersion(lesson: Pick<CustomLesson, "contentVersion" | "updatedAt">): number {
  return lesson.contentVersion ?? lesson.updatedAt;
}

/** Lo que, si cambia, invalida el progreso: qué preguntas hay y qué opción es la correcta. */
export function structuralKey(lesson: Pick<CustomLesson, "questions">): string {
  return JSON.stringify(lesson.questions.map((q) => [q.id, q.options, q.answer]));
}

/** Corregir textos conserva el progreso de los alumnos; cambiar preguntas, opciones o respuestas lo reinicia. */
export function nextContentVersion(previous: CustomLesson | null, next: Pick<CustomLesson, "questions">, now: number): number {
  if (!previous || structuralKey(previous) !== structuralKey(next)) return now;
  return lessonVersion(previous);
}
