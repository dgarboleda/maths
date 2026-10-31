"use client";

import { ArcadeIntro, ArcadeSprite } from "./ArcadeArt";
import { ArcadeFinalScore, ArcadeFxLayer, ArcadeScoreBar, useArcadeFx, type FxAt } from "./ArcadeFx";

import { useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { shuffle, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArcadeFocus } from "@/lib/minigames/useArcadeFocus";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { useContinueArcade } from "@/lib/minigames/useContinueArcade";
import { lessonArcadeState, choiceLabel, arcadeValues, ChoiceText, PromptText, lessonValues, gamePromptSize } from "@/lib/minigames/lessonArcade";

const HOLES = 6; // 3 × 2
const CHOICES = 5;
const MAX_UP = 2; // topos visibles a la vez
/** Nivel 3+: topo bomba sin número (tocarlo cuesta un corazón). Nivel 5+:
 *  hasta tres topos a la vez y apariciones más cortas. «Sin prisas» no cambia. */
const BOMB_LEVEL = 3;
const BUSY_LEVEL = 5;
const BOMB_EVERY_MS = 2600;
const BOMB_UP_MS = 1500;
const GOAL = 3;
const WAVE_SIZE = 1;
const LIVES_START = 3;
const POP_MS = 850; // tiempo entre un topo y el siguiente
const UP_BASE_MS = 2400;
const UP_STEP_MS = -200;
const UP_FLOOR_MS = 1400;
const LESSON_UP_MS = 2600;
const WHACK_POINTS = 200;
// Topo dorado: sale de vez en cuando sin número. Atraparlo solo da puntos;
// no es una respuesta y no aparece con «Sin prisas».
const GOLD_POINTS = 80;
const GOLD_EVERY_MS = 3600;
const GOLD_UP_MS = 1300;

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
  const goal = lesson ? (exercise?.rounds ?? 1) : GOAL;
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
  const [gold, setGold] = useState<number | null>(null);
  const goldRef = useRef<{ hole: number; until: number } | null>(null);
  const goldAccRef = useRef(0);
  const [bomb, setBomb] = useState<number | null>(null);
  const bombRef = useRef<{ hole: number; until: number } | null>(null);
  const bombAccRef = useRef(0);
  const cabinetRef = useRef<HTMLDivElement>(null);
  const fx = useArcadeFx({ game: "topos", soundOn, solved, cabinetRef, session: exercise?.session });
  /** Centro aproximado de cada agujero en la pradera de 3 × 2. */
  const holeAt = (hole: number): FxAt => ({ x: ((hole % 3) + 0.5) * (100 / 3), y: Math.floor(hole / 3) === 0 ? 30 : 75 });

  const clockRef = useRef(0); // tiempo de juego, no de reloj: la pausa lo detiene
  const popAccRef = useRef(0);
  const candidatesRef = useRef<number[]>([]);
  const queueRef = useRef<number[]>([]);
  const busyRef = useRef(false); // true mientras se espera la respuesta

  const wave = waveIndex(correctCount, WAVE_SIZE);
  const lessonWave = (exercise?.round ?? 0) + fx.boost;
  const busy = fx.level >= BUSY_LEVEL;
  const upMs = lesson ? scaleWithWave(LESSON_UP_MS, -150, lessonWave, busy ? 1600 : 2000) : scaleWithWave(UP_BASE_MS, UP_STEP_MS, wave + fx.boost, UP_FLOOR_MS);
  const popMs = lesson ? scaleWithWave(POP_MS, -60, lessonWave, busy ? 420 : 550) : POP_MS;
  const maxUp = busy ? MAX_UP + 1 : MAX_UP;

  function spawnRound() {
    const nextProblem = newProblem();
    setProblem(nextProblem);
    candidatesRef.current = exercise ? lessonValues(exercise) : arcadeValues(nextProblem, CHOICES, Math.max(8, CHOICES * 2));
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
    fx.end(didWin);
    playSound(didWin ? "fanfare" : "fail", soundOn);
    onGameOver?.(finalCount);
    if (didWin) {
      triggerConfetti("medium");
      onWin?.();
    }
  }

  useContinueArcade(exercise, start);

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
    goldRef.current = null;
    goldAccRef.current = 0;
    setGold(null);
    bombRef.current = null;
    bombAccRef.current = 0;
    setBomb(null);
    setPhase("playing");
    fx.start();
    spawnRound();
  }

  async function resolveRound(correct: boolean, hole: number | null = null) {
    busyRef.current = true;
    setPending(true);
    playSound(correct ? "correct" : "wrong", soundOn);
    const at = hole === null ? { x: 50, y: 50 } : holeAt(hole);
    if (correct) fx.award(WHACK_POINTS, at, { label: `¡Pum! +${WHACK_POINTS}`, sound: "pop" });
    else fx.oops(at, hole === null ? "¡Se escapó!" : "✗");
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

  async function whackLesson(value: number, hole: number) {
    busyRef.current = true;
    setPending(true);
    fx.pop("¡Pum!", holeAt(hole), "info");
    fx.burst(holeAt(hole), "info");
    fx.shake(3);
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
    playSound("pop", soundOn);
    if (lesson) void whackLesson(mole.value, hole);
    else void resolveRound(mole.value === problem.answer, hole);
  }

  function whackGold(hole: number) {
    if (goldRef.current?.hole !== hole || busyRef.current || frozen || solved || phase !== "playing") return;
    goldRef.current = null;
    setGold(null);
    fx.award(GOLD_POINTS, holeAt(hole), { tone: "bonus", label: `¡Dorado! +${GOLD_POINTS}` });
  }

  /** El topo bomba no lleva número: tocarlo es un fallo de reflejos. */
  function whackBomb(hole: number) {
    if (bombRef.current?.hole !== hole || busyRef.current || frozen || solved || phase !== "playing") return;
    bombRef.current = null;
    setBomb(null);
    fx.hit(holeAt(hole), "¡Bum!");
  }

  function tickBomb(dtMs: number, now: number, current: Mole[]) {
    if (fx.level < BOMB_LEVEL) return;
    const shown = bombRef.current;
    if (shown) {
      if (shown.until <= now || current[shown.hole]) {
        bombRef.current = null;
        setBomb(null);
      }
      return;
    }
    bombAccRef.current += dtMs;
    if (bombAccRef.current < BOMB_EVERY_MS) return;
    const free = shuffle(current.flatMap((m, i) => (m || goldRef.current?.hole === i ? [] : [i])));
    if (free.length === 0) return;
    bombAccRef.current = 0;
    bombRef.current = { hole: free[free.length - 1], until: now + BOMB_UP_MS };
    setBomb(free[free.length - 1]);
  }

  /** Aparece y se esconde el topo dorado en un agujero libre. */
  function tickGold(dtMs: number, now: number, current: Mole[]) {
    const shown = goldRef.current;
    if (shown) {
      if (shown.until <= now || current[shown.hole]) {
        goldRef.current = null;
        setGold(null);
      }
      return;
    }
    goldAccRef.current += dtMs;
    if (goldAccRef.current < GOLD_EVERY_MS) return;
    const free = shuffle(current.flatMap((m, i) => (m || bombRef.current?.hole === i ? [] : [i])));
    if (free.length === 0) return;
    goldAccRef.current = 0;
    goldRef.current = { hole: free[0], until: now + GOLD_UP_MS };
    setGold(free[0]);
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
      tickGold(dtMs, now, next);
      tickBomb(dtMs, now, next);
      if (escapedAnswer && !lesson) {
        setHoles(next);
        void resolveRound(false);
        return;
      }
      if (popAccRef.current >= popMs && next.filter(Boolean).length < maxUp) {
        const value = nextValue(next);
        const free = shuffle(next.flatMap((m, i) => (m || goldRef.current?.hole === i || bombRef.current?.hole === i ? [] : [i])));
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
  const promptFocus = useArcadeFocus(shownPhase === "playing", frozen);
  const shownCount = lesson ? (exercise?.round ?? 0) + Number(solved) : correctCount;
  const shownWin = lesson ? solved : win;
  const goalProgressPct = Math.min(100, (shownCount / goal) * 100);

  return (
    <div ref={cabinetRef} data-game="topos" data-paused={Boolean(exercise?.paused || exercise?.disabled)} className="arcade-cabinet relative overflow-hidden rounded-3xl border-4 border-amber-500 bg-slate-950 p-3 sm:p-6 text-white shadow-2xl">
      {exercise?.controls}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#fbbf24 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <ArcadeFxLayer fx={fx} scope="cabinet" />
      <div className="relative z-10 mx-auto max-w-2xl text-center">
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
              className="arcade-start-pulse rounded-2xl border-2 border-white bg-gradient-to-r from-amber-400 to-lime-500 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-amber-300">
              Toca un topo (o usa Tab y Enter) para elegir su número. El topo dorado no tiene número: atrápalo para sumar puntos.
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

            <ArcadeScoreBar fx={fx} />
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
                <PromptText problem={problem} />
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" aria-pressed={calm} onClick={changePace} disabled={frozen || pending} className="arcade-option">Sin prisas</button>
              {calm && <button type="button" onClick={nextBatch} disabled={frozen || pending} className="arcade-option">Siguiente tanda</button>}
            </div>
            <p role="status" className="text-xs text-amber-100">{pending ? "Guardando el número elegido…" : calm ? "Los topos esperan. Cambia de tanda hasta ver el número que elegiste." : "Observa a los topos. Si necesitas leer sin reloj, activa «Sin prisas»."}</p>
            <div role="group" aria-labelledby={promptId} className="arcade-scene arcade-scene-meadow relative mx-auto grid max-w-[min(100%,36rem,65vh)] grid-cols-3 gap-3 rounded-2xl border-2 border-amber-700 p-3">
              {holes.map((mole, i) => !mole && bomb === i && !calm ? (
                <button key={i} type="button" onClick={() => whackBomb(i)} disabled={frozen || pending}
                  aria-label="Topo bomba: no lo toques, no es una respuesta" data-bomb=""
                  className="arcade-mole-hole relative flex h-28 touch-manipulation items-end justify-center overflow-hidden rounded-2xl pb-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-300">
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-1 h-5 rounded-[50%] bg-black/60" />
                  <span aria-hidden="true" className="arcade-hazard arcade-hazard-pulse relative flex flex-col items-center" style={{ filter: "grayscale(0.6) brightness(0.8) drop-shadow(0 0 8px #f43f5e)" }}>
                    <ArcadeSprite kind="mole" className="size-14" />
                    <span className="mt-1 rounded-md bg-rose-500 px-2 text-sm font-black text-white">💣</span>
                  </span>
                </button>
              ) : !mole && gold === i && !calm ? (
                <button key={i} type="button" onClick={() => whackGold(i)} disabled={frozen || pending}
                  aria-label="Topo dorado: puntos extra, no es una respuesta"
                  className="arcade-mole-hole relative flex h-28 touch-manipulation items-end justify-center overflow-hidden rounded-2xl pb-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300">
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-1 h-5 rounded-[50%] bg-black/60" />
                  <span aria-hidden="true" className="arcade-bonus-item relative flex flex-col items-center" style={{ filter: "sepia(1) saturate(4) brightness(1.15) drop-shadow(0 0 8px #facc15)" }}>
                    <ArcadeSprite kind="mole" className="size-14" />
                    <span className="mt-1 rounded-md bg-yellow-300 px-2 text-sm font-black text-slate-900">★</span>
                  </span>
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => whack(i)}
                  disabled={frozen || pending || !mole}
                  aria-label={mole ? `Topo con ${choiceLabel(problem, mole.value)}` : "Agujero vacío"}
                  className="arcade-mole-hole relative flex h-28 touch-manipulation items-end justify-center overflow-hidden rounded-2xl pb-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300"
                >
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-1 h-5 rounded-[50%] bg-black/60" />
                  <span
                    aria-hidden="true"
                    className={`relative flex flex-col items-center ${reducedMotion ? "" : "transition-transform duration-150"} ${mole ? "translate-y-0" : "translate-y-24"}`}
                  >
                    <ArcadeSprite kind="mole" className="size-14" />
                    <span className="mt-1 rounded-md bg-lime-300 px-2 text-sm font-black text-slate-900">
                      {mole ? <ChoiceText problem={problem} value={mole.value} /> : ""}
                    </span>
                    {mole && !calm && <span key={mole.until} className="arcade-mole-clock mt-1 h-1 w-10 rounded-full bg-amber-200" style={{ animationDuration: `${upMs}ms` }} />}
                  </span>
                </button>
              ))}
              <ArcadeFxLayer fx={fx} />
            </div>
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="arcade-win text-6xl">
              {shownWin ? "🏆" : "🕳️"}
            </div>
            <h3 className="text-3xl font-bold text-lime-200">{shownWin ? "¡Atrapaste al topo!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-amber-700 bg-amber-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Topos atrapados:</span>
                <strong className="text-lime-300">{shownCount}</strong>
              </div>
              <ArcadeFinalScore fx={fx} />
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
