"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { choiceSet, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import { HorizontalPad } from "@/components/level/runtime/HorizontalPad";
import { findHitBlock, hitsPaddle, stepBall, type Ball } from "./breakoutPhysics";

const FIELD_WIDTH = 100; // unidades porcentuales, no píxeles — ver breakoutPhysics.ts
const BALL_SIZE = 4;
const BLOCK_ROWS = 2;
const BLOCK_COLS = 4;
const BLOCK_W = FIELD_WIDTH / BLOCK_COLS;
const BLOCK_H = 10;
const ROW_Y = [8, 22];
const PADDLE_WIDTH = 24;
const PADDLE_Y = 90;
const PADDLE_STEP = 12;
const START_COL = 1; // columna donde arrancan la pelota y la paleta, alineadas
const BALL_START_X = START_COL * BLOCK_W + (BLOCK_W - BALL_SIZE) / 2;
const BALL_START_Y = 60;
const PADDLE_START_X = START_COL * BLOCK_W;
const GOAL = 3; // bloques correctos rotos para ganar
const WAVE_SIZE = 1;
const LIVES_START = 3;
const SPEED_BASE = 45; // %/segundo
const SPEED_STEP = 8;
const SPEED_MAX = 85;

type Phase = "start" | "playing" | "over";
interface Block {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
}

function buildBlocks(values: number[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  for (let row = 0; row < BLOCK_ROWS; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      blocks.push({ id: `${row}-${col}`, x: col * BLOCK_W, y: ROW_Y[row], w: BLOCK_W, h: BLOCK_H, value: values[i] });
      i++;
    }
  }
  return blocks;
}

/**
 * Math Breakout — Fase 41 (docs/plan-minijuegos-retro.md). Mismo contrato
 * que el resto de la serie. El único minijuego con física continua real
 * (posición/velocidad en punto flotante, no grilla ni carriles) — la
 * mecánica más alejada de todo lo demás en el repo, por eso quedó para el
 * final. La física en sí vive en `breakoutPhysics.ts` (funciones puras,
 * probadas sin `useGameLoop` ni timers falsos).
 *
 * La posición de la pelota es demasiado "caliente" (cambia cada cuadro) para
 * vivir en estado de React sin repetir el bug de Fase 38 (Runner): acá vive
 * en un `ref` y se pinta con una actualización imperativa del DOM
 * (`ballElRef.current.style`), nunca vía `setState` — exactamente la
 * mitigación de rendimiento que el plan anticipaba para esta situación. Los
 * bloques y la paleta cambian con tan poca frecuencia (un bloque roto, una
 * tecla) que sí son estado de React normal, sin el mismo riesgo.
 *
 * Romper el bloque correcto → gana la ronda, arma una grilla nueva. Romper
 * uno incorrecto → ese bloque desaparece igual (fidelidad del género) pero
 * sin puntaje ni penalización — la única forma de perder una vida es dejar
 * caer la pelota detrás de la paleta (evento arcade, no matemático). El
 * ancho de la paleta nunca se reduce con la dificultad (por accesibilidad):
 * solo la velocidad de la pelota sube.
 */
