"use client";

import { useEffect, useRef } from "react";
import type { LessonExercise } from "./lessonExercise";

/** Las siguientes preguntas continúan el juego tras pulsar «Siguiente actividad».
 * La acción no empieza hasta que haya terminado el guardado y no esté en pausa. */
export function useContinueArcade(exercise: LessonExercise | undefined, start: () => void) {
  const latest = useRef(start);
  const started = useRef(false);
  useEffect(() => { latest.current = start; });
  useEffect(() => {
    if (!exercise || !exercise.round || exercise.disabled || exercise.paused || exercise.solved || started.current) return;
    started.current = true;
    latest.current();
  }, [exercise?.round, exercise?.disabled, exercise?.paused, exercise?.solved, exercise]);
}
