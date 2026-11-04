import { describeCustomLessonErrors, nextContentVersion, structuralKey, type CustomLesson, type CustomQuestion, type LessonError } from "../../../../functions/src/customLessons/schema";
import { canonicalTopic, lessonRank } from "./groupLessons";

export const blankLesson = (topic = ""): CustomLesson => ({ title: "", topic, content: "", game: "write", questions: [], published: false, updatedAt: Date.now() });
export const blankQuestion = (): CustomQuestion => ({ id: newQuestionId(), prompt: "", answer: -1, options: ["", ""], explanation: "" });
export const newQuestionId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

/** Qué hace cada botón con el estado publicado de la clase. */
export type SaveMode = "draft" | "keep" | "publish" | "unpublish";

export type SavePlan =
  | { ok: true; lesson: CustomLesson; resetsProgress: boolean }
  | { ok: false; errors: LessonError[] };

/**
 * Prepara el documento que se guardará. Guardar una clase publicada la
 * mantiene publicada; solo «Retirar» la pasa a borrador.
 */
export function planSave(draft: CustomLesson, previous: CustomLesson | null, mode: SaveMode, topics: Iterable<string>, now: number): SavePlan {
  const published = mode === "publish" ? true : mode === "keep" ? (previous?.published ?? false) : false;
  const lesson: CustomLesson = {
    ...draft,
    questions: draft.questions.map((q) => ({ ...q, options: q.options.map((o) => o.trim()) })),
    topic: canonicalTopic(draft.topic, topics),
    published,
    updatedAt: now,
    contentVersion: 0,
    // El orden guardado manda: se puede haber cambiado con ↑/↓ mientras se editaba.
    order: previous ? lessonRank(previous) : (draft.order ?? now),
  };
  lesson.contentVersion = nextContentVersion(previous, lesson, now);
  if (published) {
    const errors = describeCustomLessonErrors(lesson);
    if (errors.length) return { ok: false, errors };
  } else if (!lesson.title.trim()) {
    return { ok: false, errors: [{ field: "title", message: "Escribe al menos el título para guardar el borrador." }] };
  }
  const resetsProgress = !!previous?.published && published && structuralKey(previous) !== structuralKey(lesson);
  return { ok: true, lesson, resetsProgress };
}

/** Las opciones se mueven con su marca de correcta. */
export function moveOption(options: string[], answer: number, from: number, to: number): { options: string[]; answer: number } {
  if (to < 0 || to >= options.length || from === to) return { options, answer };
  const next = [...options];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  const moved = answer === from ? to : answer > from && answer <= to ? answer - 1 : answer < from && answer >= to ? answer + 1 : answer;
  return { options: next, answer: moved };
}

export function removeOption(options: string[], answer: number, index: number): { options: string[]; answer: number } {
  return { options: options.filter((_, i) => i !== index), answer: answer === index ? -1 : answer > index ? answer - 1 : answer };
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
  return error.question === undefined ? `lesson-${error.field}` : `question-${error.question}-${error.field === "id" ? "prompt" : error.field}`;
}
