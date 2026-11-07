"use client";
import { useEffect, useReducer } from "react";
import { getFirebase } from "@/lib/firebase";
import { isPublicLesson, prerequisiteMet, visibleTo, type LessonProgress, type PublicLesson } from "../../../../functions/src/customLessons/schema";
import { answerLesson } from "../api";
import { initialSession, sessionReducer } from "./sessionState";

const answersOf = (progress: Partial<LessonProgress> | undefined, version: number) =>
  progress?.lessonVersion === version && Array.isArray(progress.answers) ? progress.answers.filter((id: unknown): id is string => typeof id === "string") : [];

/**
 * Carga la versión pública de la clase (sin respuestas) y el progreso del
 * alumno, en vivo, y envía cada respuesta al servidor, que es quien corrige.
 */
export function useCustomLessonSession(parentId: string | null | undefined, childId: string, lessonId: string) {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    const offs: (() => void)[] = [];
    let lesson: PublicLesson | null | undefined;
    let progress: Partial<LessonProgress> | undefined;
    let progressLoaded = false;
    let locked = false;
    const emit = () => {
      if (cancelled || lesson === undefined || !progressLoaded) return;
      const shown = lesson && visibleTo(lesson, childId, Date.now()) ? lesson : null;
      dispatch({ type: "loaded", lesson: shown, completed: shown ? answersOf(progress, shown.version) : [], locked });
    };
    getFirebase().then(async ({ db, firestore: f }) => {
      if (cancelled) return;
      offs.push(f.onSnapshot(f.doc(db, "parents", parentId, "customLessonsPublic", lessonId), (snap) => {
        const data = snap.data();
        lesson = isPublicLesson(data) ? data : null;
        void checkPrerequisite().then(emit);
      }, () => { lesson = null; emit(); }));
      offs.push(f.onSnapshot(f.doc(db, "parents", parentId, "children", childId, "customLessonProgress", lessonId), (snap) => {
        progress = snap.data() as Partial<LessonProgress> | undefined;
        progressLoaded = true;
        emit();
      }, () => { progressLoaded = true; emit(); }));
      async function checkPrerequisite() {
        if (!lesson?.requires) { locked = false; return; }
        try {
          const [required, requiredProgress] = await Promise.all([
            f.getDoc(f.doc(db, "parents", parentId!, "customLessonsPublic", lesson.requires)),
            f.getDoc(f.doc(db, "parents", parentId!, "children", childId, "customLessonProgress", lesson.requires)),
          ]);
          locked = !prerequisiteMet(required.data(), requiredProgress.data() as Partial<LessonProgress> | undefined, childId, Date.now());
        } catch {
          // Sin permiso para la previa (asignada a otro alumno): no bloquea.
          locked = false;
        }
      }
    }).catch(() => { lesson = null; progressLoaded = true; emit(); });
    return () => { cancelled = true; offs.forEach((off) => off()); };
  }, [parentId, childId, lessonId]);

  async function answer(value: number | string): Promise<boolean> {
    const { lesson, index, busy, solved } = state;
    if (!parentId || !lesson || busy || solved || state.phase !== "question") return false;
    dispatch({ type: "answering" });
    try {
      const result = await answerLesson({ parentId, childId, lessonId, questionId: lesson.questions[index].id, answer: value, lessonVersion: lesson.version });
      dispatch({ type: "answered", correct: result.correct, explanation: result.explanation, comment: result.feedback ?? "", hint: result.hint ?? "", stars: result.stars ?? 0 });
      return result.correct;
    } catch {
      dispatch({ type: "error", text: "No se pudo guardar la respuesta. Si la clase cambió, vuelve a cargar la página." });
      return false;
    }
  }

  return { state, answer, start: () => dispatch({ type: "start" }), next: () => dispatch({ type: "next" }) };
}
