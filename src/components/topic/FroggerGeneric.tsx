"use client";

import { useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { choiceSet, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import { TouchDPad } from "@/components/level/runtime/TouchDPad";

const COLS = 5;
const CENTER_COL = Math.floor(COLS / 2);
const LIVES_START = 3;
const GOAL = 3; // estanques (checkpoints) a cruzar para ganar
const START_ROW = GOAL * 2; // fila segura de partida
const OBSTACLE_TICK_BASE_MS = 500;
const OBSTACLE_TICK_STEP_MS = -60;
const OBSTACLE_TICK_FLOOR_MS = 220;

type Phase = "start" | "playing" | "over";

/** Filas pares por debajo de la fila de partida son un estanque (checkpoint);
 *  la fila de partida (aunque par) es zona segura, no un estanque. */
function isCheckpointRow(row: number): boolean {
  return row % 2 === 0 && row < START_ROW;
}
function isObstacleRow(row: number): boolean {
  return row % 2 === 1;
}

/**
 * Math Frogger — Fase 37 (docs/plan-minijuegos-retro.md). Mismo contrato que
 * `CoheteGeneric`/`SnakeGeneric`: quien monta esto (`LevelFroggerOverlay`)
 * decide qué pasa con cada respuesta y con el resultado final.
 *
 * A diferencia de Snake, el movimiento del jugador es inmediato por tecla
 * (no atado a `useGameLoop`, que acá solo mueve el obstáculo) — más fiel al
 * género. El jugador avanza fila por fila hacia arriba: las filas impares
 * son un carril con un obstáculo que se mueve solo (chocar cuesta una vida
 * y empuja de vuelta al estanque anterior, PERO nunca termina la partida
 * hasta agotar las vidas); las filas pares son un estanque con `COLS`
 * nenúfares numerados — pisar el nenúfar correcto avanza y arma una
 * pregunta nueva, pisar uno incorrecto retrocede una fila (penalización
 * explícita del requerimiento de producto: nunca termina la partida de
 * inmediato) sin costar una vida.
 */
export function FroggerGeneric({
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
  /** Se llama al agotar las vidas o al ganar, con los estanques cruzados. */
  onGameOver?: (correctCount: number) => void;
}) {
  const mod = getModule(moduleId)!;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [row, setRow] = useState(START_ROW);
  const [frogX, setFrogX] = useState(CENTER_COL);
  const [lives, setLives] = useState(LIVES_START);
  const [problem, setProblem] = useState<Problem>(() => mod.generateProblem());
  const [candidates, setCandidates] = useState<number[]>([]);
  const [obstacleX, setObstacleX] = useState(CENTER_COL);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);

  const obstacleDirRef = useRef(1);
  const accRef = useRef(0);
  const busyRef = useRef(false); // true mientras se espera onAnswer

  const wave = waveIndex(correctCount, 1);
  const obstacleTickMs = scaleWithWave(OBSTACLE_TICK_BASE_MS, OBSTACLE_TICK_STEP_MS, wave, OBSTACLE_TICK_FLOOR_MS);

  function spawnCheckpoint() {
    const nextProblem = mod.generateProblem();
    const spread = Math.max(8, COLS * 2);
    setProblem(nextProblem);
    setCandidates(choiceSet(nextProblem.answer, spread, COLS));
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
    setRow(START_ROW);
    setFrogX(CENTER_COL);
    setObstacleX(CENTER_COL);
    obstacleDirRef.current = 1;
    accRef.current = 0;
    busyRef.current = false;
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    setPhase("playing");
    spawnCheckpoint();
  }

  async function resolveCheckpoint(chosenX: number) {
    busyRef.current = true;
    const correct = candidates[chosenX] === problem.answer;
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
      spawnCheckpoint();
      busyRef.current = false;
      return;
    }
    // Incorrecto: retrocede al carril-obstáculo recién cruzado y arma una
    // pregunta nueva para el reintento — nunca termina la partida.
    setRow((r) => Math.min(r + 1, START_ROW));
    spawnCheckpoint();
    busyRef.current = false;
  }

  function handleHit() {
    playSound("wrong", soundOn);
    const remaining = lives - 1;
    setLives(remaining);
    setFrogX(CENTER_COL);
    if (remaining <= 0) {
      endGame(false, correctCount);
      return;
    }
    setRow((r) => Math.min(r + 1, START_ROW));
  }

  function handleUp() {
    if (busyRef.current || phase !== "playing") return;
    const newRow = Math.max(0, row - 1);
    if (newRow === row) return;
    setRow(newRow);
    if (isObstacleRow(newRow)) {
      obstacleDirRef.current = 1;
      setObstacleX(CENTER_COL);
      accRef.current = 0;
    } else if (isCheckpointRow(newRow)) {
      resolveCheckpoint(frogX);
    }
  }

  function handleDown() {
    if (busyRef.current || phase !== "playing") return;
    const newRow = Math.min(START_ROW, row + 1);
    if (newRow === row) return;
    setRow(newRow);
    if (isObstacleRow(newRow)) {
      obstacleDirRef.current = 1;
      setObstacleX(CENTER_COL);
      accRef.current = 0;
    }
  }

  function handleLeft() {
    if (busyRef.current) return;
    setFrogX((x) => Math.max(0, x - 1));
  }
  function handleRight() {
    if (busyRef.current) return;
    setFrogX((x) => Math.min(COLS - 1, x + 1));
  }

  useGameLoop(
    (dtMs) => {
      if (busyRef.current || !isObstacleRow(row)) return;
      accRef.current += dtMs;
      if (accRef.current < obstacleTickMs) return;
      accRef.current -= obstacleTickMs;
      let dir = obstacleDirRef.current;
      let next = obstacleX + dir;
      if (next < 0 || next >= COLS) {
        dir = -dir;
        next = obstacleX + dir;
      }
      obstacleDirRef.current = dir;
      setObstacleX(next);
      if (next === frogX) handleHit();
    },
    { running: phase === "playing" },
  );

  useArrowKeys(
    { up: handleUp, down: handleDown, left: handleLeft, right: handleRight },
    { enabled: phase === "playing" },
  );

  function onTouchMove(dx: number, dy: number) {
    if (dx > 0) handleRight();
    else if (dx < 0) handleLeft();
    else if (dy > 0) handleDown();
    else if (dy < 0) handleUp();
  }

  const progressPct = Math.min(100, (correctCount / GOAL) * 100);
  const inObstacleRow = isObstacleRow(row);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-sky-500 bg-slate-950 p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#38bdf8 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-lime-300 to-sky-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🐸 Estanque de operaciones
        </h2>
        <p className="mb-6 text-sm text-sky-200">¡Cruza saltando al nenúfar con el resultado correcto!</p>

        {phase === "start" && (
          <div className="space-y-6 py-8">
            <div aria-hidden="true" className="animate-bounce text-6xl">
              🐸
            </div>
            <button
              type="button"
              onClick={start}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-lime-400 to-sky-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-sky-300">Usa las flechas del teclado (o los botones) para saltar.</p>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Estanques cruzados"
              aria-valuemin={0}
              aria-valuemax={GOAL}
              aria-valuenow={correctCount}
              aria-valuetext={`${correctCount} de ${GOAL} estanques cruzados`}
              className="h-3 w-full overflow-hidden rounded-full bg-sky-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-lime-400 to-sky-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-sky-700 bg-sky-950/80 p-3 text-sm">
              <span aria-live="polite">
                <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-lime-300">{starsThisRound}</strong>
              </span>
            </div>

            <div className="rounded-2xl border-2 border-lime-400 bg-sky-900/40 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-sky-300">
                  {problem.flavor}
                </p>
              )}
              <p id={promptId} className="text-2xl font-black text-lime-200 sm:text-3xl">
                {problem.prompt}
              </p>
            </div>

            <p aria-hidden="true" className="text-xs font-bold uppercase tracking-widest text-sky-300">
              {inObstacleRow ? "¡Esquiva el obstáculo!" : "Elige el nenúfar correcto"}
            </p>

            <div
              aria-hidden="true"
              className="mx-auto grid w-full max-w-sm gap-1 overflow-hidden rounded-2xl border-2 border-sky-700 bg-slate-900 p-2"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {Array.from({ length: COLS }, (_, col) => (
                <div
                  key={col}
                  className={`${reducedMotion ? "" : "transition-colors duration-150"} flex aspect-square items-center justify-center rounded-lg text-sm font-bold ${
                    inObstacleRow
                      ? col === obstacleX
                        ? "bg-red-600 text-white"
                        : "bg-slate-800 text-slate-500"
                      : "bg-lime-800/60 text-lime-100"
                  }`}
                >
                  {frogX === col ? "🐸" : inObstacleRow ? "" : candidates[col]}
                </div>
              ))}
            </div>

            <TouchDPad onMove={onTouchMove} />
          </div>
        )}

        {phase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {win ? "🐸🏆" : "💦"}
            </div>
            <h3 className="text-3xl font-bold text-lime-200">{win ? "¡Cruzaste el estanque!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-sky-700 bg-sky-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Estanques cruzados:</span>
                <strong className="text-lime-300">{correctCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-sky-300">+{starsThisRound} ★</strong>
              </div>
              {bestScore != null && (
                <div className="flex justify-between border-t border-sky-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            <button type="button" onClick={start} className="rounded-xl bg-sky-600 px-8 py-3 font-bold text-white hover:bg-sky-500">
              Jugar de nuevo 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
