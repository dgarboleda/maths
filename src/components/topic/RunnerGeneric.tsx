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

const LANES = 3;
const CENTER_LANE = 1;
const LIVES_START = 3;
const GOAL = 3; // puertas a cruzar para ganar
const GATE_TIME_BASE_MS = 2500;
const GATE_TIME_STEP_MS = -250;
const GATE_TIME_FLOOR_MS = 900;

type Phase = "start" | "playing" | "over";

/**
 * Equation Runner — Fase 38 (docs/plan-minijuegos-retro.md). Mismo contrato
 * que `CoheteGeneric`/`SnakeGeneric`/`FroggerGeneric`. Avance automático
 * continuo (primer minijuego de esta serie donde `useGameLoop` mueve algo
 * más que un obstáculo decorativo: la cuenta regresiva hasta la próxima
 * puerta) — el jugador solo elige el carril, nunca detiene el avance.
 *
 * A diferencia de Frogger, acá NO hay un obstáculo aparte: la única
 * consecuencia posible es cruzar la puerta en el carril correcto o
 * incorrecto. Un carril incorrecto cuesta una vida directamente (no hay
 * "retroceso" posible en un runner de avance forzado) pero NUNCA termina la
 * partida de inmediato — sólo agotar las vidas lo hace, mismo criterio que
 * el resto de la serie.
 */
