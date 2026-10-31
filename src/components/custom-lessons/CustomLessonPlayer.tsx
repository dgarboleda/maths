"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase, getFirebaseFunctions } from "@/lib/firebase";
import { LearningShell } from "@/components/learning/LearningShell";
import { LessonArcade } from "@/components/learning/LessonArcade";
import { validateCustomLesson, type CustomLesson } from "../../../functions/src/customLessons/schema";

export function CustomLessonPlayer({ childId, lessonId }: { childId: string; lessonId: string }) {
  const { parentId } = useAuth();
  const [lesson, setLesson] = useState<CustomLesson | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(-1);
  const [correct, setCorrect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  useEffect(() => { if (!parentId) return; let cancelled = false; getFirebase().then(({ db, firestore: f }) => Promise.all([f.getDoc(f.doc(db, "parents", parentId, "customLessons", lessonId)), f.getDoc(f.doc(db, "parents", parentId, "children", childId, "customLessonProgress", lessonId))])).then(([snap, progress]) => { const data = snap.data(); const saved = progress.data(); if (!cancelled) { const valid = validateCustomLesson(data) && data.published ? data : null; setLesson(valid); setCompleted(valid && saved?.lessonVersion === valid.updatedAt && Array.isArray(saved.answers) ? saved.answers.filter((id: unknown): id is string => typeof id === "string") : []); setLoaded(true); } }).catch(() => { if (!cancelled) setLoaded(true); }); return () => { cancelled = true; }; }, [parentId, childId, lessonId]);
  async function answer(value: number): Promise<boolean> {
    if (!parentId || !lesson || busy || correct) return false;
    setBusy(true); setFeedback("");
    try { const { functions, functionsFns } = await getFirebaseFunctions(); const result = await functionsFns.httpsCallable<{ parentId: string; childId: string; lessonId: string; questionId: string; answer: number; lessonVersion: number }, { correct: boolean; explanation: string }>(functions, "answerCustomLesson")({ parentId, childId, lessonId, questionId: lesson.questions[index].id, answer: value, lessonVersion: lesson.updatedAt }); setCorrect(result.data.correct); if (result.data.correct) setCompleted(previous => [...new Set([...previous, lesson.questions[index].id])]); setFeedback(result.data.correct ? `¡Correcto! ${result.data.explanation}` : "Inténtalo de nuevo."); return result.data.correct; } catch { setFeedback("No se pudo guardar la respuesta. Si la clase cambió, vuelve a cargar la página."); return false; } finally { setBusy(false); }
  }
  if (!loaded) return <p role="status">Cargando clase…</p>;
  if (!lesson) return <p role="alert">Esta clase no está disponible.</p>;
  const question = lesson.questions[index];
  const finished = index >= lesson.questions.length;
  const options = question && <div className="flex flex-wrap gap-2">{question.options.map((option, choiceIndex) => <button disabled={busy || correct} className="rounded-lg border border-violet-400 px-4 py-3 disabled:opacity-60" key={choiceIndex} onClick={() => void answer(choiceIndex)}>{option}</button>)}</div>;
  return <LearningShell childId={childId} title={lesson.title} eyebrow={lesson.topic}><div className="space-y-5"><Link className="text-cyan-200 underline" href={`/jugar/${childId}/aprende`}>Volver a mis clases</Link>{index < 0 ? <><p className="whitespace-pre-wrap">{lesson.content}</p><button className="rounded-lg bg-violet-700 px-4 py-3" onClick={() => { const next = lesson.questions.findIndex(q => !completed.includes(q.id)); setIndex(next < 0 ? lesson.questions.length : next); }}>Empezar preguntas</button></> : finished ? <p role="status" className="text-xl font-bold">¡Terminaste la clase!</p> : <><p>Pregunta {index + 1} de {lesson.questions.length}</p>{lesson.game === "write" ? <div className="space-y-3"><h2 className="text-xl font-bold">{question.prompt}</h2>{options}</div> : <LessonArcade key={question.id} mode={lesson.game} onTogglePause={() => {}} showPause={false} exercise={{ problem: { id: question.id, difficulty: 1, kind: "lesson-practice", prompt: question.prompt, answer: question.answer, choices: question.options.map((_, i) => i), choiceLabels: question.options, inputType: "choice" }, solved: correct, disabled: busy, paused: false, timed: false, input: options, onResponse: answer }} />}
    <p aria-live="polite">{feedback}</p>{correct && <button className="rounded-lg bg-violet-700 px-4 py-3" onClick={() => { setCorrect(false); setFeedback(""); const next = lesson.questions.findIndex((q, i) => i > index && !completed.includes(q.id)); setIndex(next < 0 ? lesson.questions.length : next); }}>Siguiente</button>}</>}</div></LearningShell>;
}
