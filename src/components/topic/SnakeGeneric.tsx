"use client";

import { useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { choiceSet, shuffle, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import { TouchDPad } from "@/components/level/runtime/TouchDPad";

const GRID_SIZE = 8;
// Más bajo que el GOAL=8 del Cohete (30s contrarreloj): cada acierto acá
// exige navegar la grilla, no solo tipear — una partida más corta se siente
// mejor con este ritmo más pausado.
const GOAL = 5;
const WAVE_SIZE = 3; // cada 3 aciertos, sube una oleada
const TICK_BASE_MS = 450;
const TICK_STEP_MS = -30;
const TICK_FLOOR_MS = 180;
const CANDIDATES_BASE = 5;
const CANDIDATES_STEP = 1;
const CANDIDATES_MAX = 7;

type Phase = "start" | "playing" | "over";
interface Cell {
  x: number;
  y: number;
}
interface Candidate extends Cell {
  value: number;
}

const INITIAL_SNAKE: Cell[] = [
  { x: 3, y: 4 },
  { x: 2, y: 4 },
  { x: 1, y: 4 },
];
const INITIAL_DIR: Cell = { x: 1, y: 0 };

function cellKey(c: Cell): string {
  return `${c.x},${c.y}`;
}

/** Celdas libres de la grilla (ni ocupadas por la serpiente), barajadas. */
function pickFreeCells(occupied: Cell[], count: number): Cell[] {
  const taken = new Set(occupied.map(cellKey));
  const free: Cell[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return shuffle(free).slice(0, count);
}

/**
 * Math Snake — Fase 36 (docs/plan-minijuegos-retro.md). Mismo contrato que
 * `CoheteGeneric`: quien monta esto (`LevelSnakeOverlay`) decide qué pasa
 * con cada respuesta (`onAnswer`) y con el resultado final (`onWin`,
 * `onGameOver`) — este componente no sabe nada de Firestore.
 *
 * La serpiente come una de varias celdas numeradas repartidas en la grilla;
 * comer la que resuelve `problem` la hace crecer y arma una pregunta nueva.
 * Comer un número incorrecto también arma una pregunta nueva (registra el
 * fallo vía `onAnswer(false)`) pero NO termina la partida — a diferencia del
 * género clásico, chocar contra el borde o el propio cuerpo es el único fin
 * de partida sin resolver, igual criterio que el Cohete agotando el tiempo.
 */
export function SnakeGeneric({
  moduleId,
  soundOn,
  onAnswer,
  onWin,
  bestScore,
  onGameOver,
}: {
  moduleId: string;
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
  onWin?: () => void;
  /** `undefined`/`null` = sin marca todavía (nunca se trata como 0). */
  bestScore?: number | null;
  /** Se llama al chocar o al ganar, con las respuestas acertadas de la partida. */
  onGameOver?: (correctCount: number) => void;
}) {
  const mod = getModule(moduleId)!;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [snake, setSnake] = useState<Cell[]>(INITIAL_SNAKE);
  const [problem, setProblem] = useState<Problem>(() => mod.generateProblem());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);

  const dirRef = useRef<Cell>(INITIAL_DIR);
  const accRef = useRef(0);
  const busyRef = useRef(false); // true mientras se espera onAnswer — evita comer dos veces a la vez

  const wave = waveIndex(correctCount, WAVE_SIZE);
  const tickMs = scaleWithWave(TICK_BASE_MS, TICK_STEP_MS, wave, TICK_FLOOR_MS);
  const candidateCount = Math.round(scaleWithWave(CANDIDATES_BASE, CANDIDATES_STEP, wave, CANDIDATES_MAX));

  function spawnRound(currentSnake: Cell[]) {
    const nextProblem = mod.generateProblem();
    const spread = Math.max(8, candidateCount * 2);
    const values = choiceSet(nextProblem.answer, spread, candidateCount);
    const cells = pickFreeCells(currentSnake, values.length);
    setProblem(nextProblem);
    setCandidates(cells.map((cell, i) => ({ ...cell, value: values[i] })));
  }

  function endGame(didWin: boolean, finalCount: number) {
    setWin(didWin);
    setPhase("over");
    playSound(didWin ? "fanfare" : "fail", soundOn);
    onGameOver?.(finalCount);
    if (didWin) {
      triggerConfetti("medium");
      onWin?.();
    }
  }

  function start() {
    playSound("click", soundOn);
    dirRef.current = INITIAL_DIR;
    accRef.current = 0;
    busyRef.current = false;
    setSnake(INITIAL_SNAKE);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    setPhase("playing");
    spawnRound(INITIAL_SNAKE);
  }

  async function resolveEaten(eaten: Candidate, newSnake: Cell[]) {
    busyRef.current = true;
    setCandidates([]); // nada más para comer hasta que se resuelva esta ronda
    const correct = eaten.value === problem.answer;
    playSound(correct ? "correct" : "wrong", soundOn);
    const stars = await onAnswer(correct);
    if (correct) {
      const next = correctCount + 1;
      setStarsThisRound((s) => s + stars);
      setCorrectCount(next);
      if (next >= GOAL) {
        endGame(true, next);
        return;
      }
    }
    busyRef.current = false;
    spawnRound(newSnake);
  }

  function step() {
    if (busyRef.current) return;
    const head = snake[0];
    const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      endGame(false, correctCount);
      return;
    }
    const eaten = candidates.find((c) => c.x === newHead.x && c.y === newHead.y);
    const grow = eaten ? eaten.value === problem.answer : false;
    const bodyToCheck = grow ? snake : snake.slice(0, -1);
    if (bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
      endGame(false, correctCount);
      return;
    }
    const newSnake = grow ? [newHead, ...snake] : [newHead, ...snake.slice(0, -1)];
    setSnake(newSnake);
    if (eaten) resolveEaten(eaten, newSnake);
  }

  useGameLoop(
    (dtMs) => {
      accRef.current += dtMs;
      if (accRef.current < tickMs) return;
      accRef.current -= tickMs;
      step();
    },
    { running: phase === "playing" },
  );

  function trySetDirection(next: Cell) {
    const cur = dirRef.current;
    if (snake.length > 1 && next.x === -cur.x && next.y === -cur.y) return; // sin giro de 180°
    dirRef.current = next;
  }

  useArrowKeys(
    {
      up: () => trySetDirection({ x: 0, y: -1 }),
      down: () => trySetDirection({ x: 0, y: 1 }),
      left: () => trySetDirection({ x: -1, y: 0 }),
      right: () => trySetDirection({ x: 1, y: 0 }),
    },
    { enabled: phase === "playing" },
  );

  function onTouchMove(dx: number, dy: number) {
    if (dx !== 0) trySetDirection({ x: Math.sign(dx), y: 0 });
    else if (dy !== 0) trySetDirection({ x: 0, y: Math.sign(dy) });
  }

  const progressPct = Math.min(100, (correctCount / GOAL) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-emerald-500 bg-slate-950 p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#34d399 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🐍 Serpiente numérica
        </h2>
        <p className="mb-6 text-sm text-emerald-200">¡Guía la serpiente hasta el número que resuelve la operación!</p>

        {phase === "start" && (
          <div className="space-y-6 py-8">
            <div aria-hidden="true" className="animate-bounce text-6xl">
              🐍
            </div>
            <button
              type="button"
              onClick={start}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-emerald-400 to-teal-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-emerald-300">Usa las flechas del teclado (o los botones) para moverte.</p>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Avance de la serpiente"
              aria-valuemin={0}
              aria-valuemax={GOAL}
              aria-valuenow={correctCount}
              aria-valuetext={`${correctCount} de ${GOAL} respuestas correctas`}
              className="h-3 w-full overflow-hidden rounded-full bg-emerald-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-emerald-700 bg-emerald-950/80 p-3 text-sm">
              <span>
                Aciertos: <strong className="text-emerald-300">{correctCount}</strong>/{GOAL}
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-teal-300">{starsThisRound}</strong>
              </span>
            </div>

            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-900/40 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-emerald-300">
                  {problem.flavor}
                </p>
              )}
              <p id={promptId} className="text-2xl font-black text-teal-200 sm:text-3xl">
                {problem.prompt}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative mx-auto grid aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-2 border-emerald-700 bg-slate-900"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
            >
              {snake.map((seg, i) => (
                <div
                  key={`snake-${i}`}
                  className={`${reducedMotion ? "" : "transition-all duration-150"} m-[6%] rounded-sm ${i === 0 ? "bg-emerald-300" : "bg-emerald-500"}`}
                  style={{ gridColumn: seg.x + 1, gridRow: seg.y + 1 }}
                />
              ))}
              {candidates.map((c) => (
                <div
                  key={`candidate-${c.x}-${c.y}`}
                  className="m-[4%] flex items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-teal-200"
                  style={{ gridColumn: c.x + 1, gridRow: c.y + 1 }}
                >
                  {c.value}
                </div>
              ))}
            </div>

            <TouchDPad onMove={onTouchMove} />
          </div>
        )}

        {phase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {win ? "🐍🏆" : "💥"}
            </div>
            <h3 className="text-3xl font-bold text-teal-200">{win ? "¡Lograste la meta!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-emerald-700 bg-emerald-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Respuestas acertadas:</span>
                <strong className="text-emerald-300">{correctCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-teal-300">+{starsThisRound} ★</strong>
              </div>
              {bestScore != null && (
                <div className="flex justify-between border-t border-emerald-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            <button type="button" onClick={start} className="rounded-xl bg-teal-600 px-8 py-3 font-bold text-white hover:bg-teal-500">
              Jugar de nuevo 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
