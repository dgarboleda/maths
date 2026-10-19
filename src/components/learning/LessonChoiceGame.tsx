"use client";

import { useId, useRef, useState } from "react";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";

/**
 * Versión de clase de los minijuegos de reflejos (serpiente, carrera,
 * laberinto, invasores y bloques). Conserva el tema de cada juego, pero
 * funciona por turnos: sin reloj, persecución, choques ni física, para que un
 * error refleje las matemáticas y no los reflejos (mismo criterio que el modo
 * clase de `FroggerGeneric`). El valor elegido se envía a la clase; el
 * resultado lo decide el servidor y aquí solo se celebra lo ya guardado.
 */
export interface LessonGameTheme {
  title: string;
  intro: string;
  start: string;
  /** Prefijo del nombre accesible de cada opción: «Disparar a 1/3». */
  action: string;
  group: string;
  avatar: string;
  target: string;
  success: string;
  border: string;
  button: string;
}

export const LESSON_GAME_THEMES = {
  snake: {
    title: "🐍 Serpiente numérica",
    intro: "Elige la fruta con el resultado y la serpiente irá a comerla. En esta clase no hay reloj ni choques.",
    start: "¡A comer!",
    action: "Comer la fruta",
    group: "Frutas: elige tu respuesta",
    avatar: "🐍",
    target: "🍎",
    success: "¡Lograste la meta!",
    border: "border-emerald-500",
    button: "border-emerald-300 bg-emerald-900 text-emerald-100",
  },
  runner: {
    title: "🏃 Autopista de resultados",
    intro: "Elige el carril con el resultado. En esta clase la carrera espera tu decisión.",
    start: "¡A correr!",
    action: "Ir al carril",
    group: "Carriles: elige tu respuesta",
    avatar: "🏃",
    target: "🚩",
    success: "¡Llegaste a la meta!",
    border: "border-amber-500",
    button: "border-amber-300 bg-amber-900 text-amber-100",
  },
  numberpac: {
    title: "🟡 Laberinto de números",
    intro: "Elige el punto con el resultado. En esta clase el fantasma no te persigue.",
    start: "¡Entrar al laberinto!",
    action: "Comer el número",
    group: "Puntos del laberinto: elige tu respuesta",
    avatar: "🟡",
    target: "⚪",
    success: "¡Laberinto resuelto!",
    border: "border-yellow-500",
    button: "border-yellow-300 bg-yellow-900 text-yellow-100",
  },
  invaders: {
    title: "👾 Invasión numérica",
    intro: "Apunta a la nave con el resultado. En esta clase los invasores no avanzan.",
    start: "¡Defender!",
    action: "Disparar a",
    group: "Naves: elige tu respuesta",
    avatar: "🚀",
    target: "👾",
    success: "¡Invasión repelida!",
    border: "border-red-500",
    button: "border-red-300 bg-red-900 text-red-100",
  },
  breakout: {
    title: "🧱 Bloques numéricos",
    intro: "Elige el bloque con el resultado. En esta clase la pelota espera tu tiro.",
    start: "¡Sacar!",
    action: "Romper el bloque",
    group: "Bloques: elige tu respuesta",
    avatar: "🏓",
    target: "🧱",
    success: "¡Muro derribado!",
    border: "border-orange-500",
    button: "border-orange-300 bg-orange-900 text-orange-100",
  },
} satisfies Record<string, LessonGameTheme>;

export type LessonChoiceGameId = keyof typeof LESSON_GAME_THEMES;

export function LessonChoiceGame({ game, exercise }: { game: LessonChoiceGameId; exercise: LessonExercise }) {
  const theme: LessonGameTheme = LESSON_GAME_THEMES[game];
  const promptId = useId();
  const [started, setStarted] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const busyRef = useRef(false);
  const { problem } = exercise;
  const choices = problem.choices ?? [];
  const labels = problem.choiceLabels ?? choices.map(String);
  const disabled = exercise.disabled || exercise.paused;

  async function choose(index: number) {
    if (busyRef.current || disabled) return;
    busyRef.current = true;
    setChosen(index);
    try {
      // Se envía el valor elegido: ni el resultado ni premios se deciden aquí.
      await exercise.onResponse(choices[index]);
    } finally {
      busyRef.current = false;
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border-4 ${theme.border} bg-slate-950 p-6 text-center text-white shadow-2xl`}>
      <h2 className="mb-2 text-3xl font-extrabold">{theme.title}</h2>
      <p className="mb-6 text-sm text-slate-200">{theme.intro}</p>

      {exercise.solved ? (
        <div role="status" className="space-y-4 py-6">
          <div aria-hidden="true" className="text-6xl">{theme.avatar}🏆</div>
          <h3 className="text-3xl font-bold">{theme.success}</h3>
        </div>
      ) : !started ? (
        <div className="space-y-6 py-8">
          <div aria-hidden="true" className="text-6xl">{theme.avatar}</div>
          <button
            type="button"
            onClick={() => setStarted(true)}
            disabled={disabled}
            className="rounded-2xl border-2 border-white bg-slate-100 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg disabled:opacity-50"
          >
            {theme.start}
          </button>
          <p className="text-xs text-slate-300">Selecciona tu respuesta con los botones, usando el teclado o la pantalla táctil.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-slate-600 bg-slate-900 p-3">
            {problem.flavor && <p className="mb-1 text-xs text-slate-300">{problem.flavor}</p>}
            <p id={promptId} className="text-xl font-bold">{problem.prompt}</p>
          </div>
          <div aria-hidden="true" className="flex items-end justify-center gap-3 rounded-xl bg-slate-900 px-2 py-3 text-3xl">
            {choices.map((value, index) => (
              <span key={value} className="flex w-12 flex-col items-center">
                <span className={`transition-opacity duration-300 motion-reduce:transition-none ${chosen === index ? "opacity-100" : "opacity-0"}`}>
                  {theme.avatar}
                </span>
                <span>{theme.target}</span>
              </span>
            ))}
          </div>
          <div role="group" aria-label={theme.group} aria-describedby={promptId} className="flex flex-wrap justify-center gap-3">
            {choices.map((value, index) => (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => void choose(index)}
                aria-label={`${theme.action} ${labels[index]}`}
                className={`min-h-14 min-w-14 rounded-2xl border-2 px-3 py-4 font-bold focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50 ${theme.button}`}
              >
                <span aria-hidden="true">{theme.target} </span>
                {labels[index]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
