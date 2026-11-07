import type { PublicLesson } from "../../../../functions/src/customLessons/schema";

/**
 * Máquina de estados de una clase para el alumno:
 * cargando → (no disponible | bloqueada | intro) → pregunta ⇄ respuesta → terminada.
 * Si la familia cambia las preguntas mientras se juega, se vuelve a la
 * introducción con la nueva versión (el progreso anterior ya no vale).
 */
export type Feedback =
  | { kind: "correct"; explanation: string }
  | { kind: "wrong"; comment: string; hint: string }
  | { kind: "error"; text: string };

export interface SessionState {
  status: "loading" | "missing" | "locked" | "ready";
  lesson: PublicLesson | null;
  /** Preguntas ya acertadas en la versión actual. */
  completed: string[];
  phase: "intro" | "question" | "finished";
  index: number;
  /** Orden en que se muestran las opciones de la pregunta actual (posiciones originales). */
  order: number[];
  solved: boolean;
  busy: boolean;
  feedback: Feedback | null;
  stars: number;
  notice: string;
}

export type SessionAction =
  | { type: "loaded"; lesson: PublicLesson | null; completed: string[]; locked: boolean }
  | { type: "start"; random?: () => number }
  | { type: "answering" }
  | { type: "answered"; correct: boolean; explanation: string; comment: string; hint: string; stars: number }
  | { type: "error"; text: string }
  | { type: "next"; random?: () => number };

export const initialSession: SessionState = { status: "loading", lesson: null, completed: [], phase: "intro", index: -1, order: [], solved: false, busy: false, feedback: null, stars: 0, notice: "" };

export function shuffledOrder(length: number, random: () => number = Math.random): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Primera pregunta sin acertar a partir de `from` (o el final). */
function nextOpen(lesson: PublicLesson, completed: readonly string[], from: number): number {
  const i = lesson.questions.findIndex((q, n) => n >= from && !completed.includes(q.id));
  return i < 0 ? lesson.questions.length : i;
}

function enter(state: SessionState, index: number, random?: () => number): SessionState {
  const lesson = state.lesson!;
  if (index >= lesson.questions.length) return { ...state, phase: "finished", index, order: [], solved: false, feedback: null };
  const q = lesson.questions[index];
  return { ...state, phase: "question", index, order: q.kind === "choice" ? shuffledOrder(q.options.length, random) : [], solved: false, feedback: null, busy: false };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "loaded": {
      if (!action.lesson) return { ...initialSession, status: "missing" };
      const changed = state.lesson !== null && state.lesson.version !== action.lesson.version;
      const base = { ...state, status: action.locked ? "locked" as const : "ready" as const, lesson: action.lesson, completed: action.completed };
      // Cambios de texto (misma versión): se actualiza sin interrumpir.
      if (!changed) return base;
      return { ...base, phase: "intro", index: -1, order: [], solved: false, busy: false, feedback: null, notice: "La clase se ha actualizado: vuelve a empezar." };
    }
    case "start":
      return state.lesson ? enter({ ...state, notice: "" }, nextOpen(state.lesson, state.completed, 0), action.random) : state;
    case "answering":
      return { ...state, busy: true, feedback: null };
    case "answered": {
      const q = state.lesson!.questions[state.index];
      if (!action.correct) return { ...state, busy: false, feedback: { kind: "wrong", comment: action.comment, hint: action.hint } };
      return { ...state, busy: false, solved: true, completed: [...new Set([...state.completed, q.id])], stars: state.stars + action.stars, feedback: { kind: "correct", explanation: action.explanation } };
    }
    case "error":
      return { ...state, busy: false, feedback: { kind: "error", text: action.text } };
    case "next":
      return state.lesson ? enter(state, nextOpen(state.lesson, state.completed, state.index + 1), action.random) : state;
  }
}

/** ¿Queda alguna pregunta sin acertar después de la actual? */
export const hasNextOpen = (state: SessionState) => !!state.lesson && nextOpen(state.lesson, state.completed, state.index + 1) < state.lesson.questions.length;
