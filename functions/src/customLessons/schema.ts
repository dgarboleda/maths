/**
 * Clases creadas por una familia. El documento completo
 * (`parents/{p}/customLessons/{id}`) solo lo lee la familia: lleva las
 * respuestas, explicaciones, pistas y comentarios por respuesta. Los alumnos
 * leen la proyección `customLessonsPublic/{id}` (`publicLesson`), que existe
 * solo mientras la clase está publicada. Ambas las escriben las funciones
 * (`admin.ts`), que validan aquí mismo.
 *
 * Las opciones se identifican por posición para poder usar texto en los minijuegos.
 */
export const CUSTOM_GAMES = ["write", "frogger", "cohete", "snake", "runner", "numberpac", "invaders", "breakout", "topos", "cajas"] as const;
export type CustomGame = typeof CUSTOM_GAMES[number];
/** Qué hace cada botón con el estado publicado: «Guardar cambios» (keep) mantiene el estado; solo «Retirar» despublica. */
export const SAVE_MODES = ["draft", "keep", "publish", "unpublish"] as const;
export type SaveMode = typeof SAVE_MODES[number];
export const QUESTION_KINDS = ["choice", "numeric"] as const;
export type QuestionKind = typeof QUESTION_KINDS[number];

interface QuestionBase {
  id: string;
  prompt: string;
  /** Se muestra al acertar. */
  explanation: string;
  /** Se muestra tras el primer fallo. */
  hint?: string;
}
export interface ChoiceQuestion extends QuestionBase {
  /** Ausente en las clases anteriores a los tipos de pregunta. */
  kind?: "choice";
  options: string[];
  /** Posición de la opción correcta. */
  answer: number;
  /** Comentario al elegir cada opción incorrecta («Has sumado los denominadores»). Misma longitud que `options`. */
  optionFeedback?: string[];
}
export interface NumericQuestion extends QuestionBase {
  kind: "numeric";
  /** Valor esperado tal como lo escribe la familia: «3/4», «0,75», «-2». */
  value: string;
  /** Margen absoluto aceptado (0 = exacto, con fracciones y decimales equivalentes). */
  tolerance?: number;
}
export type CustomQuestion = ChoiceQuestion | NumericQuestion;

export interface CustomLesson {
  title: string; topic: string; content: string; game: CustomGame; questions: CustomQuestion[]; published: boolean; updatedAt: number;
  /** Versión con la que se guarda el progreso. Solo cambia si cambian las preguntas, sus opciones o la respuesta correcta. */
  contentVersion?: number;
  /** Posición dentro de su tema. */
  order?: number;
  /** Alumnos que la ven. Ausente o vacío: todos. */
  assignedTo?: string[];
  /** No se muestra antes de este instante (ms). */
  availableFrom?: number;
  /** Fecha orientativa de entrega (ms). No oculta la clase. */
  dueAt?: number;
  /** Clase que hay que terminar antes de empezar esta. */
  requires?: string;
}

export const LIMITS = { title: 120, topic: 120, content: 10000, prompt: 500, option: 120, explanation: 1000, hint: 500, feedback: 300, value: 40, questions: 30, minOptions: 2, maxOptions: 5, gameOptions: 5, assigned: 50 } as const;
export const QUESTION_ID = /^[a-zA-Z0-9_-]{1,64}$/;
export const DOC_ID = /^[a-zA-Z0-9_-]{1,128}$/;
export const TRUE_FALSE = ["Verdadero", "Falso"] as const;

export const isNumeric = (q: Pick<CustomQuestion, "kind">): q is NumericQuestion => q.kind === "numeric";

/**
 * Lee un número escrito por una persona: enteros, decimales con coma o punto,
 * fracciones («-3/4») y números mixtos («1 1/2»). `null` si no es un número.
 */