export function RunnerGeneric({
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
  /** Se llama al agotar las vidas o al ganar, con las puertas cruzadas. */
  onGameOver?: (correctCount: number) => void;
}) {
  const mod = getModule(moduleId)!;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [lane, setLane] = useState(CENTER_LANE);
  const [lives, setLives] = useState(LIVES_START);
  const [problem, setProblem] = useState<Problem>(() => mod.generateProblem());
  const [candidates, setCandidates] = useState<number[]>([]);
  const [remainingMs, setRemainingMs] = useState(GATE_TIME_BASE_MS);
  const [gateTotalMs, setGateTotalMs] = useState(GATE_TIME_BASE_MS);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);

  // Cuenta regresiva "caliente": autoridad real de cuándo llega la próxima
  // puerta. Un `requestAnimationFrame` puede disparar muchos ticks dentro de
  // una sola tanda antes de que React vuelva a renderizar (y con eso,
  // refresque el cierre que lee `remainingMs` de estado) — igual motivo que
  // `accRef` en `SnakeGeneric`/`FroggerGeneric`: si la resta viviera en
  // estado, cada tick de esa tanda restaría desde el MISMO valor de partida
  // en vez de acumular, y la cuenta casi no avanzaría. `remainingMs`/
  // `gateTotalMs` (estado) siguen existiendo solo para pintar la barra de
  // progreso — cambian con tan poca frecuencia (una vez por tick para
  // `remainingMs`, una vez por ronda para `gateTotalMs`) que leerlos de
  // estado en el render no repite el problema.
  const remainingRef = useRef(GATE_TIME_BASE_MS);
  const busyRef = useRef(false); // true mientras se espera onAnswer

  function spawnGate(countForWave: number) {
    const nextProblem = mod.generateProblem();
    const spread = Math.max(8, LANES * 2);
    setProblem(nextProblem);
    setCandidates(choiceSet(nextProblem.answer, spread, LANES));
    const wave = waveIndex(countForWave, 1);
    const total = scaleWithWave(GATE_TIME_BASE_MS, GATE_TIME_STEP_MS, wave, GATE_TIME_FLOOR_MS);
    setGateTotalMs(total);
    remainingRef.current = total;
    setRemainingMs(total);
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
    setLane(CENTER_LANE);
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    busyRef.current = false;
    setPhase("playing");
    spawnGate(0);
  }

  async function resolveGate() {
    busyRef.current = true;
    const correct = candidates[lane] === problem.answer;
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
      spawnGate(next);
      busyRef.current = false;
      return;
    }
    // Incorrecto: cuesta una vida, pero la carrera sigue — la próxima puerta
    // aparece igual, sin detener el avance ni terminar la partida de golpe.
    const remaining = lives - 1;
    setLives(remaining);
    if (remaining <= 0) {
      endGame(false, correctCount);
      return;
    }
    spawnGate(correctCount);
    busyRef.current = false;
  }

  useGameLoop(
    (dtMs) => {
      if (busyRef.current) return;
      remainingRef.current -= dtMs;
      if (remainingRef.current <= 0) {
        resolveGate();
      } else {
        setRemainingMs(remainingRef.current);
      }
    },
    { running: phase === "playing" },
  );

  function moveLaneUp() {
    if (busyRef.current) return;
    setLane((l) => Math.max(0, l - 1));
  }
  function moveLaneDown() {
    if (busyRef.current) return;
    setLane((l) => Math.min(LANES - 1, l + 1));
  }

  useArrowKeys({ up: moveLaneUp, down: moveLaneDown }, { enabled: phase === "playing" });

  function onTouchMove(dx: number, dy: number) {
    if (dy < 0 || dx < 0) moveLaneUp();
    else if (dy > 0 || dx > 0) moveLaneDown();
  }

  const goalProgressPct = Math.min(100, (correctCount / GOAL) * 100);
  const gateApproachPct = Math.min(100, ((gateTotalMs - remainingMs) / gateTotalMs) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-amber-500 bg-slate-950 p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#fbbf24 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🏃 Autopista de resultados
        </h2>
        <p className="mb-6 text-sm text-amber-200">¡Cambia de carril para cruzar la puerta con el resultado correcto!</p>

        {phase === "start" && (
          <div className="space-y-6 py-8">
            <div aria-hidden="true" className="animate-bounce text-6xl">
              🏃
            </div>
            <button
              type="button"
              onClick={start}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-amber-400 to-orange-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-amber-300">Usa las flechas arriba/abajo (o los botones) para cambiar de carril.</p>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Puertas cruzadas"
              aria-valuemin={0}
              aria-valuemax={GOAL}
              aria-valuenow={correctCount}
              aria-valuetext={`${correctCount} de ${GOAL} puertas cruzadas`}
              className="h-3 w-full overflow-hidden rounded-full bg-amber-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-amber-700 bg-amber-950/80 p-3 text-sm">
              <span aria-live="polite">
                <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-amber-300">{starsThisRound}</strong>
              </span>
            </div>

            <div className="rounded-2xl border-2 border-orange-400 bg-amber-900/40 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-amber-300">
                  {problem.flavor}
                </p>
              )}
              <p id={promptId} className="text-2xl font-black text-orange-200 sm:text-3xl">
                {problem.prompt}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
              title="Distancia a la próxima puerta"
            >
              <div
                className={`${reducedMotion ? "" : "transition-all duration-150"} h-2 rounded-full bg-red-500`}
                style={{ width: `${gateApproachPct}%` }}
              />
            </div>

            <div aria-hidden="true" className="mx-auto flex w-full max-w-sm flex-col gap-1">
              {Array.from({ length: LANES }, (_, row) => (
                <div
                  key={row}
                  className={`${reducedMotion ? "" : "transition-colors duration-150"} flex h-12 items-center justify-between rounded-lg border px-4 font-bold ${
                    lane === row ? "border-amber-300 bg-amber-800/60 text-amber-100" : "border-slate-700 bg-slate-900 text-slate-400"
                  }`}
                >
                  <span>{lane === row ? "🏃" : ""}</span>
                  <span className="text-lg">{candidates[row]}</span>
                </div>
              ))}
            </div>

            <TouchDPad onMove={onTouchMove} />
          </div>
        )}

        {phase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {win ? "🏁" : "🛑"}
            </div>
            <h3 className="text-3xl font-bold text-orange-200">{win ? "¡Llegaste a la meta!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-amber-700 bg-amber-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Puertas cruzadas:</span>
                <strong className="text-amber-300">{correctCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-orange-300">+{starsThisRound} ★</strong>
              </div>
              {bestScore != null && (
                <div className="flex justify-between border-t border-amber-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            <button type="button" onClick={start} className="rounded-xl bg-orange-600 px-8 py-3 font-bold text-white hover:bg-orange-500">
              Jugar de nuevo 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
