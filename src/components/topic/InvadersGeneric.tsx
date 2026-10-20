"use client";

import { ArcadeIntro, ArcadeSprite } from "./ArcadeArt";

import { useId, useRef, useState } from "react";
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
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { lessonArcadeState, lessonLabel, lessonValues, ReflexNotice, gamePromptSize } from "@/lib/minigames/lessonArcade";

const COLS = 5;
const CENTER_COL = Math.floor(COLS / 2);
const ROWS = 5; // filas visuales que baja la oleada antes de "aterrizar"
const GOAL = 3; // oleadas correctas para ganar
const WAVE_SIZE = 1;
const LIVES_START = 3;
const WAVE_TICK_BASE_MS = 900;
const WAVE_TICK_STEP_MS = -100;
const WAVE_TICK_FLOOR_MS = 400;

type Phase = "start" | "playing" | "over";

/**
 * Math Invaders — Fase 40 (docs/plan-minijuegos-retro.md). Mismo contrato
 * que el resto de la serie. Primer minijuego con disparo: a diferencia de
 * los anteriores, el jugador no "camina hacia" la respuesta — apunta y
 * dispara contra la columna que cree correcta. El rayo conserva esa
 * elección hasta el impacto y se congela al pausar. En la clase la oleada
 * espera el primer movimiento; los enemigos oscilan dentro de su columna,
 * sin mezclar los números mientras se apunta.
 *
 * Disparar la columna correcta → gana la oleada. Disparar una incorrecta →
 * pierde una vida. Dejar que la oleada llegue abajo sin disparar la
 * correcta también cuenta como fallo (evita que ignorar la pregunta sea
 * gratis) — en los tres casos, nunca termina la partida de inmediato, solo
 * agotar las vidas lo hace.
 */
