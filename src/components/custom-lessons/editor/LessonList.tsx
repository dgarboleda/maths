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
      <button type="button" className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => onNew("")}>Nueva clase</button>
      {groups.map((group) => (
        <section key={group.key || "sin-tema"} aria-label={`Tema ${group.topic}`} className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">{group.topic}</h2>
            {group.key && <button type="button" className={smallButton} onClick={() => onNew(group.topic)}>+ Clase en {group.topic}</button>}
          </div>
          <ol className="space-y-1.5">
            {group.lessons.map((lesson, i) => {
              const name = lesson.title || "Sin título";
              return (
                <li key={lesson.id} className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-current={lesson.id === selectedId ? "true" : undefined}
                    className={`flex-1 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${lesson.id === selectedId ? "border-indigo-500 bg-indigo-50 font-medium text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    onClick={() => onSelect(lesson)}
                  >
                    {name} <span className={lesson.published ? "font-medium text-emerald-700" : "text-slate-500"}>· {lesson.published ? "Publicada" : "Borrador"}</span>
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
