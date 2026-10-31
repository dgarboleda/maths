"use client";

import { ArcadeIntro, ArcadeSprite } from "./ArcadeArt";
import { ArcadeFinalScore, ArcadeFxLayer, ArcadeScoreBar, useArcadeFx } from "./ArcadeFx";

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
import { TouchDPad } from "@/components/level/runtime/TouchDPad";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { lessonLabel, lessonValues, ReflexNotice, gamePromptSize } from "@/lib/minigames/lessonArcade";

const COLS = 5;
const CENTER_COL = Math.floor(COLS / 2);
const LIVES_START = 3;
const GOAL = 3; // estanques (checkpoints) a cruzar para ganar
const START_ROW = GOAL * 2; // fila segura de partida
const OBSTACLE_TICK_BASE_MS = 500;
const OBSTACLE_TICK_STEP_MS = -60;
const OBSTACLE_TICK_FLOOR_MS = 220;
/** En la clase el obstáculo va más lento: cruzar no debe depender de reflejos. */
const LESSON_OBSTACLE_TICK_MS = 900;
const HOP_POINTS = 20;
const NEAR_MISS_POINTS = 40;
const LILY_POINTS = 150;
/** Centro de cada fila del escenario (nenúfares, río, orilla), en %. */
const SCENE_ROW_Y = { lily: 17, river: 50, bank: 83 } as const;
const colX = (col: number) => ((col + 0.5) / COLS) * 100;