export function BreakoutGeneric({
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
  /** Se llama al agotar las vidas o al ganar, con los bloques acertados. */
  onGameOver?: (correctCount: number) => void;
}) {
  const mod = getModule(moduleId)!;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [paddleX, setPaddleX] = useState(PADDLE_START_X);
  const [lives, setLives] = useState(LIVES_START);
  const [problem, setProblem] = useState<Problem>(() => mod.generateProblem());
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);

  const ballRef = useRef<Ball>({ x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: -SPEED_BASE });
  const ballElRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false); // true mientras se espera onAnswer del bloque CORRECTO (arma ronda nueva)

  const wave = waveIndex(correctCount, WAVE_SIZE);
  const currentSpeed = scaleWithWave(SPEED_BASE, SPEED_STEP, wave, SPEED_MAX);

  function syncBallDom() {
    const el = ballElRef.current;
    if (!el) return;
    el.style.left = `${ballRef.current.x}%`;
    el.style.top = `${ballRef.current.y}%`;
  }

  useEffect(() => {
    if (phase === "playing") syncBallDom();
  }, [phase]);

  function resetBall() {
    ballRef.current = { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: -currentSpeed };
    syncBallDom();
  }

  function spawnRound() {
    const nextProblem = mod.generateProblem();
    const spread = Math.max(8, BLOCK_ROWS * BLOCK_COLS * 2);
    const values = choiceSet(nextProblem.answer, spread, BLOCK_ROWS * BLOCK_COLS);
    setProblem(nextProblem);
    setBlocks(buildBlocks(values));
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
    busyRef.current = false;
    setPaddleX(PADDLE_START_X);
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    ballRef.current = { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: -SPEED_BASE };
    setPhase("playing");
    spawnRound();
  }

  async function resolveBlock(block: Block) {
    const correct = block.value === problem.answer;
    if (correct) {
      busyRef.current = true;
      playSound("correct", soundOn);
      const stars = await onAnswer(true);
      const next = correctCount + 1;
      setStarsThisRound((s) => s + stars);
      setCorrectCount(next);
      if (next >= GOAL) {
        endGame(true, next);
        return;
      }
      spawnRound();
      busyRef.current = false;
      return;
    }
    // Incorrecto: el bloque desaparece igual (fidelidad del género) pero sin
    // puntaje ni penalización — la pelota sigue en juego sin pausa.
    playSound("wrong", soundOn);
    setBlocks((prev) => prev.filter((b) => b.id !== block.id));
    await onAnswer(false);
  }

  function handleFall() {
    playSound("wrong", soundOn);
    const remaining = lives - 1;
    setLives(remaining);
    if (remaining <= 0) {
      endGame(false, correctCount);
      return;
    }
    resetBall();
  }

  useGameLoop(
    (dtMs) => {
      if (busyRef.current) return;
      const dtSec = dtMs / 1000;
      let ball = stepBall(ballRef.current, dtSec, FIELD_WIDTH, BALL_SIZE);

      if (hitsPaddle(ball, BALL_SIZE, paddleX, PADDLE_WIDTH, PADDLE_Y)) {
        ball = { ...ball, y: PADDLE_Y - BALL_SIZE, vy: -currentSpeed };
      }

      if (ball.y > 100) {
        ballRef.current = ball;
        handleFall();
        return;
      }

      const hit = findHitBlock(ball, BALL_SIZE, blocks);
      if (hit) {
        const bounceVy = -ball.vy;
        ball = { ...ball, vy: bounceVy, y: bounceVy < 0 ? hit.y - BALL_SIZE : hit.y + hit.h };
        resolveBlock(hit);
      }

      ballRef.current = ball;
      syncBallDom();
    },
    { running: phase === "playing" },
  );

  function moveLeft() {
    setPaddleX((x) => Math.max(0, x - PADDLE_STEP));
  }
  function moveRight() {
    setPaddleX((x) => Math.min(FIELD_WIDTH - PADDLE_WIDTH, x + PADDLE_STEP));
  }

  useArrowKeys({ left: moveLeft, right: moveRight }, { enabled: phase === "playing" });

  const goalProgressPct = Math.min(100, (correctCount / GOAL) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-orange-500 bg-slate-950 p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#fb923c 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-orange-300 to-violet-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🧱 Bloques numéricos
        </h2>
        <p className="mb-6 text-sm text-orange-200">¡Rompe el bloque con el resultado correcto sin dejar caer la pelota!</p>

        {phase === "start" && (
          <div className="space-y-6 py-8">
            <div aria-hidden="true" className="animate-bounce text-6xl">
              🧱
            </div>
            <button
              type="button"
              onClick={start}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-orange-400 to-violet-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-orange-300">Usa las flechas (o los botones) para mover la paleta.</p>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Bloques acertados"
              aria-valuemin={0}
              aria-valuemax={GOAL}
              aria-valuenow={correctCount}
              aria-valuetext={`${correctCount} de ${GOAL} bloques acertados`}
              className="h-3 w-full overflow-hidden rounded-full bg-orange-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-violet-400 transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-orange-700 bg-orange-950/80 p-3 text-sm">
              <span aria-live="polite">
                <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-violet-300">{starsThisRound}</strong>
              </span>
            </div>

            <div className="rounded-2xl border-2 border-violet-400 bg-orange-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-orange-300">
                  {problem.flavor}
                </p>
              )}
              <p id={promptId} className="text-2xl font-black text-violet-200 sm:text-3xl">
                {problem.prompt}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl border-2 border-orange-700 bg-slate-900"
            >
              {blocks.map((b) => (
                <div
                  key={b.id}
                  className="absolute flex items-center justify-center rounded-sm border border-orange-950 bg-slate-800 text-xs font-bold text-orange-200"
                  style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
                >
                  {b.value}
                </div>
              ))}
              <div
                ref={ballElRef}
                className={`${reducedMotion ? "" : "transition-[left,top] duration-75"} absolute rounded-full bg-yellow-300`}
                style={{ width: `${BALL_SIZE}%`, height: `${BALL_SIZE}%` }}
              />
              <div
                className={`${reducedMotion ? "" : "transition-all duration-150"} absolute rounded-md bg-violet-400`}
                style={{ left: `${paddleX}%`, top: `${PADDLE_Y}%`, width: `${PADDLE_WIDTH}%`, height: "3%" }}
              />
            </div>

            <HorizontalPad onLeft={moveLeft} onRight={moveRight} />
          </div>
        )}

        {phase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {win ? "🏆" : "🕳️"}
            </div>
            <h3 className="text-3xl font-bold text-violet-200">{win ? "¡Muro derribado!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-orange-700 bg-orange-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Bloques acertados:</span>
                <strong className="text-violet-300">{correctCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-orange-300">+{starsThisRound} ★</strong>
              </div>
              {bestScore != null && (
                <div className="flex justify-between border-t border-orange-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            <button type="button" onClick={start} className="rounded-xl bg-violet-600 px-8 py-3 font-bold text-white hover:bg-violet-500">
              Jugar de nuevo 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
