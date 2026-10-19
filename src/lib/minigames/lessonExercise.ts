import type { ReactNode } from "react";
import type { Question } from "@/lib/learning/domain";
import { shuffle, type Problem } from "@/lib/problem";

export const PRACTICE_GAMES = ["frogger", "cohete", "snake", "runner", "numberpac", "invaders", "breakout"] as const;
export type PracticeGame = (typeof PRACTICE_GAMES)[number];
export type PracticeMode = "write" | PracticeGame;

/** La aplicación sortea el juego de cada ejercicio de práctica; el estudiante
 * no tiene que decidirlo. `random` se inyecta para las pruebas unitarias; las
 * e2e fijan el juego con `window.__MATHS_TEST_PRACTICE_GAME__`. */
export function pickPracticeGame(random: () => number = Math.random): PracticeGame {
  const forced = (globalThis as { __MATHS_TEST_PRACTICE_GAME__?: unknown }).__MATHS_TEST_PRACTICE_GAME__;
  if (PRACTICE_GAMES.includes(forced as PracticeGame)) return forced as PracticeGame;
  return PRACTICE_GAMES[Math.min(PRACTICE_GAMES.length - 1, Math.floor(random() * PRACTICE_GAMES.length))];
}

/** Una pregunta de la clase; el servidor decide el resultado de la respuesta.
 * Los juegos no conceden dominio ni estrellas en esta modalidad. */
export interface LessonExercise {
  problem: Problem;
  solved: boolean;
  disabled: boolean;
  paused: boolean;
  timed: boolean;
  input: ReactNode;
  onResponse: (value: number) => Promise<boolean>;
}

function choiceLabel(value: number, fraction: boolean): string {
  if (fraction && !Number.isInteger(value)) {
    for (let denominator = 2; denominator <= 100; denominator++) {
      const numerator = Math.round(value * denominator);
      if (Math.abs(numerator / denominator - value) < 1e-8)
        return `${numerator}/${denominator}`;
    }
  }
  return String(value).replace(".", ",");
}

export function lessonProblem(question: Question): Problem | null {
  if (question.format === "choice" || typeof question.answer !== "number")
    return null;
  const answer = question.answer;
  const values = new Set<number>([answer]);
  // Primero se aprovechan los errores razonados del contenido de la clase.
  for (const error of question.errors ?? [])
    if (typeof error.value === "number" && Number.isFinite(error.value))
      values.add(error.value);
  const step = Number.isInteger(answer) ? 1 : 0.25;
  for (let i = 1; values.size < 5; i++) {
    values.add(Number((answer + i * step).toFixed(10)));
    if (values.size < 5)
      values.add(Number((answer - i * step).toFixed(10)));
  }
  const choices = shuffle([...values].slice(0, 5));
  return {
    id: question.id,
    kind: "lesson-practice",
    difficulty: 1,
    prompt: question.prompt,
    answer,
    inputType: "decimal",
    choices,
    choiceLabels: choices.map((value) => choiceLabel(value, /fracci[oó]n/i.test(question.prompt))),
  };
}