export function parseNumber(raw: string): number | null {
  const text = raw.trim().replace(/[−–]/g, "-").replace(/\s+/g, " ");
  const dec = /^[-+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/;
  if (dec.test(text)) return Number(text.replace(",", "."));
  const frac = /^([-+])?(?:(\d+) )?(\d+)\/(\d+)$/.exec(text);
  if (!frac) return null;
  const [, sign, whole, num, den] = frac;
  if (Number(den) === 0) return null;
  const value = (whole ? Number(whole) : 0) + Number(num) / Number(den);
  return sign === "-" ? -value : value;
}

/** Una respuesta numérica es correcta si vale lo mismo que la esperada (±margen): 6/8 ≡ 3/4 ≡ 0,75. */
export function numericMatches(question: Pick<NumericQuestion, "value" | "tolerance">, given: string): boolean {
  const expected = parseNumber(question.value);
  const value = parseNumber(given);
  if (expected === null || value === null) return false;
  return Math.abs(expected - value) <= (question.tolerance ?? 0) + 1e-9;
}

export type ErrorField = "topic" | "title" | "content" | "questions" | "prompt" | "options" | "answer" | "explanation" | "id" | "hint" | "feedback" | "value" | "tolerance" | "assignedTo" | "availableFrom" | "dueAt" | "requires";
export interface LessonError { question?: number; field: ErrorField; message: string }

/**
 * Todos los motivos por los que una clase no se puede publicar, para mostrarlos
 * junto a cada campo. Con `draft`, solo lo imprescindible para guardar un
 * borrador: el título, los tipos y los tamaños máximos.
 */
export function describeCustomLessonErrors(value: unknown, { draft = false }: { draft?: boolean } = {}): LessonError[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [{ field: "questions", message: "La clase no tiene un formato válido." }];
  const v = value as Partial<CustomLesson>;
  const errors: LessonError[] = [];
  const text = (x: unknown, max: number, field: ErrorField, name: string, question?: number, required = true) => {
    if (typeof x !== "string") { if (required || x !== undefined) errors.push({ question, field, message: required ? `Escribe ${name}.` : `${cap(name)} no es válido.` }); }
    else if (required && !draft && !x.trim()) errors.push({ question, field, message: `Escribe ${name}.` });
    else if (x.length > max) errors.push({ question, field, message: `${cap(name)} supera ${max} caracteres.` });
  };
  text(v.topic, LIMITS.topic, "topic", "el tema");
  text(v.title, LIMITS.title, "title", "el título");
  if (draft && typeof v.title === "string" && !v.title.trim()) errors.push({ field: "title", message: "Escribe al menos el título para guardar el borrador." });
  text(v.content, LIMITS.content, "content", "el contenido de la clase");
  const minigame = v.game !== "write";
  if (!CUSTOM_GAMES.includes(v.game as CustomGame)) errors.push({ field: "questions", message: "Elige un minijuego válido." });
  if (typeof v.published !== "boolean" || !Number.isSafeInteger(v.updatedAt)) errors.push({ field: "questions", message: "La clase no tiene un formato válido." });
  if (v.contentVersion !== undefined && !(Number.isSafeInteger(v.contentVersion) && v.contentVersion >= 1)) errors.push({ field: "questions", message: "La versión de la clase no es válida." });
  if (v.order !== undefined && !Number.isSafeInteger(v.order)) errors.push({ field: "questions", message: "La posición de la clase no es válida." });
  if (v.assignedTo !== undefined && (!Array.isArray(v.assignedTo) || v.assignedTo.length > LIMITS.assigned || v.assignedTo.some((id) => typeof id !== "string" || !DOC_ID.test(id)) || new Set(v.assignedTo).size !== v.assignedTo.length)) errors.push({ field: "assignedTo", message: "Los alumnos elegidos no son válidos." });
  const time = (x: unknown) => Number.isSafeInteger(x) && (x as number) >= 0;
  if (v.availableFrom !== undefined && !time(v.availableFrom)) errors.push({ field: "availableFrom", message: "La fecha de inicio no es válida." });
  if (v.dueAt !== undefined && !time(v.dueAt)) errors.push({ field: "dueAt", message: "La fecha de entrega no es válida." });
  if (time(v.availableFrom) && time(v.dueAt) && (v.dueAt as number) < (v.availableFrom as number)) errors.push({ field: "dueAt", message: "La entrega no puede ser antes del inicio." });
  if (v.requires !== undefined && (typeof v.requires !== "string" || !DOC_ID.test(v.requires))) errors.push({ field: "requires", message: "La clase previa no es válida." });
  if (!Array.isArray(v.questions)) { errors.push({ field: "questions", message: "Añade al menos una pregunta." }); return errors; }
  if (v.questions.length === 0 && !draft) { errors.push({ field: "questions", message: "Añade al menos una pregunta." }); return errors; }
  if (v.questions.length > LIMITS.questions) errors.push({ field: "questions", message: `Una clase admite como máximo ${LIMITS.questions} preguntas.` });
  const ids = new Set<unknown>();
  (v.questions as unknown[]).forEach((raw, i) => {
    const q = raw as Partial<Omit<ChoiceQuestion, "kind"> & Omit<NumericQuestion, "kind"> & { kind: string }> | null | undefined;
    if (!q || typeof q !== "object") { errors.push({ question: i, field: "prompt", message: "La pregunta no tiene un formato válido." }); return; }
    if (typeof q.id !== "string" || !QUESTION_ID.test(q.id) || ids.has(q.id)) errors.push({ question: i, field: "id", message: "La pregunta tiene un identificador repetido o no válido." });
    ids.add(q.id);
    text(q.prompt, LIMITS.prompt, "prompt", "el enunciado", i);
    if (typeof q.explanation !== "string") errors.push({ question: i, field: "explanation", message: "La explicación no es válida." });
    else if (q.explanation.length > LIMITS.explanation) errors.push({ question: i, field: "explanation", message: `La explicación supera ${LIMITS.explanation} caracteres.` });
    text(q.hint, LIMITS.hint, "hint", "la pista", i, false);
    if (q.kind !== undefined && !QUESTION_KINDS.includes(q.kind as QuestionKind)) { errors.push({ question: i, field: "prompt", message: "El tipo de pregunta no es válido." }); return; }
    if (q.kind === "numeric") {
      if (minigame && !draft) errors.push({ question: i, field: "value", message: "Las preguntas de respuesta numérica se juegan sin minijuego." });
      if (typeof q.value !== "string" || q.value.length > LIMITS.value) errors.push({ question: i, field: "value", message: "La respuesta no es válida." });
      else if (!draft && parseNumber(q.value) === null) errors.push({ question: i, field: "value", message: "Escribe la respuesta como número: 12, 0,75 o 3/4." });
      if (q.tolerance !== undefined && !(typeof q.tolerance === "number" && Number.isFinite(q.tolerance) && q.tolerance >= 0)) errors.push({ question: i, field: "tolerance", message: "El margen debe ser un número positivo." });
      return;
    }
    const options: unknown[] = Array.isArray(q.options) ? q.options : [];
    if (!Array.isArray(q.options)) errors.push({ question: i, field: "options", message: "Las respuestas no son válidas." });
    if (!draft) {
      if (minigame && options.length !== LIMITS.gameOptions) errors.push({ question: i, field: "options", message: `Los minijuegos necesitan ${LIMITS.gameOptions} respuestas (hay ${options.length}).` });
      else if (options.length < LIMITS.minOptions || options.length > LIMITS.maxOptions) errors.push({ question: i, field: "options", message: `Escribe entre ${LIMITS.minOptions} y ${LIMITS.maxOptions} respuestas (hay ${options.length}).` });
    } else if (options.length > LIMITS.maxOptions) errors.push({ question: i, field: "options", message: `Escribe como máximo ${LIMITS.maxOptions} respuestas.` });
    if (options.some((o) => typeof o !== "string")) errors.push({ question: i, field: "options", message: "Las respuestas no son válidas." });
    else if (!draft && options.some((o) => !(o as string).trim())) errors.push({ question: i, field: "options", message: "Hay respuestas vacías." });
    else if (options.some((o) => (o as string).length > LIMITS.option)) errors.push({ question: i, field: "options", message: `Cada respuesta admite como máximo ${LIMITS.option} caracteres.` });
    if (!draft && new Set(options).size !== options.length) errors.push({ question: i, field: "options", message: "Hay respuestas repetidas." });
    if (!Number.isSafeInteger(q.answer) || (!draft && ((q.answer as number) < 0 || (q.answer as number) >= options.length))) errors.push({ question: i, field: "answer", message: "Marca la respuesta correcta." });
    if (q.optionFeedback !== undefined && (!Array.isArray(q.optionFeedback) || q.optionFeedback.length !== options.length || q.optionFeedback.some((f: unknown) => typeof f !== "string" || f.length > LIMITS.feedback))) errors.push({ question: i, field: "feedback", message: `Cada comentario admite como máximo ${LIMITS.feedback} caracteres.` });
  });
  return errors;
}
const cap = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;

export function validateCustomLesson(value: unknown): value is CustomLesson {
  return describeCustomLessonErrors(value).length === 0;
}

/** Versión con la que se comparan las respuestas y el progreso. Las clases antiguas no tienen `contentVersion`. */
export function lessonVersion(lesson: Pick<CustomLesson, "contentVersion" | "updatedAt">): number {
  return lesson.contentVersion ?? lesson.updatedAt;
}

/** Lo que, si cambia, invalida el progreso: qué preguntas hay y qué respuesta es la correcta. */
export function structuralKey(lesson: Pick<CustomLesson, "questions">): string {
  return JSON.stringify(lesson.questions.map((q) => isNumeric(q) ? [q.id, "numeric", q.value, q.tolerance ?? 0] : [q.id, q.options, q.answer]));
}

/** Corregir textos conserva el progreso de los alumnos; cambiar preguntas, opciones o respuestas lo reinicia. */
export function nextContentVersion(previous: CustomLesson | null, next: Pick<CustomLesson, "questions">, now: number): number {
  if (!previous || structuralKey(previous) !== structuralKey(next)) return now;
  return lessonVersion(previous);
}

/** Copia solo los campos conocidos: lo que llega del cliente nunca añade campos propios al documento. */
export function sanitizeLesson(v: CustomLesson): CustomLesson {
  const lesson: CustomLesson = {
    title: v.title, topic: v.topic, content: v.content, game: v.game, published: v.published, updatedAt: v.updatedAt,
    questions: v.questions.map((q): CustomQuestion => {
      const base = { id: q.id, prompt: q.prompt, explanation: q.explanation, ...(q.hint?.trim() ? { hint: q.hint } : {}) };
      if (isNumeric(q)) return { ...base, kind: "numeric", value: q.value.trim(), ...(q.tolerance ? { tolerance: q.tolerance } : {}) };
      const feedback = q.optionFeedback?.some((f) => f.trim()) ? { optionFeedback: q.optionFeedback } : {};
      return { ...base, kind: "choice", options: q.options.map((o) => o.trim()), answer: q.answer, ...feedback };
    }),
  };
  if (v.contentVersion !== undefined) lesson.contentVersion = v.contentVersion;
  if (v.order !== undefined) lesson.order = v.order;
  if (v.assignedTo?.length) lesson.assignedTo = [...v.assignedTo];
  if (v.availableFrom !== undefined) lesson.availableFrom = v.availableFrom;
  if (v.dueAt !== undefined) lesson.dueAt = v.dueAt;
  if (v.requires !== undefined) lesson.requires = v.requires;
  return lesson;
}

/** Pregunta tal como la recibe el alumno: sin respuesta, explicación, pista ni comentarios. */
export type PublicQuestion =
  | { id: string; kind: "choice"; prompt: string; options: string[] }
  | { id: string; kind: "numeric"; prompt: string };

/** Lo que leen los alumnos de una clase publicada. `audience` permite consultar «las clases que me tocan» con una regla. */
export interface PublicLesson {
  title: string; topic: string; content: string; game: CustomGame; order: number; version: number; updatedAt: number;
  audience: string[]; questions: PublicQuestion[];
  availableFrom?: number; dueAt?: number; requires?: string;
}
export const ALL_CHILDREN = "*";

export function publicLesson(lesson: CustomLesson): PublicLesson {
  const out: PublicLesson = {
    title: lesson.title, topic: lesson.topic, content: lesson.content, game: lesson.game,
    order: lesson.order ?? lesson.updatedAt, version: lessonVersion(lesson), updatedAt: lesson.updatedAt,
    audience: lesson.assignedTo?.length ? [...lesson.assignedTo] : [ALL_CHILDREN],
    questions: lesson.questions.map((q) => isNumeric(q) ? { id: q.id, kind: "numeric", prompt: q.prompt } : { id: q.id, kind: "choice", prompt: q.prompt, options: [...q.options] }),
  };
  if (lesson.availableFrom !== undefined) out.availableFrom = lesson.availableFrom;
  if (lesson.dueAt !== undefined) out.dueAt = lesson.dueAt;
  if (lesson.requires !== undefined) out.requires = lesson.requires;
  return out;
}

export function isPublicLesson(value: unknown): value is PublicLesson {
  const v = value as Partial<PublicLesson> | null;
  return !!v && typeof v.title === "string" && typeof v.topic === "string" && typeof v.content === "string" && CUSTOM_GAMES.includes(v.game as CustomGame)
    && Number.isSafeInteger(v.version) && Number.isSafeInteger(v.order) && Array.isArray(v.audience) && Array.isArray(v.questions)
    && v.questions.every((q) => !!q && typeof q.id === "string" && typeof q.prompt === "string" && (q.kind === "numeric" || (q.kind === "choice" && Array.isArray(q.options))));
}

export function visibleTo(lesson: Pick<PublicLesson, "audience" | "availableFrom">, childId: string, now: number): boolean {
  return (lesson.audience.includes(ALL_CHILDREN) || lesson.audience.includes(childId)) && (lesson.availableFrom ?? 0) <= now;
}

/** La clase previa no bloquea si no existe, no es para este alumno o ya se terminó en su versión actual. */
export function prerequisiteMet(required: unknown, requiredProgress: Partial<LessonProgress> | undefined, childId: string, now: number): boolean {
  if (!isPublicLesson(required) || !visibleTo(required, childId, now)) return true;
  return requiredProgress?.completed === true && requiredProgress.lessonVersion === required.version;
}

/** Progreso de un alumno en una clase (`children/{c}/customLessonProgress/{id}`), lo escribe `answerCustomLesson`. */
export interface QuestionAttempts { tries: number; firstTryCorrect: boolean; solved: boolean; wrong: (number | string)[] }
export interface LessonProgress { lessonVersion: number; answers: string[]; completed: boolean; attempts?: Record<string, QuestionAttempts>; completedAt?: unknown }
export const MAX_WRONG_KEPT = 10;
export const COMPLETION_STARS = 5;
