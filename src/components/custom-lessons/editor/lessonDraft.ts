import { TRUE_FALSE, describeCustomLessonErrors, isNumeric, nextContentVersion, structuralKey, type ChoiceQuestion, type CustomLesson, type CustomQuestion, type LessonError, type NumericQuestion, type SaveMode } from "../../../../functions/src/customLessons/schema";
import { canonicalTopic, lessonRank } from "./groupLessons";

export type { SaveMode };

export const blankLesson = (topic = ""): CustomLesson => ({ title: "", topic, content: "", game: "write", questions: [], published: false, updatedAt: Date.now() });
export const newQuestionId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
export const blankQuestion = (): ChoiceQuestion => ({ id: newQuestionId(), kind: "choice", prompt: "", answer: -1, options: ["", ""], explanation: "" });
export const blankNumeric = (): NumericQuestion => ({ id: newQuestionId(), kind: "numeric", prompt: "", value: "", explanation: "" });
export const blankTrueFalse = (): ChoiceQuestion => ({ ...blankQuestion(), options: [...TRUE_FALSE] });

/** Cambia el tipo conservando enunciado, explicación y pista. */
export function convertQuestion(q: CustomQuestion, kind: "choice" | "numeric"): CustomQuestion {
  const base = { id: q.id, prompt: q.prompt, explanation: q.explanation, ...(q.hint !== undefined ? { hint: q.hint } : {}) };
  if (kind === "numeric") return { ...base, kind, value: isNumeric(q) ? q.value : (q.options[q.answer] ?? "") };
  if (!isNumeric(q)) return q;
  return { ...base, kind, options: q.value ? [q.value, ""] : ["", ""], answer: q.value ? 0 : -1 };
}

export type SavePlan =
  | { ok: true; lesson: CustomLesson; resetsProgress: boolean }
  | { ok: false; errors: LessonError[] };

/**
 * Prepara (y valida antes de llamar al servidor) el documento que se guardará.
 * Guardar una clase publicada la mantiene publicada; solo «Retirar» la pasa a
 * borrador. El servidor repite la validación y fija hora y versión.
 */
export function planSave(draft: CustomLesson, previous: CustomLesson | null, mode: SaveMode, topics: Iterable<string>, now: number): SavePlan {
  const published = mode === "publish" ? true : mode === "keep" ? (previous?.published ?? false) : false;
  const lesson: CustomLesson = {
    ...draft,
    questions: draft.questions.map((q) => isNumeric(q) ? { ...q, value: q.value.trim() } : { ...q, options: q.options.map((o) => o.trim()) }),
    topic: canonicalTopic(draft.topic, topics),
    published,
    updatedAt: now,
    contentVersion: 0,
    // El orden guardado manda: se puede haber cambiado con ↑/↓ mientras se editaba.
    order: previous ? lessonRank(previous) : (draft.order ?? now),
  };
  lesson.contentVersion = nextContentVersion(previous, lesson, now);
  const errors = describeCustomLessonErrors(lesson, { draft: !published });
  if (errors.length) return { ok: false, errors };
  const resetsProgress = !!previous?.published && published && structuralKey(previous) !== structuralKey(lesson);
  return { ok: true, lesson, resetsProgress };
}

/** Las opciones (y su comentario) se mueven con su marca de correcta. */
export function moveOption(q: Pick<ChoiceQuestion, "options" | "answer" | "optionFeedback">, from: number, to: number): Pick<ChoiceQuestion, "options" | "answer" | "optionFeedback"> {
  const { options, answer } = q;
  if (to < 0 || to >= options.length || from === to) return q;
  const moved = answer === from ? to : answer > from && answer <= to ? answer - 1 : answer < from && answer >= to ? answer + 1 : answer;
  return { options: moveItem(options, from, to), answer: moved, ...(q.optionFeedback ? { optionFeedback: moveItem(q.optionFeedback, from, to) } : {}) };
}

export function removeOption(q: Pick<ChoiceQuestion, "options" | "answer" | "optionFeedback">, index: number): Pick<ChoiceQuestion, "options" | "answer" | "optionFeedback"> {
  const { options, answer } = q;
  return {
    options: options.filter((_, i) => i !== index),
    answer: answer === index ? -1 : answer > index ? answer - 1 : answer,
    ...(q.optionFeedback ? { optionFeedback: q.optionFeedback.filter((_, i) => i !== index) } : {}),
  };
}

export function addOption(q: Pick<ChoiceQuestion, "options" | "answer" | "optionFeedback">, value = ""): Pick<ChoiceQuestion, "options" | "answer" | "optionFeedback"> {
  return { options: [...q.options, value], answer: q.answer, ...(q.optionFeedback ? { optionFeedback: [...q.optionFeedback, ""] } : {}) };
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Id del campo que recibe el foco cuando tiene un error. */
export function fieldId(error: Pick<LessonError, "question" | "field">): string {
  if (error.question === undefined) return `lesson-${error.field}`;
  const field = error.field === "id" ? "prompt" : error.field;
  return `question-${error.question}-${field}`;
}
