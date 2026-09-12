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
import { HorizontalPad } from "@/components/level/runtime/HorizontalPad";

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
 * dispara contra la columna que cree correcta, en cualquier momento,
 * mientras la oleada entera desciende junta (formación única, no enemigos
 * independientes — simplificación deliberada: sin física de proyectil real,
 * disparar resuelve la columna al instante, cero librería nueva).
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
}: {
  moduleId: string;
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
  onWin?: () => void;
  /** `undefined`/`null` = sin marca todavía (nunca se trata como 0). */
  bestScore?: number | null;
  /** Se llama al agotar las vidas o al ganar, con las oleadas acertadas. */
  onGameOver?: (correctCount: number) => void;
}) {
  const mod = getModule(moduleId)!;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [shipCol, setShipCol] = useState(CENTER_COL);
  const [waveRow, setWaveRow] = useState(0);
  const [lives, setLives] = useState(LIVES_START);
  const [problem, setProblem] = useState<Problem>(() => mod.generateProblem());
  const [candidates, setCandidates] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);

  const waveAccRef = useRef(0);
  const busyRef = useRef(false); // true mientras se espera onAnswer

  const wave = waveIndex(correctCount, WAVE_SIZE);
  const waveTickMs = scaleWithWave(WAVE_TICK_BASE_MS, WAVE_TICK_STEP_MS, wave, WAVE_TICK_FLOOR_MS);

  function spawnWave() {
    const nextProblem = mod.generateProblem();
    const spread = Math.max(8, COLS * 2);
    setProblem(nextProblem);
    setCandidates(choiceSet(nextProblem.answer, spread, COLS));
    setWaveRow(0);
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
    playSound("click", soundOn);
    setShipCol(CENTER_COL);
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    busyRef.current = false;
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

  function handleShoot() {
    if (busyRef.current || phase !== "playing") return;
    playSound("click", soundOn);
    const correct = candidates[shipCol] === problem.answer;
    resolveWave(correct);
  }

  useGameLoop(
    (dtMs) => {
      if (busyRef.current) return;
      waveAccRef.current += dtMs;
      if (waveAccRef.current < waveTickMs) return;
      waveAccRef.current -= waveTickMs;
      const nextRow = waveRow + 1;
      if (nextRow >= ROWS - 1) {
        resolveWave(false); // llegó abajo sin que la dispararan a tiempo
      } else {
        setWaveRow(nextRow);
      }
    },
    { running: phase === "playing" },
  );

  function moveLeft() {
    if (busyRef.current) return;
    setShipCol((c) => Math.max(0, c - 1));
  }
  function moveRight() {
    if (busyRef.current) return;
    setShipCol((c) => Math.min(COLS - 1, c + 1));
  }

  useArrowKeys({ left: moveLeft, right: moveRight, action: handleShoot }, { enabled: phase === "playing" });

  const goalProgressPct = Math.min(100, (correctCount / GOAL) * 100);
  const wavePct = Math.min(100, (waveRow / (ROWS - 1)) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-red-500 bg-slate-950 p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#f87171 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-red-300 to-indigo-400 bg-clip-text text-3xl font-extrabold text-transparent">
          👾 Invasión numérica
        </h2>
        <p className="mb-6 text-sm text-red-200">¡Apunta y dispara al resultado correcto antes de que aterrice!</p>

        {phase === "start" && (
          <div className="space-y-6 py-8">
            <div aria-hidden="true" className="animate-bounce text-6xl">
              👾
            </div>
            <button
              type="button"
              onClick={start}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-red-400 to-indigo-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-red-300">Usa las flechas (o los botones) para moverte, y espacio para disparar.</p>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Oleadas acertadas"
              aria-valuemin={0}
              aria-valuemax={GOAL}
              aria-valuenow={correctCount}
              aria-valuetext={`${correctCount} de ${GOAL} oleadas acertadas`}
              className="h-3 w-full overflow-hidden rounded-full bg-red-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-red-400 to-indigo-400 transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-red-700 bg-red-950/80 p-3 text-sm">
              <span aria-live="polite">
                <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-indigo-300">{starsThisRound}</strong>
              </span>
            </div>

            <div className="rounded-2xl border-2 border-indigo-400 bg-red-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-red-300">
                  {problem.flavor}
                </p>
              )}
              <p id={promptId} className="text-2xl font-black text-indigo-200 sm:text-3xl">
                {problem.prompt}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative mx-auto h-56 w-full max-w-sm overflow-hidden rounded-2xl border-2 border-red-700 bg-slate-900"
            >
              <div
                className={`${reducedMotion ? "" : "transition-all duration-150"} absolute inset-x-0 grid px-2`}
                style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, top: `${wavePct * 0.7}%` }}
              >
                {candidates.map((v, i) => (
                  <div
                    key={i}
                    className={`m-1 flex h-10 items-center justify-center rounded-md text-sm font-bold ${
                      shipCol === i ? "bg-indigo-600 text-white" : "bg-slate-800 text-indigo-200"
                    }`}
                  >
                    {v}
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 grid px-2 pb-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {Array.from({ length: COLS }, (_, i) => (
                  <div key={i} className="m-1 flex h-10 items-center justify-center text-2xl">
                    {shipCol === i ? "🚀" : ""}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleShoot}
              className="mx-auto hidden rounded-2xl bg-gradient-to-r from-red-500 to-indigo-600 px-8 py-3 font-bold text-white shadow-lg lg:block"
            >
              Disparar (espacio)
            </button>

            <HorizontalPad onLeft={moveLeft} onRight={moveRight} onAction={handleShoot} />
          </div>
        )}

        {phase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {win ? "🏆" : "💥"}
            </div>
            <h3 className="text-3xl font-bold text-indigo-200">{win ? "¡Invasión repelida!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-red-700 bg-red-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Oleadas acertadas:</span>
                <strong className="text-indigo-300">{correctCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-red-300">+{starsThisRound} ★</strong>
              </div>
              {bestScore != null && (
                <div className="flex justify-between border-t border-red-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            <button type="button" onClick={start} className="rounded-xl bg-indigo-600 px-8 py-3 font-bold text-white hover:bg-indigo-500">
              Jugar de nuevo 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
