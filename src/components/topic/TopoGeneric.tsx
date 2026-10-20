"use client";

import { ArcadeIntro, ArcadeSprite } from "./ArcadeArt";

import { useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { choiceSet, shuffle, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArcadeFocus } from "@/lib/minigames/useArcadeFocus";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { lessonArcadeState, lessonLabel, lessonValues, gamePromptSize } from "@/lib/minigames/lessonArcade";

const HOLES = 6; // 3 × 2
const CHOICES = 5;
const MAX_UP = 2; // topos visibles a la vez
const GOAL = 3;
const WAVE_SIZE = 1;
const LIVES_START = 3;
const POP_MS = 850; // tiempo entre un topo y el siguiente
const UP_BASE_MS = 2400;
const UP_STEP_MS = -200;
const UP_FLOOR_MS = 1400;
const LESSON_UP_MS = 2600;

type Phase = "start" | "playing" | "over";
type Mole = { value: number; until: number } | null;

const emptyHoles = (): Mole[] => Array.from({ length: HOLES }, () => null);

/**
 * Topos numéricos — mismo contrato que el resto de la serie retro
 * (docs/plan-minijuegos-retro.md). Primer juego que se responde solo
 * tocando: cada topo sale con un candidato y tocarlo es la respuesta, así
 * que en el móvil no hace falta cruceta. Los topos salen de una cola que
 * recorre todos los candidatos antes de repetir: la respuesta correcta
 * siempre vuelve a salir.
 *
 * Que un topo se esconda nunca es una respuesta. En los niveles, dejar
 * escapar el topo correcto cuesta una vida (ignorar la pregunta no es
 * gratis, igual que la oleada que aterriza en Invasión); en la clase no
 * pasa nada: vuelve a salir.
 */
export function TopoGeneric({
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
  /** Se llama al agotar las vidas o al ganar, con los aciertos. */
  onGameOver?: (correctCount: number) => void;
  /** Modo clase: solo tocar un topo envía una respuesta. */
  exercise?: LessonExercise;
}) {
  const newProblem = () => exercise?.problem ?? getModule(moduleId)!.generateProblem();
  const { lesson, frozen, solved } = lessonArcadeState(exercise);
  const goal = lesson ? 1 : GOAL;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [holes, setHoles] = useState<Mole[]>(emptyHoles);
  const [lives, setLives] = useState(LIVES_START);
  const [legacyProblem, setProblem] = useState<Problem>(newProblem);
  const problem = exercise?.problem ?? legacyProblem;
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);
  const [calm, setCalm] = useState(false);
  const [pending, setPending] = useState(false);

  const clockRef = useRef(0); // tiempo de juego, no de reloj: la pausa lo detiene
  const popAccRef = useRef(0);
  const candidatesRef = useRef<number[]>([]);
  const queueRef = useRef<number[]>([]);
  const busyRef = useRef(false); // true mientras se espera la respuesta

  const wave = waveIndex(correctCount, WAVE_SIZE);
  const upMs = lesson ? LESSON_UP_MS : scaleWithWave(UP_BASE_MS, UP_STEP_MS, wave, UP_FLOOR_MS);

  function spawnRound() {
    const nextProblem = newProblem();
    setProblem(nextProblem);
    candidatesRef.current = exercise ? lessonValues(exercise) : choiceSet(nextProblem.answer, Math.max(8, CHOICES * 2), CHOICES);
    queueRef.current = [];
    popAccRef.current = POP_MS; // el primer topo sale enseguida
    setHoles(calm ? batch(true) : emptyHoles());
  }

  function batch(withoutClock: boolean): Mole[] {
    const next = emptyHoles();
    for (const hole of shuffle([0, 1, 2, 3, 4, 5]).slice(0, MAX_UP)) {
      const value = nextValue(next);
      if (value !== undefined) next[hole] = { value, until: withoutClock ? Infinity : clockRef.current + upMs };
    }
    return next;
  }

  function changePace() {
    if (busyRef.current || frozen || solved) return;
    setCalm(!calm);
    setHoles(batch(!calm));
    popAccRef.current = 0;
  }

  function nextBatch() {
    if (busyRef.current || frozen || solved || !calm) return;
    setHoles(batch(true));
  }

  /** Siguiente candidato que no esté ya fuera; la cola se rellena barajada. */
  function nextValue(current: Mole[]): number | undefined {
    const up = new Set(current.flatMap((m) => (m ? [m.value] : [])));
    for (let tries = 0; tries < CHOICES * 2; tries++) {
      if (queueRef.current.length === 0) queueRef.current = shuffle(candidatesRef.current);
      const value = queueRef.current.shift();
      if (value === undefined) return undefined;
      if (!up.has(value)) return value;
      queueRef.current.push(value);
    }
    return undefined;
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
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    busyRef.current = false;
    setPending(false);
    clockRef.current = 0;
    setPhase("playing");
    spawnRound();
  }

  async function resolveRound(correct: boolean) {
    busyRef.current = true;
    setPending(true);
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
    } else {
      const remaining = lives - 1;
      setLives(remaining);
      if (remaining <= 0) {
        endGame(false, correctCount);
        return;
      }
    }
    spawnRound();
    busyRef.current = false;
    setPending(false);
  }

  async function whackLesson(value: number) {
    busyRef.current = true;
    setPending(true);
    try {
      // Se envía el topo tocado: el resultado lo decide el servidor.
      await exercise!.onResponse(value);
    } finally {
      spawnRound();
      busyRef.current = false;
      setPending(false);
    }
  }

  function whack(hole: number) {
    const mole = holes[hole];
    if (!mole || busyRef.current || frozen || solved || phase !== "playing") return;
    playSound("click", soundOn);
    if (lesson) void whackLesson(mole.value);
    else void resolveRound(mole.value === problem.answer);
  }

  useGameLoop(
    (dtMs) => {
      if (busyRef.current) return;
      clockRef.current += dtMs;
      popAccRef.current += dtMs;
      const now = clockRef.current;
      let next = holes;
      let escapedAnswer = false;
      if (next.some((m) => m && m.until <= now)) {
        next = next.map((m) => {
          if (!m || m.until > now) return m;
          if (m.value === problem.answer) escapedAnswer = true;
          return null;
        });
      }
      if (escapedAnswer && !lesson) {
        setHoles(next);
        void resolveRound(false);
        return;
      }
      if (popAccRef.current >= POP_MS && next.filter(Boolean).length < MAX_UP) {
        const value = nextValue(next);
        const free = shuffle(next.flatMap((m, i) => (m ? [] : [i])));
        if (value !== undefined && free.length > 0) {
          popAccRef.current = 0;
          next = next.map((m, i) => (i === free[0] ? { value, until: now + upMs } : m));
        }
      }
      if (next !== holes) setHoles(next);
    },
    { running: phase === "playing" && !frozen && !solved && !calm },
  );

  const shownPhase = solved ? "over" : phase;
  const promptFocus = useArcadeFocus(shownPhase === "playing");
  const shownCount = lesson ? Number(solved) : correctCount;
  const shownWin = lesson ? solved : win;
  const goalProgressPct = Math.min(100, (shownCount / goal) * 100);

  return (
    <div data-game="topos" data-paused={Boolean(exercise?.paused || exercise?.disabled)} className="arcade-cabinet relative overflow-hidden rounded-3xl border-4 border-amber-500 bg-slate-950 p-3 sm:p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#fbbf24 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-amber-300 to-lime-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🐹 Topos numéricos
        </h2>
        <p className="mb-6 text-sm text-amber-200">¡Toca el topo que lleva el resultado correcto!</p>

        {shownPhase === "start" && (
          <div className="space-y-6 py-8">
            <ArcadeIntro game="topos" />
            <button
              type="button"
              onClick={start}
              disabled={frozen}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-amber-400 to-lime-500 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-amber-300">
              Toca un topo (o usa Tab y Enter) para elegir su número.
              {lesson ? " Si un topo se esconde no pasa nada: volverá a salir." : " ¡No dejes escapar el correcto!"}
            </p>
          </div>
        )}

        {shownPhase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Topos atrapados"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={shownCount}
              aria-valuetext={`${shownCount} de ${goal} topos atrapados`}
              className="h-3 w-full overflow-hidden rounded-full bg-amber-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-lime-400 transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            {!lesson && (
              <div className="flex items-center justify-between rounded-xl border border-amber-700 bg-amber-950/80 p-3 text-sm">
                <span aria-live="polite">
                  <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-amber-300">{lives}</strong>
                </span>
                <span>
                  <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-lime-300">{starsThisRound}</strong>
                </span>
              </div>
            )}

            <div className="rounded-2xl border-2 border-lime-400 bg-amber-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-amber-300">
                  {problem.flavor}
                </p>
              )}
              <p ref={promptFocus} tabIndex={-1} id={promptId} className={`${gamePromptSize(problem.prompt)} font-black text-lime-200 outline-none`}>
                {problem.prompt}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" aria-pressed={calm} onClick={changePace} disabled={frozen || pending} className="arcade-option">Sin prisas</button>
              {calm && <button type="button" onClick={nextBatch} disabled={frozen || pending} className="arcade-option">Siguiente tanda</button>}
            </div>
            <p role="status" className="text-xs text-amber-100">{pending ? "Guardando el número elegido…" : calm ? "Los topos esperan. Cambia de tanda hasta ver el número que elegiste." : "Observa a los topos. Si necesitas leer sin reloj, activa «Sin prisas»."}</p>
            <div role="group" aria-labelledby={promptId} className="arcade-scene arcade-scene-meadow mx-auto grid max-w-sm grid-cols-3 gap-3 rounded-2xl border-2 border-amber-700 p-3">
              {holes.map((mole, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => whack(i)}
                  disabled={frozen || pending || !mole}
                  aria-label={mole ? `Topo con ${lessonLabel(exercise, mole.value)}` : "Agujero vacío"}
                  className="arcade-mole-hole relative flex h-28 touch-manipulation items-end justify-center overflow-hidden rounded-2xl pb-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300"
                >
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-1 h-5 rounded-[50%] bg-black/60" />
                  <span
                    aria-hidden="true"
                    className={`relative flex flex-col items-center ${reducedMotion ? "" : "transition-transform duration-150"} ${mole ? "translate-y-0" : "translate-y-24"}`}
                  >
                    <ArcadeSprite kind="mole" className="size-14" />
                    <span className="mt-1 rounded-md bg-lime-300 px-2 text-sm font-black text-slate-900">
                      {mole ? lessonLabel(exercise, mole.value) : ""}
                    </span>
                    {mole && !calm && <span key={mole.until} className="arcade-mole-clock mt-1 h-1 w-10 rounded-full bg-amber-200" style={{ animationDuration: `${upMs}ms` }} />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {shownWin ? "🏆" : "🕳️"}
            </div>
            <h3 className="text-3xl font-bold text-lime-200">{shownWin ? "¡Atrapaste al topo!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-amber-700 bg-amber-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Topos atrapados:</span>
                <strong className="text-lime-300">{shownCount}</strong>
              </div>
              {!lesson && (
                <div className="flex justify-between">
                  <span>Estrellas ganadas:</span>
                  <strong className="text-amber-300">+{starsThisRound} ★</strong>
                </div>
              )}
              {bestScore != null && (
                <div className="flex justify-between border-t border-amber-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            {!lesson && (
              <button type="button" onClick={start} className="rounded-xl bg-lime-600 px-8 py-3 font-bold text-white hover:bg-lime-500">
                Jugar de nuevo 🔄
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
