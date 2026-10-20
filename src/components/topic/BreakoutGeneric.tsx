"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { choiceSet, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { useArcadeFocus } from "@/lib/minigames/useArcadeFocus";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import { HorizontalPad } from "@/components/level/runtime/HorizontalPad";
import { findHitBlock, hitsPaddle, paddleBounceVx, stepBall, type Ball } from "./breakoutPhysics";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { lessonArcadeState, lessonLabel, lessonValues, ReflexNotice, gamePromptSize } from "@/lib/minigames/lessonArcade";
import { pointOnRoute, routeLength, shotRoute, type ShotPoint, type ShotStyle } from "@/lib/minigames/aimedShot";

const FIELD_WIDTH = 100; // unidades porcentuales, no píxeles — ver breakoutPhysics.ts
const BALL_SIZE = 4;
const BLOCK_ROWS = 2;
const BLOCK_COLS = 4;
const BLOCK_W = FIELD_WIDTH / BLOCK_COLS;
const BLOCK_H = 10;
const ROW_Y = [8, 22];
const PADDLE_WIDTH = 24;
const PADDLE_Y = 90;
const PADDLE_H = 3;
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

/** En la clase, las cinco opciones van en una sola fila (una por columna):
 *  ningún bloque queda detrás de otro y cada lanzamiento apunta a uno. */
const LESSON_COLS = 5;
const LESSON_W = FIELD_WIDTH / LESSON_COLS;
const LESSON_ROW_Y = 14;
const LESSON_SPEED = 150;

