import type { CustomLesson } from "../../../../functions/src/customLessons/schema";

export type LessonEntry = CustomLesson & { id: string };
export interface TopicGroup<T> { key: string; topic: string; lessons: T[] }

export const NO_TOPIC = "Sin tema";

/** Dos temas son el mismo si solo cambian espacios o mayúsculas. */
export function topicKey(topic: string): string {
  return topic.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

/** Usa la grafía de un tema ya existente cuando coincide; si no, el texto limpio. */
export function canonicalTopic(topic: string, existing: Iterable<string>): string {
  const key = topicKey(topic);
  for (const other of existing) if (other.trim() && topicKey(other) === key) return other.trim().replace(/\s+/g, " ");
  return topic.trim().replace(/\s+/g, " ");
}

export function lessonRank(lesson: Pick<CustomLesson, "order" | "updatedAt">): number {
  return lesson.order ?? lesson.updatedAt;
}

export function compareLessons(a: Pick<CustomLesson, "order" | "updatedAt" | "title">, b: Pick<CustomLesson, "order" | "updatedAt" | "title">): number {
  return lessonRank(a) - lessonRank(b) || a.title.localeCompare(b.title, "es");
}

/** Agrupa por tema (alfabético, «Sin tema» al final) y ordena las clases dentro de cada tema. */
export function groupLessons<T extends Pick<CustomLesson, "topic" | "order" | "updatedAt" | "title">>(lessons: readonly T[]): TopicGroup<T>[] {
  const groups = new Map<string, TopicGroup<T>>();
  for (const lesson of [...lessons].sort(compareLessons)) {
    const key = topicKey(lesson.topic ?? "");
    const group = groups.get(key) ?? { key, topic: key ? lesson.topic.trim().replace(/\s+/g, " ") : NO_TOPIC, lessons: [] };
    group.lessons.push(lesson);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1) || a.topic.localeCompare(b.topic, "es"));
}
