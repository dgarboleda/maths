"use client";
import type { LessonEntry, TopicGroup } from "./groupLessons";
import { smallButton } from "./styles";

interface Props {
  groups: TopicGroup<LessonEntry>[];
  selectedId: string | null;
  busy: boolean;
  onSelect: (lesson: LessonEntry) => void;
  onNew: (topic: string) => void;
  onMove: (group: TopicGroup<LessonEntry>, from: number, to: number) => void;
}

/** Clases agrupadas por tema, con su orden y su estado. */
export function LessonList({ groups, selectedId, busy, onSelect, onNew, onMove }: Props) {
  return (
    <nav aria-label="Tus clases" className="space-y-4">
      <button type="button" className="rounded-lg bg-violet-700 px-3 py-2" onClick={() => onNew("")}>Nueva clase</button>
      {groups.map((group) => (
        <section key={group.key || "sin-tema"} aria-label={`Tema ${group.topic}`} className="space-y-2 rounded-xl border border-slate-700 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{group.topic}</h2>
            {group.key && <button type="button" className={smallButton} onClick={() => onNew(group.topic)}>+ Clase en {group.topic}</button>}
          </div>
          <ol className="space-y-1">
            {group.lessons.map((lesson, i) => {
              const name = lesson.title || "Sin título";
              return (
                <li key={lesson.id} className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-current={lesson.id === selectedId ? "true" : undefined}
                    className={`flex-1 rounded-lg border px-3 py-2 text-left ${lesson.id === selectedId ? "border-violet-400 bg-slate-800" : "border-slate-500"}`}
                    onClick={() => onSelect(lesson)}
                  >
                    {name} <span className={lesson.published ? "text-emerald-300" : "text-slate-400"}>· {lesson.published ? "Publicada" : "Borrador"}</span>
                  </button>
                  <button type="button" className={smallButton} aria-label={`Subir ${name}`} disabled={busy || i === 0} onClick={() => onMove(group, i, i - 1)}>↑</button>
                  <button type="button" className={smallButton} aria-label={`Bajar ${name}`} disabled={busy || i === group.lessons.length - 1} onClick={() => onMove(group, i, i + 1)}>↓</button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </nav>
  );
}
