"use client";
import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase";
import { InlineText } from "../RichText";
import type { CustomLesson, LessonProgress } from "../../../../functions/src/customLessons/schema";
import { summarizeLessonStats, type Student } from "./lessonStats";

/** Resultados de los alumnos en una clase: quién la terminó y qué preguntas cuestan más. */
export function LessonStatsPanel({ parentId, lessonId, lesson, students }: { parentId: string; lessonId: string; lesson: CustomLesson; students: readonly Student[] }) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<Map<string, Partial<LessonProgress> | undefined> | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open || !students.length) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: f }) => Promise.all(students.map((s) => f.getDoc(f.doc(db, "parents", parentId, "children", s.id, "customLessonProgress", lessonId)))))
      .then((snaps) => { if (!cancelled) setProgress(new Map(students.map((s, i) => [s.id, snaps[i].data() as Partial<LessonProgress> | undefined]))); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [open, parentId, lessonId, students, lesson.updatedAt]);
  const stats = progress ? summarizeLessonStats(lesson, students, progress) : null;
  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50/70 p-3" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">Resultados de los alumnos</summary>
      <div className="mt-3 space-y-3 text-sm text-slate-700">
        {!students.length ? <p>Todavía no hay perfiles de alumnos.</p>
          : error ? <p role="alert" className="text-red-600">No se pudieron cargar los resultados.</p>
          : !stats ? <p role="status" className="text-slate-500">Cargando resultados…</p>
          : (
            <>
              <p className="tabular-nums">{stats.completed} de {students.length} {students.length === 1 ? "alumno la ha" : "alumnos la han"} terminado.</p>
              <ul className="flex flex-wrap gap-2">
                {stats.students.map((s) => (
                  <li key={s.id} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                    {s.name}: {s.completed ? "terminada" : s.started ? `${s.solved}/${lesson.questions.length} resueltas` : "sin empezar"}
                  </li>
                ))}
              </ul>
              <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Resultados por pregunta</caption>
                <thead><tr className="text-xs text-slate-500"><th scope="col" className="py-1 pr-2">Pregunta</th><th scope="col" className="py-1 pr-2">A la primera</th><th scope="col" className="py-1 pr-2">Intentos (media)</th><th scope="col" className="py-1">Error más repetido</th></tr></thead>
                <tbody>
                  {stats.questions.map((q, i) => (
                    <tr key={q.id} className={`border-t border-slate-200/80 ${q.firstTryRate !== null && q.firstTryRate < 50 ? "text-amber-800" : "text-slate-800"}`}>
                      <td className="py-2 pr-2">{i + 1}. <InlineText text={q.prompt} /></td>
                      <td className="py-2 pr-2 tabular-nums">{q.firstTryRate === null ? "—" : `${q.firstTryRate}% (${q.attempted})`}</td>
                      <td className="py-2 pr-2 tabular-nums">{q.averageTries ?? "—"}</td>
                      <td className="py-2">{q.topWrong ? <><InlineText text={q.topWrong.label} /> ×{q.topWrong.count}</> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <p className="text-xs text-slate-500">Solo cuenta la versión actual: cambiar preguntas o respuestas reinicia el progreso.</p>
            </>
          )}
      </div>
    </details>
  );
}
