import type { ReactNode } from "react";
import type { Question } from "@/lib/learning/domain";
import { shuffle, type Problem } from "@/lib/problem";

export const PRACTICE_GAMES = ["frogger", "cohete", "snake", "runner", "numberpac", "invaders", "breakout", "topos", "cajas"] as const;
export type PracticeGame = (typeof PRACTICE_GAMES)[number];
export type PracticeMode = "write" | PracticeGame;
/** Marcador de la sesión en memoria, separado de la evidencia de aprendizaje. */
export interface ArcadeSession {
  begin(game: PracticeGame): number;
  update(game: PracticeGame, score: number): void;
}
export function createArcadeSession(): ArcadeSession {
  let current: PracticeGame | null = null;
  let score = 0;
  return {
    begin(game) {
      if (current !== game) { current = game; score = 0; }
      return score;
    },
    update(game, value) { if (current === game) score = value; },
  };
}

/** La aplicación sortea un juego para la práctica de una clase. `random` se inyecta para las pruebas unitarias; las
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
  /** Aciertos anteriores de práctica numérica en esta clase. */
  round?: number;
  /** Cantidad de actividades numéricas de la práctica. */
  rounds?: number;
  /** Intentos incorrectos registrados de la pregunta actual. */
  failedAttempts?: number;
  session?: ArcadeSession;
  input: ReactNode;
  onResponse: (value: number) => Promise<boolean>;
}

const EPS = 1e-9;

/** Fracción n/d equivalente (d ≤ 100), o null si no existe. */
function asFraction(value: number): [number, number] | null {
  for (let d = 1; d <= 100; d++) {
    const n = Math.round(value * d);
    if (Math.abs(n / d - value) < EPS) return [n, d];
  }
  return null;
}

/** Cifras decimales (0–3) con que se escribe exactamente, o null. */
function decimals(value: number): number | null {
  for (let k = 0; k <= 3; k++) if (Math.abs(Math.round(value * 10 ** k) / 10 ** k - value) < EPS) return k;
  return null;
}

const minus = (text: string) => text.replace(/^-/, "−");

/**
 * Cinco valores para el juego: la respuesta, los errores razonados del
 * contenido y, si faltan, vecinos plausibles. Solo valores que se leen bien
 * (enteros, hasta 3 decimales o fracciones de denominador ≤ 100) y dentro del
 * dominio del problema: una probabilidad entre 0 y 1; sin negativos
 * inventados si el enunciado no los tiene.
 */
export function lessonProblem(question: Question): Problem | null {
  if (question.format === "choice" || typeof question.answer !== "number")
    return null;
  const answer = question.answer;
  const answerDecimals = decimals(answer);
  // Se respeta la forma que pide el enunciado: «Escribe como decimal la
  // fracción 2/5» se responde con 0,4, no copiando 2/5.
  const asksDecimal =
    /\b(?:como|en|forma)\s+(?:un\s+|número\s+)*decimal\b/i.test(question.prompt) &&
    !/fracci[oó]n\s+o\s+decimal|decimal\s+o\s+fracci[oó]n/i.test(question.prompt);
  const fraction =
    !Number.isInteger(answer) &&
    asFraction(answer) !== null &&
    (answerDecimals === null || (!asksDecimal && /fracci[oó]n/i.test(question.prompt)));
  const probability = answer >= 0 && answer <= 1 && /probabilidad|\bP\((?![\s−\-\d])/i.test(question.prompt);
  const negativesAllowed = answer < 0 || /[−-]\s?\d/.test(question.prompt);
  const readable = (v: number) => Number.isFinite(v) && (fraction ? asFraction(v) !== null : decimals(v) !== null);
  const values: number[] = [answer];
  const add = (v: number) => {
    if (values.length < 5 && readable(v) && !values.some((o) => Math.abs(o - v) < 1e-8)) values.push(v);
  };
  // Primero se aprovechan los errores razonados del contenido de la clase
  // (una probabilidad imposible no sirve de alternativa en el juego).
  for (const error of question.errors ?? [])
    if (typeof error.value === "number" && (!probability || (error.value >= 0 && error.value <= 1))) add(error.value);
  const den = fraction ? asFraction(answer)![1] : 1;
  // Vecinos a una distancia proporcional al tamaño: 7234,56 no compite con 7234,61.
  const scale = Math.abs(answer) >= 100 ? 10 ** (Math.floor(Math.log10(Math.abs(answer))) - 2) : 0;
  const step = fraction ? 1 / den : Math.max(scale, answerDecimals === 0 ? 1 : answerDecimals === 1 ? 0.1 : 0.05);
  const plausible = (v: number) =>
    (negativesAllowed || v >= 0) && (!probability || (v >= 0 && v <= 1));
  // Si el dominio es estrecho (una probabilidad cerca de 0 o 1), se prueba
  // con pasos más finos antes de aceptar valores fuera de él.
  for (const [factor, strict] of [[1, true], [1 / 2, true], [1 / 4, true], [1, false]] as const)
    for (let i = 1; values.length < 5 && i <= 60; i++)
      for (const v of [answer + i * step * factor, answer - i * step * factor]) {
        const rounded = fraction ? v : Number(v.toFixed(6));
        if (!strict || plausible(rounded)) add(rounded);
      }
  const choices = shuffle(values);
  return {
    id: question.id,
    kind: "lesson-practice",
    difficulty: 1,
    prompt: question.prompt,
    answer,
    inputType: "decimal",
    ...(question.unit ? { unit: question.unit } : {}),
    choices,
    choiceLabels: choices.map((value) => {
      if (fraction && !Number.isInteger(value)) {
        const [n, d] = asFraction(value)!;
        return minus(`${n}/${d}`);
      }
      return minus(String(Number(value.toFixed(3))).replace(".", ","));
    }),
  };
}
