import { isNumeric, lessonVersion, type CustomLesson, type LessonProgress } from "../../../../functions/src/customLessons/schema";

export interface Student { id: string; name: string }
export interface QuestionStats {
  id: string; prompt: string;
  /** Alumnos que la intentaron en la versión actual. */
  attempted: number;
  solved: number;
  /** Porcentaje que acertó al primer intento, sobre los que la intentaron. */
  firstTryRate: number | null;
  averageTries: number | null;
  /** Respuesta incorrecta más repetida: la pregunta a revisar o el error a trabajar. */
  topWrong: { label: string; count: number } | null;
}
export interface StudentStats { id: string; name: string; started: boolean; completed: boolean; solved: number }
export interface LessonStats { questions: QuestionStats[]; students: StudentStats[]; completed: number }

/** Solo cuenta el progreso de la versión actual: el de una versión anterior respondía otras preguntas. */
export function summarizeLessonStats(lesson: CustomLesson, students: readonly Student[], progress: ReadonlyMap<string, Partial<LessonProgress> | undefined>): LessonStats {
  const version = lessonVersion(lesson);
  const current = new Map(students.map((s) => {
    const p = progress.get(s.id);
    return [s.id, p && p.lessonVersion === version ? p : undefined] as const;
  }));
  const questions = lesson.questions.map((q): QuestionStats => {
    const rows = [...current.values()].map((p) => p?.attempts?.[q.id]).filter((a) => !!a && a.tries > 0);
    const wrong = new Map<string, number>();
    for (const a of rows) for (const w of a!.wrong ?? []) {
      const label = isNumeric(q) ? String(w) : typeof w === "number" ? (q.options[w] ?? `Opción ${w + 1}`) : String(w);
      wrong.set(label, (wrong.get(label) ?? 0) + 1);
    }
    const top = [...wrong.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      id: q.id, prompt: q.prompt, attempted: rows.length,
      solved: rows.filter((a) => a!.solved).length,
      firstTryRate: rows.length ? Math.round((rows.filter((a) => a!.firstTryCorrect).length / rows.length) * 100) : null,
      averageTries: rows.length ? Math.round((rows.reduce((s, a) => s + a!.tries, 0) / rows.length) * 10) / 10 : null,
      topWrong: top ? { label: top[0], count: top[1] } : null,
    };
  });
  const studentStats = students.map((s): StudentStats => {
    const p = current.get(s.id);
    return { id: s.id, name: s.name, started: !!p, completed: p?.completed === true, solved: Array.isArray(p?.answers) ? p.answers.length : 0 };
  });
  return { questions, students: studentStats, completed: studentStats.filter((s) => s.completed).length };
}