/** Qué pasó al chocar en la clase, dicho con precisión: no hubo respuesta. */
export const FROGGER_MISS =
  "Te alcanzó el obstáculo y volviste a la orilla: fue un choque, no una respuesta, así que no cuenta. Cruza el carril cuando el obstáculo esté lejos.";

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
  exercise,
}: {
  moduleId: string;
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
  onWin?: () => void;
  /** `undefined`/`null` = sin marca todavía (nunca se trata como 0). */
  bestScore?: number | null;
  /** Se llama al agotar las vidas o al ganar, con los estanques cruzados. */
  onGameOver?: (correctCount: number) => void;
  /** Modo clase: mismo estanque con obstáculo; llegar al nenúfar envía su
   *  valor y chocar no cuenta (ver `lessonArcade.tsx`). */
  exercise?: LessonExercise;
}) {
  const generateProblem = () =>
    exercise?.problem ?? getModule(moduleId)!.generateProblem();
  const goal = exercise ? 1 : GOAL;
  const startRow = goal * 2;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [row, setRow] = useState(startRow);
  const [frogX, setFrogX] = useState(CENTER_COL);
  const [lives, setLives] = useState(LIVES_START);
  const [legacyProblem, setProblem] = useState<Problem>(generateProblem);
  const problem = exercise?.problem ?? legacyProblem;
  const [candidates, setCandidates] = useState<number[]>([]);
  const [obstacleX, setObstacleX] = useState(COLS - 1);
  const [obstacleDirection, setObstacleDirection] = useState(-1);
  const [moving, setMoving] = useState(false);
  const [hopping, setHopping] = useState(false);
  const hopRef = useRef(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);
  const shownPhase = exercise?.solved ? "over" : phase;
  const controlsDisabled = Boolean(exercise?.disabled || exercise?.paused);
  const promptFocus = useArcadeFocus(shownPhase === "playing", controlsDisabled);
  const shownCount = exercise ? Number(exercise.solved) : correctCount;
  const shownWin = exercise ? exercise.solved : win;
  const [reflexMiss, setReflexMiss] = useState(false);
  const cabinetRef = useRef<HTMLDivElement>(null);
  const fx = useArcadeFx({ game: "frogger", soundOn, solved: exercise?.solved, cabinetRef });

  const obstacleDirRef = useRef(1);
  const accRef = useRef(0);
  const busyRef = useRef(false); // true mientras se espera onAnswer

  const wave = waveIndex(correctCount, 1);
  const obstacleTickMs = exercise
    ? LESSON_OBSTACLE_TICK_MS
    : scaleWithWave(OBSTACLE_TICK_BASE_MS, OBSTACLE_TICK_STEP_MS, wave, OBSTACLE_TICK_FLOOR_MS);

  function spawnCheckpoint(count = correctCount) {
    const nextProblem = generateProblem();
    const spread = Math.max(8, COLS * 2);
    setProblem(nextProblem);
    setCandidates(exercise ? lessonValues(exercise) : choiceSet(nextProblem.answer, spread, COLS));
    setObstacleX(count % 2 ? 0 : COLS - 1);
    obstacleDirRef.current = count % 2 ? 1 : -1;
    setObstacleDirection(count % 2 ? 1 : -1);
    accRef.current = 0;
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

  function start() {
    if (controlsDisabled) return;
    playSound("click", soundOn);
    setReflexMiss(false);
    setRow(startRow);
    setFrogX(CENTER_COL);
    setObstacleX(COLS - 1);
    setMoving(false);
    setHopping(false);
    hopRef.current = 0;
    obstacleDirRef.current = 1;
    accRef.current = 0;
    busyRef.current = false;
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    setPhase("playing");
    fx.start();
    spawnCheckpoint();
  }

  async function resolveCheckpoint(chosenX: number) {
    if (busyRef.current || controlsDisabled) return;
    busyRef.current = true;
    const at = { x: colX(chosenX), y: SCENE_ROW_Y.lily };
    if (exercise) {
      fx.pop("¡Splash!", at, "info");
      fx.burst(at, "info");
      setReflexMiss(false);
      try {
        // Se envía el valor del nenúfar: ni el resultado ni premios se deciden aquí.
        await exercise.onResponse(candidates[chosenX]);
        setRow(startRow);
      } finally {
        busyRef.current = false;
      }
      return;
    }
    const correct = candidates[chosenX] === problem.answer;
    playSound(correct ? "correct" : "wrong", soundOn);
    if (correct) fx.award(LILY_POINTS, at, { sound: "pop" });
    else fx.oops(at, "¡Glup!");
    const stars = await onAnswer(correct);
    if (correct) {
      const next = correctCount + 1;
      setStarsThisRound((s) => s + stars);
      setCorrectCount(next);
      if (next >= GOAL) {
        endGame(true, next);
        return;
      }
      spawnCheckpoint(next);
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
    hopRef.current = 0;
    setHopping(false);
    fx.oops({ x: colX(obstacleX), y: SCENE_ROW_Y.river }, "¡Ñac!");
    if (exercise) {
      // Chocar es un fallo de reflejos: sin vidas ni respuesta, vuelve a la orilla.
      setReflexMiss(true);
      setFrogX(CENTER_COL);
      setRow(startRow);
      return;
    }
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
    if (busyRef.current || controlsDisabled || shownPhase !== "playing" || hopRef.current > 0) return;
    const newRow = Math.max(0, row - 1);
    if (newRow === row) return;
    setReflexMiss(false);
    setMoving(true);
    hopRef.current = 180;
    setHopping(true);
    setRow(newRow);
    if (isObstacleRow(newRow)) {
      if (frogX === obstacleX) handleHit();
      else fx.award(HOP_POINTS, { x: colX(frogX), y: SCENE_ROW_Y.river }, { burst: false, sound: "pop" });
    } else if (isCheckpointRow(newRow)) {
      resolveCheckpoint(frogX);
    }
  }

  function handleDown() {
    if (busyRef.current || controlsDisabled || shownPhase !== "playing" || hopRef.current > 0) return;
    const newRow = Math.min(startRow, row + 1);
    if (newRow === row) return;
    setRow(newRow);
    setMoving(true);
    hopRef.current = 180;
    setHopping(true);
    if (isObstacleRow(newRow)) {
      if (frogX === obstacleX) handleHit();
    }
  }

  function handleLeft() {
    if (busyRef.current || controlsDisabled || shownPhase !== "playing" || hopRef.current > 0) return;
    const next = Math.max(0, frogX - 1);
    if (next === frogX) return;
    setFrogX(next);
    setMoving(true);
    hopRef.current = 180;
    setHopping(true);
    if (isObstacleRow(row) && next === obstacleX) handleHit();
  }
  function handleRight() {
    if (busyRef.current || controlsDisabled || shownPhase !== "playing" || hopRef.current > 0) return;
    const next = Math.min(COLS - 1, frogX + 1);
    if (next === frogX) return;
    setFrogX(next);
    setMoving(true);
    hopRef.current = 180;
    setHopping(true);
    if (isObstacleRow(row) && next === obstacleX) handleHit();
  }

  useGameLoop(
    (dtMs) => {
      if (busyRef.current) return;
      if (hopRef.current > 0) {
        hopRef.current = Math.max(0, hopRef.current - Math.min(dtMs, 50));
        if (hopRef.current === 0) setHopping(false);
      }
      if (!moving) return;
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
      setObstacleDirection(dir);
      setObstacleX(next);
      if (isObstacleRow(row) && next === frogX) handleHit();
      // Esquivar por una casilla: puntos de estilo, sin efecto en la pregunta.
      else if (isObstacleRow(row) && Math.abs(next - frogX) === 1 && Math.abs(obstacleX - frogX) === 2)
        fx.award(NEAR_MISS_POINTS, { x: colX(frogX), y: SCENE_ROW_Y.river - 18 }, { label: "¡Por poco!", tone: "bonus" });
    },
    { running: shownPhase === "playing" && !controlsDisabled },
  );

  useArrowKeys(
    { up: handleUp, down: handleDown, left: handleLeft, right: handleRight },
    { enabled: shownPhase === "playing" && !controlsDisabled },
  );

  function onTouchMove(dx: number, dy: number) {
    if (dx > 0) handleRight();
    else if (dx < 0) handleLeft();
    else if (dy > 0) handleDown();
    else if (dy < 0) handleUp();
  }

  const progressPct = Math.min(100, (shownCount / goal) * 100);
  const inObstacleRow = isObstacleRow(row);
  const nextObstacle = obstacleX + (obstacleX + obstacleDirection < 0 || obstacleX + obstacleDirection >= COLS ? -obstacleDirection : obstacleDirection);

  return (
    <div ref={cabinetRef} data-game="frogger" data-paused={Boolean(exercise?.paused || exercise?.disabled)} className={`arcade-cabinet relative overflow-hidden rounded-3xl border-4 border-sky-500 bg-slate-950 p-3 text-white shadow-2xl sm:p-6 ${controlsDisabled ? "arcade-paused" : ""}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#38bdf8 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <ArcadeFxLayer fx={fx} scope="cabinet" />
      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-lime-300 to-sky-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🐸 Estanque de operaciones
        </h2>
        <p className="mb-6 text-sm text-sky-200">
          ¡Cruza saltando al nenúfar con el resultado correcto!
        </p>

        {shownPhase === "start" && (
          <div className="space-y-6 py-8">
            <ArcadeIntro game="frogger" />
            <button
              type="button"
              onClick={start}
              disabled={controlsDisabled}
              className="arcade-start-pulse rounded-2xl border-2 border-white bg-gradient-to-r from-lime-400 to-sky-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-sky-300">
              Un toque, un salto. Observa el cocodrilo y cruza por el hueco. Esquivarlo por poco da puntos extra.{exercise && " Puedes leer con calma hasta tu primer salto. Chocar no cuenta como respuesta."}
            </p>
          </div>
        )}

        {shownPhase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Estanques cruzados"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={shownCount}
              aria-valuetext={`${shownCount} de ${goal} estanques cruzados`}
              className="h-3 w-full overflow-hidden rounded-full bg-sky-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-lime-400 to-sky-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <ArcadeScoreBar fx={fx} />
            {exercise ? <ReflexNotice show={reflexMiss} message={FROGGER_MISS} /> : <div className="flex items-center justify-between rounded-xl border border-sky-700 bg-sky-950/80 p-3 text-sm">
              <span aria-live="polite">
                <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
              </span>
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-lime-300">{starsThisRound}</strong>
              </span>
            </div>}

            <div className="rounded-2xl border-2 border-lime-400 bg-sky-900/40 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-sky-300">
                  {problem.flavor}
                </p>
              )}
              <p ref={promptFocus} tabIndex={-1} id={promptId} className={`${gamePromptSize(problem.prompt)} font-black text-lime-200 outline-none`}>
                {problem.prompt}
              </p>
            </div>

            <p aria-hidden="true" className="text-xs font-bold uppercase tracking-widest text-sky-300">
              {inObstacleRow ? "¡Esquiva el obstáculo!" : "Ponte bajo el nenúfar correcto y salta hacia arriba"}
            </p>

            {/* Tres filas a la vista: nenúfares (meta), carril con el
                obstáculo y orilla. La rana se dibuja en la fila donde está,
                para que nunca parezca parada sobre un nenúfar que no eligió. */}
            <div aria-hidden="true" data-board="" data-frog-col={frogX} data-frog-lane={inObstacleRow ? "carril" : "orilla"} data-hopping={hopping} data-obstacle-col={obstacleX} data-obstacle-next={nextObstacle}
              className="arcade-scene arcade-scene-pond relative mx-auto w-full max-w-sm space-y-2 overflow-hidden rounded-2xl border-2 border-sky-400/60 p-2">
              <div className="grid w-full max-w-sm gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {Array.from({ length: COLS }, (_, col) => (
                  <div key={col} data-lily="" className="arcade-hover arcade-value flex aspect-[4/3] items-center justify-center rounded-[40%] font-bold text-lime-50" style={{ animationDelay: `${-col * 0.3}s` }}>
                    {candidates[col] !== undefined && lessonLabel(exercise, candidates[col])}
                  </div>
                ))}
              </div>
              <div className="grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {Array.from({ length: COLS }, (_, col) => (
                  <div key={col} data-river-cell=""
                    className={`${reducedMotion ? "" : "transition-colors duration-150"} flex aspect-[4/3] items-center justify-center rounded-lg ${col === nextObstacle ? "ring-1 ring-inset ring-dashed ring-sky-200" : ""} ${col === obstacleX ? (inObstacleRow ? "bg-red-600" : "bg-red-900/60") : "bg-slate-800"}`}>
                    {col === obstacleX ? <span className="size-full" style={{ transform: obstacleDirection < 0 ? "scaleX(-1)" : undefined }}><ArcadeSprite kind="crocodile" className="size-full" /></span> : inObstacleRow && frogX === col ? <span className={hopping ? "arcade-hop size-10" : "size-10"}><ArcadeSprite kind="frog" className="size-full" /></span> : <span className="text-sky-200/80">{col === nextObstacle ? obstacleX > nextObstacle ? "←" : "→" : "≈"}</span>}
                  </div>
                ))}
              </div>
              <div className="grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {Array.from({ length: COLS }, (_, col) => (
                  <div key={col} data-bank-cell="" className="flex aspect-[4/3] items-center justify-center rounded-lg">
                    {!inObstacleRow && frogX === col && <span className={hopping ? "arcade-hop size-10" : "size-10"}><ArcadeSprite kind="frog" className="size-full" /></span>}
                  </div>
                ))}
              </div>
              <ArcadeFxLayer fx={fx} />
            </div>

            <p className="text-xs text-sky-100">La flecha marca el próximo paso del cocodrilo. Espera en la orilla para encontrar tu hueco.</p>
            <TouchDPad inline repeat={false} disabled={controlsDisabled} onMove={onTouchMove} />
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="arcade-win text-6xl">
              {shownWin ? "🐸🏆" : "💦"}
            </div>
            <h3 className="text-3xl font-bold text-lime-200">{shownWin ? "¡Cruzaste el estanque!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-sky-700 bg-sky-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Estanques cruzados:</span>
                <strong className="text-lime-300">{shownCount}</strong>
              </div>
              <ArcadeFinalScore fx={fx} />
              {!exercise && <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-sky-300">+{starsThisRound} ★</strong>
              </div>}
              {bestScore != null && (
                <div className="flex justify-between border-t border-sky-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            {!exercise && <button type="button" onClick={start} className="rounded-xl bg-sky-600 px-8 py-3 font-bold text-white hover:bg-sky-500">
              Jugar de nuevo 🔄
            </button>}
          </div>
        )}
      </div>
    </div>
  );
}