function buildBlocks(values: number[], lesson = false): Block[] {
  if (lesson)
    return values.map((value, col) => ({ id: `0-${col}`, x: col * LESSON_W, y: LESSON_ROW_Y, w: LESSON_W, h: BLOCK_H, value }));
  const blocks: Block[] = [];
  let i = 0;
  for (let row = 0; row < BLOCK_ROWS; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      if (i >= values.length) return blocks; // la clase trae menos opciones
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
  exercise,
}: {
  moduleId: string;
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
  onWin?: () => void;
  /** `undefined`/`null` = sin marca todavía (nunca se trata como 0). */
  bestScore?: number | null;
  /** Se llama al agotar las vidas o al ganar, con los bloques acertados. */
  onGameOver?: (correctCount: number) => void;
  /** Modo clase: lanzamiento apuntado, directo o con rebote lateral. La guía
   * conserva el bloque elegido; el vuelo nunca genera otra respuesta. */
  exercise?: LessonExercise;
}) {
  const newProblem = () => exercise?.problem ?? getModule(moduleId)!.generateProblem();
  const { lesson, frozen, solved } = lessonArcadeState(exercise);
  const goal = lesson ? 1 : GOAL;
  const [reflexMiss, setReflexMiss] = useState(false);
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const paddleWidth = lesson ? LESSON_W : PADDLE_WIDTH;
  const paddleStep = lesson ? LESSON_W : PADDLE_STEP;
  const paddleStart = lesson ? 2 * LESSON_W : PADDLE_START_X;
  const [paddleX, setPaddleX] = useState(paddleStart);
  /** Clase: la pelota descansa sobre la paleta hasta que se lanza. */
  const [held, setHeld] = useState(true);
  const [shotStyle, setShotStyle] = useState<ShotStyle>("direct");
  const flightRef = useRef<{ route: ShotPoint[]; elapsed: number; duration: number; block: Block } | null>(null);
  const [lives, setLives] = useState(LIVES_START);
  const [legacyProblem, setProblem] = useState<Problem>(newProblem);
  const problem = exercise?.problem ?? legacyProblem;
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
    const nextProblem = newProblem();
    const spread = Math.max(8, BLOCK_ROWS * BLOCK_COLS * 2);
    const values = exercise ? lessonValues(exercise) : choiceSet(nextProblem.answer, spread, BLOCK_ROWS * BLOCK_COLS);
    setProblem(nextProblem);
    setBlocks(buildBlocks(values, lesson));
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
    if (frozen) return;
    playSound("click", soundOn);
    setReflexMiss(false);
    busyRef.current = false;
    setHeld(true);
    setShotStyle("direct");
    flightRef.current = null;
    setPaddleX(paddleStart);
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
    if (exercise) {
      // Lanzamiento apuntado: el bloque alcanzado es la respuesta elegida.
      busyRef.current = true;
      setReflexMiss(false);
      try {
        await exercise.onResponse(block.value);
      } finally {
        setHeld(true);
        busyRef.current = false;
      }
      return;
    }
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
    if (lesson) {
      // Perder la pelota es un fallo de reflejos: sin vidas ni respuesta.
      setReflexMiss(true);
      resetBall();
      return;
    }
    const remaining = lives - 1;
    setLives(remaining);
    if (remaining <= 0) {
      endGame(false, correctCount);
      return;
    }
    resetBall();
  }

  function launch() {
    if (!lesson || !held || flightRef.current || busyRef.current || frozen || solved || phase !== "playing") return;
    playSound("click", soundOn);
    const block = blocks.find((b) => paddleX + paddleWidth / 2 >= b.x && paddleX + paddleWidth / 2 < b.x + b.w);
    if (!block) return;
    const start = { x: paddleX + paddleWidth / 2 - BALL_SIZE / 2, y: PADDLE_Y - BALL_SIZE };
    const route = shotRoute(start, { x: block.x + block.w / 2 - BALL_SIZE / 2, y: block.y + block.h - 0.1 }, shotStyle, FIELD_WIDTH - BALL_SIZE);
    flightRef.current = { route, elapsed: 0, duration: Math.max(450, routeLength(route) / LESSON_SPEED * 1000), block };
    ballRef.current = { ...start, vx: 0, vy: 0 };
    setHeld(false);
  }

  useGameLoop(
    (dtMs) => {
      if (busyRef.current) return;
      if (lesson && held) {
        // Sobre la paleta, siguiéndola, hasta el lanzamiento.
        ballRef.current = { x: paddleX + paddleWidth / 2 - BALL_SIZE / 2, y: PADDLE_Y - BALL_SIZE, vx: 0, vy: 0 };
        syncBallDom();
        return;
      }
      if (lesson) {
        const flight = flightRef.current;
        if (!flight) return;
        flight.elapsed += Math.min(dtMs, 50);
        const progress = Math.min(1, flight.elapsed / flight.duration);
        ballRef.current = { ...pointOnRoute(flight.route, progress), vx: 0, vy: 0 };
        syncBallDom();
        if (progress === 1) {
          flightRef.current = null;
          void resolveBlock(flight.block);
        }
        return;
      }
      const dtSec = dtMs / 1000;
      let ball = stepBall(ballRef.current, dtSec, FIELD_WIDTH, BALL_SIZE);

      if (!lesson && hitsPaddle(ball, BALL_SIZE, paddleX, PADDLE_WIDTH, PADDLE_Y, PADDLE_H)) {
        ball = {
          ...ball,
          y: PADDLE_Y - BALL_SIZE,
          vy: -currentSpeed,
          // La paleta apunta: así todos los bloques son alcanzables.
          vx: paddleBounceVx(ball.x, BALL_SIZE, paddleX, PADDLE_WIDTH, currentSpeed),
        };
      }

      if (ball.y > 100 || (lesson && ball.y < 0)) {
        ballRef.current = ball;
        if (lesson) setHeld(true);
        else handleFall();
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
    { running: phase === "playing" && !frozen && !solved },
  );

  function moveLeft() {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    if (lesson && !held) return;
    setPaddleX((x) => Math.max(0, x - paddleStep));
  }
  function moveRight() {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    if (lesson && !held) return;
    setPaddleX((x) => Math.min(FIELD_WIDTH - paddleWidth, x + paddleStep));
  }

  useArrowKeys({ left: moveLeft, right: moveRight, up: launch, action: launch }, { enabled: phase === "playing" && !frozen && !solved });

  const shownPhase = solved ? "over" : phase;
  const promptFocus = useArcadeFocus(shownPhase === "playing");
  const shownCount = lesson ? Number(solved) : correctCount;
  const shownWin = lesson ? solved : win;
  const goalProgressPct = Math.min(100, (shownCount / goal) * 100);
  const preview = lesson ? shotRoute({ x: paddleX + paddleWidth / 2 - BALL_SIZE / 2, y: PADDLE_Y - BALL_SIZE },
    { x: paddleX + paddleWidth / 2 - BALL_SIZE / 2, y: LESSON_ROW_Y + BLOCK_H }, shotStyle, FIELD_WIDTH - BALL_SIZE) : [];

  return (
    <div className={`relative overflow-hidden rounded-3xl border-4 border-orange-500 bg-slate-950 p-3 text-white shadow-2xl sm:p-6 ${frozen ? "arcade-paused" : ""}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#fb923c 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-orange-300 to-violet-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🧱 Bloques numéricos
        </h2>
        <p className="mb-4 text-sm text-orange-200">{lesson ? "¡Apunta al resultado y elige un tiro directo o con rebote!" : "¡Rompe el bloque con el resultado correcto sin dejar caer la pelota!"}</p>

        {shownPhase === "start" && (
          <div className="space-y-6 py-8">
            <div aria-hidden="true" className="animate-bounce text-6xl">
              🧱
            </div>
            <button
              type="button"
              onClick={start}
              disabled={frozen}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-orange-400 to-violet-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-orange-300">
              {lesson
                ? "Mueve la paleta bajo tu respuesta. Elige tiro directo o rebote lateral, mira la guía y lanza con espacio, flecha arriba o el botón."
                : "Usa las flechas (o los botones) para mover la paleta; golpea con un borde para dirigir la pelota."}
            </p>
          </div>
        )}

        {shownPhase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Bloques acertados"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={shownCount}
              aria-valuetext={`${shownCount} de ${goal} bloques acertados`}
              className="h-3 w-full overflow-hidden rounded-full bg-orange-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-violet-400 transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            {lesson ? <ReflexNotice show={reflexMiss} /> : <div className="flex items-center justify-between rounded-xl border border-orange-700 bg-orange-950/80 p-3 text-sm">
              <span aria-live="polite">
                <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-violet-300">{starsThisRound}</strong>
              </span>
            </div>}

            <div className="rounded-2xl border-2 border-violet-400 bg-orange-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-orange-300">
                  {problem.flavor}
                </p>
              )}
              <p ref={promptFocus} tabIndex={-1} id={promptId} className={`${gamePromptSize(problem.prompt)} font-black text-violet-200 outline-none`}>
                {problem.prompt}
              </p>
            </div>

            <div
              aria-hidden="true"
              data-breakout-board="" data-held={held} data-shot-style={shotStyle}
              className="arcade-stars relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl border-2 border-orange-700 bg-slate-900"
            >
              {lesson && held && <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full"><polyline points={preview.map((point) => `${point.x + BALL_SIZE / 2},${point.y + BALL_SIZE / 2}`).join(" ")} fill="none" stroke="#c4b5fd" strokeWidth="0.6" strokeDasharray="2 2" /></svg>}
              {blocks.map((b) => (
                <div
                  key={b.id}
                  data-choice-label=""
                  className={`absolute flex items-center justify-center rounded-lg border-2 text-sm font-bold text-orange-100 ${lesson && paddleX + paddleWidth / 2 >= b.x && paddleX + paddleWidth / 2 < b.x + b.w ? "border-violet-200 bg-violet-700 shadow-lg shadow-violet-500/50" : "border-orange-500/50 bg-orange-950"}`}
                  style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
                >
                  {lessonLabel(exercise, b.value)}
                </div>
              ))}
              <div
                ref={ballElRef}
                className="absolute rounded-full bg-yellow-300 shadow-[0_0_12px_3px_#fbbf24]"
                style={{ width: `${BALL_SIZE}%`, height: `${BALL_SIZE}%` }}
              />
              <div
                className={`${reducedMotion ? "" : "transition-all duration-150"} absolute rounded-md bg-violet-400`}
                style={{ left: `${paddleX}%`, top: `${PADDLE_Y}%`, width: `${paddleWidth}%`, height: `${PADDLE_H}%` }}
              />
            </div>

            {lesson && (
              <div role="group" aria-label="Tipo de tiro" className="flex flex-wrap justify-center gap-2"
                onKeyDown={(event) => { if (event.code === "Space") event.stopPropagation(); }}>
                {([["direct", "Directo"], ["left", "Rebote ←"], ["right", "Rebote →"]] as const).map(([style, label]) => <button key={style} type="button" aria-pressed={shotStyle === style} disabled={!held || frozen} onClick={() => setShotStyle(style)} className="min-h-11 rounded-xl border border-violet-400 px-3 text-sm aria-pressed:bg-violet-700 disabled:opacity-50">{label}</button>)}
              </div>
            )}
            {lesson && (
              <button type="button" onClick={launch} disabled={!held || frozen}
                className="min-h-11 rounded-xl border-2 border-violet-300 bg-violet-600 px-6 font-bold text-white disabled:opacity-50">
                Lanzar la pelota
              </button>
            )}
            <HorizontalPad inline onLeft={moveLeft} onRight={moveRight} />
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {shownWin ? "🏆" : "🕳️"}
            </div>
            <h3 className="text-3xl font-bold text-violet-200">{shownWin ? "¡Muro derribado!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-orange-700 bg-orange-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Bloques acertados:</span>
                <strong className="text-violet-300">{shownCount}</strong>
              </div>
              {!lesson && <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-orange-300">+{starsThisRound} ★</strong>
              </div>}
              {bestScore != null && (
                <div className="flex justify-between border-t border-orange-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            {!lesson && <button type="button" onClick={start} className="rounded-xl bg-violet-600 px-8 py-3 font-bold text-white hover:bg-violet-500">
              Jugar de nuevo 🔄
            </button>}
          </div>
        )}
      </div>
    </div>
  );
}
