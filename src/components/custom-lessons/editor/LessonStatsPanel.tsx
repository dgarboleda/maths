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
    <details className="rounded-lg border border-slate-600 p-3" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer">Resultados de los alumnos</summary>
      <div className="mt-3 space-y-3 text-sm">
        {!students.length ? <p>Todavía no hay perfiles de alumnos.</p>
          : error ? <p role="alert">No se pudieron cargar los resultados.</p>
          : !stats ? <p role="status">Cargando resultados…</p>
          : (
            <>
              <p>{stats.completed} de {students.length} {students.length === 1 ? "alumno la ha" : "alumnos la han"} terminado.</p>
              <ul className="flex flex-wrap gap-2">
                {stats.students.map((s) => (
                  <li key={s.id} className="rounded border border-slate-500 px-2 py-1">
                    {s.name}: {s.completed ? "terminada" : s.started ? `${s.solved}/${lesson.questions.length} resueltas` : "sin empezar"}
                  </li>
                ))}
              </ul>
              <table className="w-full text-left">
                <caption className="sr-only">Resultados por pregunta</caption>
                <thead><tr><th scope="col">Pregunta</th><th scope="col">A la primera</th><th scope="col">Intentos (media)</th><th scope="col">Error más repetido</th></tr></thead>
                <tbody>
                  {stats.questions.map((q, i) => (
                    <tr key={q.id} className={q.firstTryRate !== null && q.firstTryRate < 50 ? "text-amber-200" : undefined}>
                      <td>{i + 1}. <InlineText text={q.prompt} /></td>
                      <td>{q.firstTryRate === null ? "—" : `${q.firstTryRate}% (${q.attempted})`}</td>
                      <td>{q.averageTries ?? "—"}</td>
                      <td>{q.topWrong ? <><InlineText text={q.topWrong.label} /> ×{q.topWrong.count}</> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-slate-400">Solo cuenta la versión actual: cambiar preguntas o respuestas reinicia el progreso.</p>
            </>
          )}
      </div>
    </details>
  );
}
