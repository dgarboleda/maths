"use client";

import { ArcadeIntro, ArcadeSprite } from "./ArcadeArt";
import { ArcadeFinalScore, ArcadeFxLayer, ArcadeScoreBar, cellAt, useArcadeFx } from "./ArcadeFx";

import { useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { shuffle, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { useArcadeFocus } from "@/lib/minigames/useArcadeFocus";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import { TouchDPad } from "@/components/level/runtime/TouchDPad";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { useContinueArcade } from "@/lib/minigames/useContinueArcade";
import { lessonArcadeState, arcadeValues, ChoiceText, PromptText, lessonValues, ReflexNotice, gamePromptSize } from "@/lib/minigames/lessonArcade";

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
/** Moneda dorada: solo puntos arcade. No es una respuesta ni hace crecer. */
const COIN_POINTS = 50;
const ANSWER_POINTS = 150;
const COIN_SPEED_STEP_MS = 15;
const COIN_SPEED_FLOOR_MS = 260;

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
  exercise,
}: {
  moduleId: string;
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
  onWin?: () => void;
  /** `undefined`/`null` = sin marca todavía (nunca se trata como 0). */
  bestScore?: number | null;
  /** Se llama al chocar o al ganar, con las respuestas acertadas de la partida. */
  onGameOver?: (correctCount: number) => void;
  /** Modo clase: misma mecánica; solo comer un número envía una respuesta y
   *  chocar no cuenta (ver `lessonArcade.tsx`). */
  exercise?: LessonExercise;
}) {
  const newProblem = () => exercise?.problem ?? getModule(moduleId)!.generateProblem();
  const { lesson, frozen, solved } = lessonArcadeState(exercise);
  const goal = lesson ? (exercise?.rounds ?? 1) : GOAL;
  const [reflexMiss, setReflexMiss] = useState(false);
  // Clase: quieta hasta la primera flecha (tras empezar, chocar o responder).
  const [awaitingInput, setAwaitingInput] = useState(true);
  const waiting = lesson && awaitingInput;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [snake, setSnake] = useState<Cell[]>(INITIAL_SNAKE);
  const snakeRef = useRef(INITIAL_SNAKE);
  const turnQueuedRef = useRef(false);
  const [legacyProblem, setProblem] = useState<Problem>(newProblem);
  const problem = exercise?.problem ?? legacyProblem;
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);
  const [coin, setCoin] = useState<Cell | null>(null);
  const cabinetRef = useRef<HTMLDivElement>(null);
  const fx = useArcadeFx({ game: "snake", soundOn, solved, cabinetRef, session: exercise?.session });

  const dirRef = useRef<Cell>(INITIAL_DIR);
  const accRef = useRef(0);
  const busyRef = useRef(false); // true mientras se espera onAnswer — evita comer dos veces a la vez

  const wave = waveIndex(exercise?.round ?? correctCount, WAVE_SIZE);
  // Cada moneda acelera un poco la serpiente: más ritmo sin tocar la pregunta.
  const [coinsEaten, setCoinsEaten] = useState(0);
  const tickMs = Math.max(COIN_SPEED_FLOOR_MS, scaleWithWave(TICK_BASE_MS, TICK_STEP_MS, wave, TICK_FLOOR_MS) - coinsEaten * COIN_SPEED_STEP_MS);
  const candidateCount = Math.round(scaleWithWave(CANDIDATES_BASE, CANDIDATES_STEP, wave, CANDIDATES_MAX));

  function spawnRound(currentSnake: Cell[]) {
    const nextProblem = newProblem();
    const spread = Math.max(8, candidateCount * 2);
    const values = exercise ? lessonValues(exercise) : arcadeValues(nextProblem, candidateCount, spread);
    const cells = pickFreeCells(currentSnake, values.length + 1);
    setProblem(nextProblem);
    setCandidates(cells.slice(0, values.length).map((cell, i) => ({ ...cell, value: values[i] })));
    setCoin(cells[values.length] ?? null);
  }

  function endGame(didWin: boolean, finalCount: number) {
    setWin(didWin);
    setPhase("over");
    fx.end(didWin);
    if (!didWin) fx.oops();
    playSound(didWin ? "fanfare" : "fail", soundOn);
    onGameOver?.(finalCount);
    if (didWin) {
      triggerConfetti("medium");
      onWin?.();
    }
  }

  /** Choque en modo clase: no es una respuesta; vuelve a empezar el recorrido. */
  function reflexReset() {
    fx.oops(cellAt(snakeRef.current[0].x, snakeRef.current[0].y, GRID_SIZE), "¡Choque!");
    setReflexMiss(true);
    setAwaitingInput(true);
    dirRef.current = INITIAL_DIR;
    accRef.current = 0;
    turnQueuedRef.current = false;
    snakeRef.current = INITIAL_SNAKE;
    setSnake(INITIAL_SNAKE);
    spawnRound(INITIAL_SNAKE);
  }

  useContinueArcade(exercise, start);

  function start() {
    if (frozen) return;
    playSound("click", soundOn);
    setReflexMiss(false);
    setAwaitingInput(true);
    dirRef.current = INITIAL_DIR;
    accRef.current = 0;
    turnQueuedRef.current = false;
    snakeRef.current = INITIAL_SNAKE;
    busyRef.current = false;
    setSnake(INITIAL_SNAKE);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    setCoinsEaten(0);
    setPhase("playing");
    fx.start();
    spawnRound(INITIAL_SNAKE);
  }

  async function resolveEaten(eaten: Candidate, newSnake: Cell[]) {
    busyRef.current = true;
    setCandidates([]); // nada más para comer hasta que se resuelva esta ronda
    setReflexMiss(false);
    const at = cellAt(eaten.x, eaten.y, GRID_SIZE);
    if (exercise) {
      fx.pop("¡Ñam!", at, "info");
      fx.burst(at, "info");
      try {
        // Se envía el valor comido: el resultado lo decide el servidor.
        await exercise.onResponse(eaten.value);
      } finally {
        busyRef.current = false;
        setAwaitingInput(true);
        spawnRound(newSnake);
      }
      return;
    }
    const correct = eaten.value === problem.answer;
    playSound(correct ? "correct" : "wrong", soundOn);
    if (correct) fx.award(ANSWER_POINTS, at, { sound: "pop" });
    else fx.oops(at, "✗");
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
    const currentSnake = snakeRef.current;
    turnQueuedRef.current = false;
    const head = currentSnake[0];
    const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      if (lesson) reflexReset();
      else endGame(false, correctCount);
      return;
    }
    const eaten = candidates.find((c) => c.x === newHead.x && c.y === newHead.y);
    const grow = eaten ? eaten.value === problem.answer : false;
    const bodyToCheck = grow ? currentSnake : currentSnake.slice(0, -1);
    if (bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
      if (lesson) reflexReset();
      else endGame(false, correctCount);
      return;
    }
    const newSnake = grow ? [newHead, ...currentSnake] : [newHead, ...currentSnake.slice(0, -1)];
    snakeRef.current = newSnake;
    setSnake(newSnake);
    if (coin && coin.x === newHead.x && coin.y === newHead.y) {
      fx.award(COIN_POINTS, cellAt(coin.x, coin.y, GRID_SIZE), { tone: "bonus" });
      setCoin(pickFreeCells([...newSnake, ...candidates], 1)[0] ?? null);
      setCoinsEaten((n) => n + 1);
    }
    if (eaten) resolveEaten(eaten, newSnake);
  }

  useGameLoop(
    (dtMs) => {
      accRef.current += dtMs;
      if (accRef.current < tickMs) return;
      accRef.current -= tickMs;
      step();
    },
    { running: phase === "playing" && !frozen && !solved && !waiting },
  );

  function trySetDirection(next: Cell) {
    if (phase !== "playing" || frozen || solved || busyRef.current || turnQueuedRef.current) return;
    const cur = dirRef.current;
    if (snakeRef.current.length > 1 && next.x === -cur.x && next.y === -cur.y) return; // sin giro de 180°
    turnQueuedRef.current = next.x !== cur.x || next.y !== cur.y;
    dirRef.current = next;
    setAwaitingInput(false);
  }

  useArrowKeys(
    {
      up: () => trySetDirection({ x: 0, y: -1 }),
      down: () => trySetDirection({ x: 0, y: 1 }),
      left: () => trySetDirection({ x: -1, y: 0 }),
      right: () => trySetDirection({ x: 1, y: 0 }),
    },
    { enabled: phase === "playing" && !frozen && !solved },
  );

  function onTouchMove(dx: number, dy: number) {
    if (dx !== 0) trySetDirection({ x: Math.sign(dx), y: 0 });
    else if (dy !== 0) trySetDirection({ x: 0, y: Math.sign(dy) });
  }

  const shownPhase = solved ? "over" : phase;
  const promptFocus = useArcadeFocus(shownPhase === "playing", frozen);
  const shownCount = lesson ? (exercise?.round ?? 0) + Number(solved) : correctCount;
  const shownWin = lesson ? solved : win;
  const progressPct = Math.min(100, (shownCount / goal) * 100);
  const facing = snake.length > 1 ? { x: snake[0].x - snake[1].x, y: snake[0].y - snake[1].y } : INITIAL_DIR;

  return (
    <div ref={cabinetRef} data-game="snake" data-paused={Boolean(exercise?.paused || exercise?.disabled)} className="arcade-cabinet relative overflow-hidden rounded-3xl border-4 border-emerald-500 bg-slate-950 p-3 sm:p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#34d399 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <ArcadeFxLayer fx={fx} scope="cabinet" />
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="mb-2 bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🐍 Serpiente numérica
        </h2>
        <p className="mb-6 text-sm text-emerald-200">¡Guía la serpiente hasta el número que resuelve la operación!</p>

        {shownPhase === "start" && (
          <div className="space-y-6 py-8">
            <ArcadeIntro game="snake" />
            <button
              type="button"
              onClick={start}
              disabled={frozen}
              className="arcade-start-pulse rounded-2xl border-2 border-white bg-gradient-to-r from-emerald-400 to-teal-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-emerald-300">Usa las flechas del teclado (o los botones) para moverte. Las monedas doradas dan puntos y aceleran la serpiente.{lesson && " En esta clase la serpiente espera tu primera flecha, y chocar no cuenta como respuesta."}</p>
          </div>
        )}

        {shownPhase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Avance de la serpiente"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={shownCount}
              aria-valuetext={`${shownCount} de ${goal} respuestas correctas`}
              className="h-3 w-full overflow-hidden rounded-full bg-emerald-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <ArcadeScoreBar fx={fx} />
            {lesson ? <ReflexNotice show={reflexMiss} waiting={waiting} /> : <div className="flex items-center justify-between rounded-xl border border-emerald-700 bg-emerald-950/80 p-3 text-sm">
              <span>
                Aciertos: <strong className="text-emerald-300">{correctCount}</strong>/{GOAL}
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-teal-300">{starsThisRound}</strong>
              </span>
            </div>}

            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-900/40 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-emerald-300">
                  {problem.flavor}
                </p>
              )}
              <p ref={promptFocus} tabIndex={-1} id={promptId} className={`${gamePromptSize(problem.prompt)} font-black text-teal-200 outline-none`}>
                <PromptText problem={problem} />
              </p>
            </div>

            <div
              aria-hidden="true"
              data-snake-board="" data-head-x={snake[0].x} data-head-y={snake[0].y}
              className="arcade-scene arcade-scene-garden relative mx-auto grid aspect-square w-full max-w-[min(100%,36rem,65vh)] overflow-hidden rounded-2xl border-2 border-emerald-700"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
            >
              {snake.map((seg, i) => (
                <div
                  key={`snake-${i}`}
                  className={`${reducedMotion ? "" : "transition-all duration-150"} relative m-[4%] rounded-xl ${i === 0 ? "z-10" : "arcade-snake-body"}`}
                  style={{ gridColumn: seg.x + 1, gridRow: seg.y + 1 }}
                >{i === 0 && <span className="absolute inset-0" style={{ transform: `rotate(${facing.y === 1 ? 90 : facing.y === -1 ? -90 : facing.x === -1 ? 180 : 0}deg)` }}><ArcadeSprite kind="snake" className="size-full" /></span>}</div>
              ))}
              {coin && (
                <div className="arcade-bonus-item z-10 m-[14%] rounded-full border-2 border-yellow-100 bg-gradient-to-br from-yellow-200 to-amber-500 shadow-[0_0_12px_#facc15]" data-coin="" style={{ gridColumn: coin.x + 1, gridRow: coin.y + 1 }} />
              )}
              <ArcadeFxLayer fx={fx} />
              {candidates.map((c) => (
                <div
                  key={`candidate-${c.x}-${c.y}`}
                  className="arcade-value z-10 m-[3%] flex items-center justify-center rounded-lg border border-emerald-300/70 bg-emerald-950 font-bold text-emerald-100 shadow-md"
                  style={{ gridColumn: c.x + 1, gridRow: c.y + 1 }}
                >
                  <ChoiceText problem={problem} value={c.value} />
                </div>
              ))}
            </div>

            <TouchDPad inline repeat={false} disabled={frozen || solved} onMove={onTouchMove} />
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="arcade-win text-6xl">
              {shownWin ? "🐍🏆" : "💥"}
            </div>
            <h3 className="text-3xl font-bold text-teal-200">{shownWin ? "¡Lograste la meta!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-emerald-700 bg-emerald-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Respuestas acertadas:</span>
                <strong className="text-emerald-300">{shownCount}</strong>
              </div>
              <ArcadeFinalScore fx={fx} />
              {!lesson && <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-teal-300">+{starsThisRound} ★</strong>
              </div>}
              {bestScore != null && (
                <div className="flex justify-between border-t border-emerald-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            {!lesson && <button type="button" onClick={start} className="rounded-xl bg-teal-600 px-8 py-3 font-bold text-white hover:bg-teal-500">
              Jugar de nuevo 🔄
            </button>}
          </div>
        )}
      </div>
    </div>
  );
}
