"use client";

import { ArcadeIntro, ArcadeSprite } from "./ArcadeArt";
import { ArcadeFinalScore, ArcadeFxLayer, ArcadeScoreBar, useArcadeFx } from "./ArcadeFx";

import { useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { useArcadeFocus } from "@/lib/minigames/useArcadeFocus";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import { HorizontalPad } from "@/components/level/runtime/HorizontalPad";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { useContinueArcade } from "@/lib/minigames/useContinueArcade";
import { lessonArcadeState, choiceLabel, arcadeValues, ChoiceText, PromptText, lessonValues, ReflexNotice, gamePromptSize } from "@/lib/minigames/lessonArcade";

const COLS = 5;
const CENTER_COL = Math.floor(COLS / 2);
const ROWS = 5; // filas visuales que baja la oleada antes de "aterrizar"
const GOAL = 3; // oleadas correctas para ganar
const WAVE_SIZE = 1;
const LIVES_START = 3;
const WAVE_TICK_BASE_MS = 900;
const WAVE_TICK_STEP_MS = -100;
const WAVE_TICK_FLOOR_MS = 400;
const HIT_POINTS = 200;
// Cápsulas de energía: caen por una columna y la nave las recoge al pasar
// debajo. Son solo puntos; no disparan ni responden nada.
const CAPSULE_POINTS = 30;
const CAPSULE_FALL_MS = 2400;
const CAPSULE_EVERY_MS = 1400;
const CAPSULE_PAINT_MS = 100;
const colX = (col: number) => ((col + 0.5) * 100) / COLS;

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
  const goal = lesson ? (exercise?.rounds ?? 1) : GOAL;
  const [reflexMiss, setReflexMiss] = useState(false);
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [shipCol, setShipCol] = useState(CENTER_COL);
  const [waveRow, setWaveRow] = useState(0);
  const wavePct = Math.min(100, (waveRow / (ROWS - 1)) * 100);
  const [lives, setLives] = useState(LIVES_START);
  const [shield, setShield] = useState(3);
  const [recovery, setRecovery] = useState(0);
  const [legacyProblem, setProblem] = useState<Problem>(newProblem);
  const problem = exercise?.problem ?? legacyProblem;
  const [candidates, setCandidates] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(0);
  const revealRef = useRef({ count: 0, elapsed: 0 });
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);
  const [moving, setMoving] = useState(false);
  const [shotCol, setShotCol] = useState<number | null>(null);
  const shotRef = useRef<{ value: number; elapsed: number } | null>(null);
  const shotEl = useRef<HTMLDivElement>(null);

  const cabinetRef = useRef<HTMLDivElement>(null);
  const fx = useArcadeFx({ game: "invaders", soundOn, solved: exercise?.solved, cabinetRef, session: exercise?.session });
  const [capsule, setCapsule] = useState<{ col: number; pct: number } | null>(null);
  const capsuleRef = useRef<{ col: number; elapsed: number; paint: number } | null>(null);
  const capsuleWaitRef = useRef(0);

  const waveAccRef = useRef(0);
  const busyRef = useRef(false); // true mientras se espera onAnswer

  const wave = Math.max(0, waveIndex(exercise?.round ?? correctCount, WAVE_SIZE) - recovery);
  const waveTickMs = scaleWithWave(WAVE_TICK_BASE_MS, WAVE_TICK_STEP_MS, wave, WAVE_TICK_FLOOR_MS);

  function spawnWave() {
    const nextProblem = newProblem();
    const spread = Math.max(8, COLS * 2);
    setProblem(nextProblem);
    setCandidates(exercise ? lessonValues(exercise) : arcadeValues(nextProblem, COLS, spread));
    revealRef.current = { count: lesson ? 1 : COLS, elapsed: 0 };
    setRevealed(lesson ? 1 : COLS);
    setWaveRow(0);
    setShotCol(null);
    setMoving(!lesson);
    waveAccRef.current = 0;
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
    setReflexMiss(false);
    setShipCol(CENTER_COL);
    setLives(LIVES_START);
    setShield(3);
    setRecovery(0);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    busyRef.current = false;
    shotRef.current = null;
    setShotCol(null);
    capsuleRef.current = null;
    capsuleWaitRef.current = 0;
    setCapsule(null);
    setPhase("playing");
    fx.start();
    spawnWave();
  }

  async function resolveWave(correct: boolean, col: number | null = null) {
    busyRef.current = true;
    playSound(correct ? "correct" : "wrong", soundOn);
    const at = { x: col === null ? 50 : colX(col), y: wavePct * 0.7 + 12 };
    if (correct) {
      fx.award(HIT_POINTS, at, { label: `¡Boom! +${HIT_POINTS}`, sound: "crash" });
      fx.shake(4);
    } else fx.oops(at, col === null ? "¡Aterrizaron!" : "✗");
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

  async function shootLesson(value: number, col: number) {
    busyRef.current = true;
    setReflexMiss(false);
    const at = { x: colX(col), y: wavePct * 0.7 + 12 };
    fx.pop("¡Impacto!", at, "info");
    fx.burst(at, "info");
    fx.shake(3);
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
    playSound("pop", soundOn);
    if (candidates[shipCol] === undefined || (lesson && shipCol >= revealed)) return;
    // La respuesta queda fijada al disparar; esperar al impacto nunca cambia
    // el valor elegido ni permite enviar dos respuestas por una pulsación.
    busyRef.current = true;
    shotRef.current = { value: candidates[shipCol], elapsed: 0 };
    setShotCol(shipCol);
  }

  function tickCapsule(dtMs: number) {
    const current = capsuleRef.current;
    if (!current) {
      capsuleWaitRef.current += dtMs;
      if (capsuleWaitRef.current < CAPSULE_EVERY_MS) return;
      capsuleWaitRef.current = 0;
      const col = Math.floor(Math.random() * COLS);
      capsuleRef.current = { col, elapsed: 0, paint: 0 };
      setCapsule({ col, pct: 0 });
      return;
    }
    current.elapsed += dtMs;
    current.paint += dtMs;
    if (current.elapsed >= CAPSULE_FALL_MS) {
      capsuleRef.current = null;
      setCapsule(null);
      if (current.col === shipCol) fx.award(CAPSULE_POINTS, { x: colX(current.col), y: 82 }, { tone: "bonus" });
      return;
    }
    if (current.paint >= CAPSULE_PAINT_MS) {
      current.paint %= CAPSULE_PAINT_MS;
      setCapsule({ col: current.col, pct: current.elapsed / CAPSULE_FALL_MS });
    }
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
          if (lesson) void shootLesson(shot.value, shotCol ?? shipCol);
          else void resolveWave(shot.value === problem.answer, shotCol ?? shipCol);
        }
        return;
      }
      if (busyRef.current) return;
      if (lesson && revealRef.current.count < candidates.length) {
        revealRef.current.elapsed += dtMs;
        if (revealRef.current.elapsed >= 650) {
          revealRef.current.elapsed -= 650;
          revealRef.current.count++;
          setRevealed(revealRef.current.count);
        }
        return;
      }
      if (!moving) return;
      tickCapsule(dtMs);
      waveAccRef.current += dtMs;
      if (waveAccRef.current < waveTickMs) return;
      waveAccRef.current -= waveTickMs;
      const nextRow = waveRow + 1;
      if (nextRow >= ROWS - 1) {
        if (lesson) {
          // Aterrizó sin disparo: fallo de reflejos, la oleada vuelve arriba.
          fx.oops({ x: 50, y: 60 }, "¡Aterrizaron!");
          if (shield <= 1) {
            setShield(3);
            setRecovery((level) => level + 1);
          } else setShield(shield - 1);
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
  const shownCount = lesson ? (exercise?.round ?? 0) + Number(solved) : correctCount;
  const shownWin = lesson ? solved : win;
  const goalProgressPct = Math.min(100, (shownCount / goal) * 100);

  return (
    <div ref={cabinetRef} data-game="invaders" data-paused={Boolean(exercise?.paused || exercise?.disabled)} className={`arcade-cabinet relative overflow-hidden rounded-3xl border-4 border-red-500 bg-slate-950 p-3 text-white shadow-2xl sm:p-6 ${frozen ? "arcade-paused" : ""}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#f87171 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <ArcadeFxLayer fx={fx} scope="cabinet" />
      <div className="relative z-10 mx-auto max-w-2xl text-center">
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
              className="arcade-start-pulse rounded-2xl border-2 border-white bg-gradient-to-r from-red-400 to-indigo-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
              <p className="text-xs text-red-300">Flechas para pilotar · espacio para disparar.{lesson && " Las naves aparecen poco a poco. La oleada espera a que aparezcan todas y a tu primer movimiento."}</p>
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

            <ArcadeScoreBar fx={fx} />
            {lesson ? <><p className="text-sm text-indigo-100" aria-live="polite">Escudo: {shield}/3{recovery > 0 ? " · velocidad reducida" : ""}</p><ReflexNotice show={reflexMiss} /></> : <div className="flex items-center justify-between rounded-xl border border-red-700 bg-red-950/80 p-3 text-sm">
              <span aria-live="polite">
                <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-indigo-300">{starsThisRound}</strong>
              </span>
            </div>}
            {lesson && !moving && !reflexMiss && <p className="text-sm text-indigo-200">Lee y apunta con calma. Tú inicias la acción.</p>}
            {lesson && revealed < candidates.length && <p role="status" className="text-sm text-indigo-200">Llegan las naves: {revealed} de {candidates.length} visibles.</p>}

            <div className="rounded-2xl border-2 border-indigo-400 bg-red-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-red-300">
                  {problem.flavor}
                </p>
              )}
              <p ref={promptFocus} tabIndex={-1} id={promptId} className={`${gamePromptSize(problem.prompt)} font-black text-indigo-200 outline-none`}>
                <PromptText problem={problem} />
              </p>
            </div>

            <div
              role="group" aria-label="Zona de invasión: elige un blanco y después dispara"
              data-invaders-board="" data-ship-col={shipCol} data-shot={shotCol !== null}
              className="arcade-scene arcade-stars relative mx-auto h-72 sm:h-96 w-full max-w-[min(100%,36rem,65vh)] overflow-hidden rounded-2xl border-2 border-indigo-400/60 bg-slate-900"
            >
              <div aria-hidden="true" className="absolute bottom-12 top-0 border-l border-dashed border-indigo-300/50" style={{ left: `${(shipCol + 0.5) * 100 / COLS}%` }} />
              <div
                className={`${reducedMotion ? "" : "transition-all duration-150"} absolute inset-x-0 grid px-2`}
                style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, top: `${wavePct * 0.7}%` }}
              >
                {candidates.map((v, i) => lesson && i >= revealed ? <span key={i} aria-hidden="true" className="m-0.5 h-20" /> : (
                  <button type="button" onClick={() => aimAt(i)} aria-label={`Apuntar a ${choiceLabel(problem, v)}`} aria-pressed={shipCol === i} disabled={frozen || shotCol !== null}
                    key={i}
                    className={`arcade-value m-0.5 flex h-20 touch-manipulation flex-col items-center justify-center rounded-xl border-2 font-bold ${
                      shipCol === i ? "border-indigo-200 bg-indigo-600 text-white shadow-lg shadow-indigo-500/40" : "border-red-400/40 bg-slate-800 text-indigo-200"
                    }`}
                    style={{ animationDelay: `${i * -0.2}s` }}
                  >
                    <span className="arcade-hover size-10" style={{ animationDelay: `${i * -0.2}s` }}><ArcadeSprite kind="alien" className="size-full" /></span>
                    <span data-choice-label=""><ChoiceText problem={problem} value={v} /></span>
                  </button>
                ))}
              </div>
              {capsule && (
                <div aria-hidden="true" data-capsule-col={capsule.col} className={`${reducedMotion ? "" : "transition-[top] duration-100 ease-linear"} arcade-bonus-item pointer-events-none absolute z-10 size-5 -translate-x-1/2 rounded-full border-2 border-yellow-100 bg-gradient-to-br from-yellow-200 to-amber-500 shadow-[0_0_14px_#facc15]`} style={{ left: `${colX(capsule.col)}%`, top: `${capsule.pct * 80}%` }} />
              )}
              {shotCol !== null && <div aria-hidden="true" ref={shotEl} className="pointer-events-none absolute h-8 w-1.5 -translate-x-1/2 rounded-full bg-cyan-100 shadow-[0_0_18px_5px_#67e8f9]" style={{ left: `${(shotCol + 0.5) * 100 / COLS}%`, bottom: "18%" }} />}
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 grid px-2 pb-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {Array.from({ length: COLS }, (_, i) => (
                  <div key={i} className="m-1 flex h-10 items-center justify-center text-2xl">
                    {shipCol === i && <ArcadeSprite kind="ship" className="size-12" />}
                  </div>
                ))}
              </div>
              <ArcadeFxLayer fx={fx} />
            </div>

            <button
              type="button"
              onClick={handleShoot}
              disabled={frozen || shotCol !== null}
              className="mx-auto hidden rounded-2xl bg-gradient-to-r from-red-500 to-indigo-600 px-8 py-3 font-bold text-white shadow-lg lg:block"
            >
              Disparar (espacio)
            </button>

            <p className="text-xs text-indigo-100">Toca un enemigo para apuntar. Solo disparar envía tu elección. Ponte bajo las cápsulas doradas para sumar puntos.</p>
            <HorizontalPad inline disabled={frozen || shotCol !== null} onLeft={moveLeft} onRight={moveRight} onAction={handleShoot} />
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="arcade-win text-6xl">
              {shownWin ? "🏆" : "💥"}
            </div>
            <h3 className="text-3xl font-bold text-indigo-200">{shownWin ? "¡Invasión repelida!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-red-700 bg-red-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Oleadas acertadas:</span>
                <strong className="text-indigo-300">{shownCount}</strong>
              </div>
              <ArcadeFinalScore fx={fx} />
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