export function InvadersGeneric({
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
  /** Se llama al agotar las vidas o al ganar, con las oleadas acertadas. */
  onGameOver?: (correctCount: number) => void;
  /** Modo clase: misma oleada; solo disparar envía una respuesta y que la
   *  oleada aterrice no cuenta (vuelve a empezar arriba). */
  exercise?: LessonExercise;
}) {
  const newProblem = () => exercise?.problem ?? getModule(moduleId)!.generateProblem();
  const { lesson, frozen, solved } = lessonArcadeState(exercise);
  const goal = lesson ? 1 : GOAL;
  const [reflexMiss, setReflexMiss] = useState(false);
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [shipCol, setShipCol] = useState(CENTER_COL);
  const [waveRow, setWaveRow] = useState(0);
  const [lives, setLives] = useState(LIVES_START);
  const [legacyProblem, setProblem] = useState<Problem>(newProblem);
  const problem = exercise?.problem ?? legacyProblem;
  const [candidates, setCandidates] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);
  const [moving, setMoving] = useState(false);
  const [shotCol, setShotCol] = useState<number | null>(null);
  const shotRef = useRef<{ value: number; elapsed: number } | null>(null);
  const shotEl = useRef<HTMLDivElement>(null);

  const waveAccRef = useRef(0);
  const busyRef = useRef(false); // true mientras se espera onAnswer

  const wave = waveIndex(correctCount, WAVE_SIZE);
  const waveTickMs = scaleWithWave(WAVE_TICK_BASE_MS, WAVE_TICK_STEP_MS, wave, WAVE_TICK_FLOOR_MS);

  function spawnWave() {
    const nextProblem = newProblem();
    const spread = Math.max(8, COLS * 2);
    setProblem(nextProblem);
    setCandidates(exercise ? lessonValues(exercise) : choiceSet(nextProblem.answer, spread, COLS));
    setWaveRow(0);
    setShotCol(null);
    setMoving(!lesson);
    waveAccRef.current = 0;
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
    setShipCol(CENTER_COL);
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    busyRef.current = false;
    shotRef.current = null;
    setShotCol(null);
    setPhase("playing");
    spawnWave();
  }

  async function resolveWave(correct: boolean) {
    busyRef.current = true;
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
      spawnWave();
      busyRef.current = false;
      return;
    }
    // Incorrecto (disparo errado, o la oleada llegó abajo sin resolver):
    // cuesta una vida, pero nunca termina la partida de inmediato.
    const remaining = lives - 1;
    setLives(remaining);
    if (remaining <= 0) {
      endGame(false, correctCount);
      return;
    }
    spawnWave();
    busyRef.current = false;
  }

  async function shootLesson(value: number) {
    busyRef.current = true;
    setReflexMiss(false);
    try {
      // Se envía la columna disparada: el resultado lo decide el servidor.
      await exercise!.onResponse(value);
    } finally {
      spawnWave();
      busyRef.current = false;
    }
  }

  function handleShoot() {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    playSound("click", soundOn);
    if (candidates[shipCol] === undefined) return;
    // La respuesta queda fijada al disparar; esperar al impacto nunca cambia
    // el valor elegido ni permite enviar dos respuestas por una pulsación.
    busyRef.current = true;
    shotRef.current = { value: candidates[shipCol], elapsed: 0 };
    setShotCol(shipCol);
  }

  useGameLoop(
    (dtMs) => {
      const shot = shotRef.current;
      if (shot) {
        shot.elapsed += Math.min(dtMs, 50);
        const travel = Math.min(1, shot.elapsed / 320);
        if (shotEl.current) shotEl.current.style.bottom = `${18 + travel * (68 - waveRow * 15)}%`;
        if (travel === 1) {
          shotRef.current = null;
          if (lesson) void shootLesson(shot.value);
          else void resolveWave(shot.value === problem.answer);
        }
        return;
      }
      if (busyRef.current) return;
      if (!moving) return;
      waveAccRef.current += dtMs;
      if (waveAccRef.current < waveTickMs) return;
      waveAccRef.current -= waveTickMs;
      const nextRow = waveRow + 1;
      if (nextRow >= ROWS - 1) {
        if (lesson) {
          // Aterrizó sin disparo: fallo de reflejos, la oleada vuelve arriba.
          playSound("wrong", soundOn);
          setReflexMiss(true);
          spawnWave();
        } else resolveWave(false); // llegó abajo sin que la dispararan a tiempo
      } else {
        setWaveRow(nextRow);
      }
    },
    { running: phase === "playing" && !frozen && !solved },
  );

  function moveLeft() {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    setShipCol((c) => Math.max(0, c - 1));
    setMoving(true);
  }
  function moveRight() {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    setShipCol((c) => Math.min(COLS - 1, c + 1));
    setMoving(true);
  }

  function aimAt(column: number) {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    setShipCol(column);
    setMoving(true);
  }

  useArrowKeys({ left: moveLeft, right: moveRight, action: handleShoot }, { enabled: phase === "playing" && !frozen && !solved });

  const shownPhase = solved ? "over" : phase;
  const promptFocus = useArcadeFocus(shownPhase === "playing", frozen);
  const shownCount = lesson ? Number(solved) : correctCount;
  const shownWin = lesson ? solved : win;
  const goalProgressPct = Math.min(100, (shownCount / goal) * 100);
  const wavePct = Math.min(100, (waveRow / (ROWS - 1)) * 100);

  return (
    <div data-game="invaders" data-paused={Boolean(exercise?.paused || exercise?.disabled)} className={`arcade-cabinet relative overflow-hidden rounded-3xl border-4 border-red-500 bg-slate-950 p-3 text-white shadow-2xl sm:p-6 ${frozen ? "arcade-paused" : ""}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#f87171 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-red-300 to-indigo-400 bg-clip-text text-3xl font-extrabold text-transparent">
          👾 Invasión numérica
        </h2>
        <p className="mb-4 text-sm text-red-200">¡Pilota tu nave, apunta y lanza un rayo al resultado correcto!</p>

        {shownPhase === "start" && (
          <div className="space-y-6 py-8">
            <ArcadeIntro game="invaders" />
            <button
              type="button"
              onClick={start}
              disabled={frozen}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-red-400 to-indigo-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-red-300">Flechas para pilotar · espacio para disparar.{lesson && " Lee con calma: la oleada espera tu primer movimiento. Si aterriza, puedes reintentar."}</p>
          </div>
        )}

        {shownPhase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Oleadas acertadas"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={shownCount}
              aria-valuetext={`${shownCount} de ${goal} oleadas acertadas`}
              className="h-3 w-full overflow-hidden rounded-full bg-red-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-red-400 to-indigo-400 transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            {lesson ? <ReflexNotice show={reflexMiss} /> : <div className="flex items-center justify-between rounded-xl border border-red-700 bg-red-950/80 p-3 text-sm">
              <span aria-live="polite">
                <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-indigo-300">{starsThisRound}</strong>
              </span>
            </div>}
            {lesson && !moving && !reflexMiss && <p className="text-sm text-indigo-200">Lee y apunta con calma. Tú inicias la acción.</p>}

            <div className="rounded-2xl border-2 border-indigo-400 bg-red-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-red-300">
                  {problem.flavor}
                </p>
              )}
              <p ref={promptFocus} tabIndex={-1} id={promptId} className={`${gamePromptSize(problem.prompt)} font-black text-indigo-200 outline-none`}>
                {problem.prompt}
              </p>
            </div>

            <div
              role="group" aria-label="Zona de invasión: elige un blanco y después dispara"
              data-invaders-board="" data-ship-col={shipCol} data-shot={shotCol !== null}
              className="arcade-scene arcade-stars relative mx-auto h-72 w-full max-w-sm overflow-hidden rounded-2xl border-2 border-indigo-400/60 bg-slate-900"
            >
              <div aria-hidden="true" className="absolute bottom-12 top-0 border-l border-dashed border-indigo-300/50" style={{ left: `${(shipCol + 0.5) * 100 / COLS}%` }} />
              <div
                className={`${reducedMotion ? "" : "transition-all duration-150"} absolute inset-x-0 grid px-2`}
                style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, top: `${wavePct * 0.7}%` }}
              >
                {candidates.map((v, i) => (
                  <button type="button" onClick={() => aimAt(i)} aria-label={`Apuntar a ${lessonLabel(exercise, v)}`} aria-pressed={shipCol === i} disabled={frozen || shotCol !== null}
                    key={i}
                    className={`arcade-value m-0.5 flex h-20 touch-manipulation flex-col items-center justify-center rounded-xl border-2 font-bold ${
                      shipCol === i ? "border-indigo-200 bg-indigo-600 text-white shadow-lg shadow-indigo-500/40" : "border-red-400/40 bg-slate-800 text-indigo-200"
                    }`}
                    style={{ animationDelay: `${i * -0.2}s` }}
                  >
                    <span className="arcade-hover size-10" style={{ animationDelay: `${i * -0.2}s` }}><ArcadeSprite kind="alien" className="size-full" /></span>
                    <span data-choice-label="">{lessonLabel(exercise, v)}</span>
                  </button>
                ))}
              </div>
              {shotCol !== null && <div aria-hidden="true" ref={shotEl} className="pointer-events-none absolute h-8 w-1.5 -translate-x-1/2 rounded-full bg-cyan-100 shadow-[0_0_18px_5px_#67e8f9]" style={{ left: `${(shotCol + 0.5) * 100 / COLS}%`, bottom: "18%" }} />}
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 grid px-2 pb-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {Array.from({ length: COLS }, (_, i) => (
                  <div key={i} className="m-1 flex h-10 items-center justify-center text-2xl">
                    {shipCol === i && <ArcadeSprite kind="ship" className="size-12" />}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleShoot}
              disabled={frozen || shotCol !== null}
              className="mx-auto hidden rounded-2xl bg-gradient-to-r from-red-500 to-indigo-600 px-8 py-3 font-bold text-white shadow-lg lg:block"
            >
              Disparar (espacio)
            </button>

            <p className="text-xs text-indigo-100">Toca un enemigo para apuntar. Solo disparar envía tu elección.</p>
            <HorizontalPad inline disabled={frozen || shotCol !== null} onLeft={moveLeft} onRight={moveRight} onAction={handleShoot} />
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {shownWin ? "🏆" : "💥"}
            </div>
            <h3 className="text-3xl font-bold text-indigo-200">{shownWin ? "¡Invasión repelida!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-red-700 bg-red-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Oleadas acertadas:</span>
                <strong className="text-indigo-300">{shownCount}</strong>
              </div>
              {!lesson && <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-red-300">+{starsThisRound} ★</strong>
              </div>}
              {bestScore != null && (
                <div className="flex justify-between border-t border-red-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            {!lesson && <button type="button" onClick={start} className="rounded-xl bg-indigo-600 px-8 py-3 font-bold text-white hover:bg-indigo-500">
              Jugar de nuevo 🔄
            </button>}
          </div>
        )}
      </div>
    </div>
  );
}
