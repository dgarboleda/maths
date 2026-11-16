"use client";
import type { CustomLesson, LessonError } from "../../../../functions/src/customLessons/schema";
import type { Student } from "./lessonStats";
import { inputClass } from "./styles";

/** Día local (aaaa-mm-dd) ↔ instante: inicio del día para «desde», final del día para la entrega. */
export function toDateInput(ms: number | undefined): string {
  if (ms === undefined) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function fromDateInput(value: string, endOfDay: boolean): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d.getTime();
}

interface Props {
  draft: CustomLesson;
  students: readonly Student[];
  /** Otras clases que se pueden exigir antes de esta. */
  lessons: readonly { id: string; title: string; topic: string }[];
  errors: LessonError[];
  set: (patch: Partial<CustomLesson>) => void;
}

/** A quién va la clase, desde cuándo, para cuándo y qué hay que terminar antes. */
export function AssignmentFields({ draft, students, lessons, errors, set }: Props) {
  const assigned = draft.assignedTo ?? [];
  const everyone = assigned.length === 0;
  const fieldError = (field: LessonError["field"]) => errors.find((e) => e.question === undefined && e.field === field)?.message;
  const toggle = (id: string, on: boolean) => {
    const next = on ? [...assigned, id] : assigned.filter((x) => x !== id);
    if (next.length) set({ assignedTo: next });
  };
  const sameTopic = (l: { topic: string }) => l.topic.trim().toLocaleLowerCase("es") === draft.topic.trim().toLocaleLowerCase("es");
  const ordered = [...lessons].sort((a, b) => Number(sameTopic(b)) - Number(sameTopic(a)) || a.title.localeCompare(b.title, "es"));
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Alumnos y fechas</legend>
      {students.length > 0 && (
        <div id="lesson-assignedTo" tabIndex={-1} className="space-y-1 text-sm text-slate-700">
          <p className="font-medium text-slate-700">¿Quién la ve?</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={everyone} onChange={(e) => { if (e.target.checked) set({ assignedTo: undefined }); }} />
            Todos los alumnos
          </label>
          {students.map((s) => (
            <label key={s.id} className="flex items-center gap-2">
              <input type="checkbox" checked={!everyone && assigned.includes(s.id)} disabled={!everyone && assigned.length === 1 && assigned.includes(s.id)} onChange={(e) => toggle(s.id, e.target.checked)} />
              {s.name}
            </label>
          ))}
          {!everyone && <p className="text-xs text-slate-500">Selecciona al menos un alumno, o elige todos los alumnos.</p>}
          {fieldError("assignedTo") && <p className="text-sm font-medium text-amber-800">{fieldError("assignedTo")}</p>}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="lesson-availableFrom" className="mb-1 block text-sm font-medium text-slate-700">Visible desde (opcional)</label>
          <input id="lesson-availableFrom" type="date" className={inputClass} value={toDateInput(draft.availableFrom)} onChange={(e) => set({ availableFrom: fromDateInput(e.target.value, false) })} />
          {fieldError("availableFrom") && <p className="mt-1 text-sm font-medium text-amber-800">{fieldError("availableFrom")}</p>}
        </div>
        <div>
          <label htmlFor="lesson-dueAt" className="mb-1 block text-sm font-medium text-slate-700">Entregar antes de (opcional)</label>
          <input id="lesson-dueAt" type="date" className={inputClass} value={toDateInput(draft.dueAt)} onChange={(e) => set({ dueAt: fromDateInput(e.target.value, true) })} />
          {fieldError("dueAt") && <p className="mt-1 text-sm font-medium text-amber-800">{fieldError("dueAt")}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="lesson-requires" className="mb-1 block text-sm font-medium text-slate-700">Hay que terminar antes</label>
        <select id="lesson-requires" className={inputClass} value={draft.requires ?? ""} onChange={(e) => set({ requires: e.target.value || undefined })}>
          <option value="">Ninguna clase (se puede empezar ya)</option>
          {ordered.map((l) => <option key={l.id} value={l.id}>{l.title || "Sin título"}{l.topic ? ` · ${l.topic}` : ""}</option>)}
        </select>
        <p className="mt-1 text-xs text-slate-500">Si la clase elegida deja de estar publicada, esta se desbloquea.</p>
      </div>
    </fieldset>
  );
}
