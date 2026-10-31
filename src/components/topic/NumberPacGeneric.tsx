"use client";

import { ArcadeIntro, ArcadeSprite } from "./ArcadeArt";
import { ArcadeFinalScore, ArcadeFxLayer, ArcadeScoreBar, cellAt, useArcadeFx } from "./ArcadeFx";

import { useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { shuffle, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { useArcadeFocus } from "@/lib/minigames/useArcadeFocus";
import { MAZE_SIZE, mazeAmbushTarget, mazeWall, mazeChoiceCells, mazeShieldCell, nextMazeGhost, reachableMaze } from "@/lib/minigames/maze";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import { TouchDPad } from "@/components/level/runtime/TouchDPad";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { useContinueArcade } from "@/lib/minigames/useContinueArcade";
import { lessonArcadeState, arcadeValues, ChoiceText, PromptText, lessonValues, ReflexNotice, gamePromptSize } from "@/lib/minigames/lessonArcade";

const GRID_SIZE = MAZE_SIZE;
const GOAL = 3; // pellets correctos para ganar
const WAVE_SIZE = 1;
const LIVES_START = 3;
const GHOST_TICK_BASE_MS = 600;
const GHOST_TICK_STEP_MS = -80;
const GHOST_TICK_FLOOR_MS = 300;
const PELLET_COUNT_BASE = 3;
const PELLET_COUNT_STEP = 1;
const PELLET_COUNT_MAX = 5;
const INVULN_MS = 4000;
/** Nivel 4+: un segundo fantasma que embosca. Nivel 6+: escudo más corto. */
const SECOND_GHOST_LEVEL = 4;
const SHORT_SHIELD_LEVEL = 6;
const SHORT_SHIELD_MS = 2500;
// Puntos arcade: las migas del suelo, el escudo y atrapar al fantasma con
// escudo. Ninguno es una respuesta ni cambia las opciones del ejercicio.
const DOT_POINTS = 10;
const SHIELD_POINTS = 50;
const GHOST_POINTS = 200;
const ANSWER_POINTS = 150;

type Phase = "start" | "playing" | "over";
interface Cell {
  x: number;
  y: number;
}
interface Candidate extends Cell {
  value: number;
}

const START_CELL: Cell = { x: 0, y: 0 };
const GHOST_START: Cell = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
const GHOST2_START: Cell = { x: GRID_SIZE - 1, y: 0 };
interface Board {
  player: Cell;
  ghost: Cell;
  /** Segundo fantasma, solo desde el nivel 4. */
  ghost2: Cell | null;
  pellets: Candidate[];
  powerPellet: Cell | null;
}

function cellKey(c: Cell): string {
  return `${c.x},${c.y}`;
}

function pickFreeCells(occupied: Cell[], count = GRID_SIZE * GRID_SIZE): Cell[] {
  const taken = new Set(occupied.map(cellKey));
  const free: Cell[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!taken.has(`${x},${y}`) && !mazeWall({ x, y })) free.push({ x, y });
    }
  }
  return shuffle(free).slice(0, count);
}

/**
 * Number Pac — Fase 39 (docs/plan-minijuegos-retro.md). Mismo contrato que
 * el resto de la serie. Primer minijuego con una entidad autónoma
 * (fantasma) además del jugador — la velocidad del fantasma escala con la
 * dificultad, no su cantidad: un solo fantasma en v1 (simplificación
 * deliberada, igual criterio que otras fases de esta serie: menos piezas
 * moviéndose a la vez, más fácil de razonar y de jugar en pantallas chicas).
 *
 * **Simplificación deliberada de v1** (ya anotada en el plan): un único
 * `answer` correcto por ronda, no "varios pellets correctos a la vez" — como
 * "pirámide" en la Fase 33 de `plan-jugabilidad.md`, extender `Problem` con
 * múltiples respuestas válidas es una fase propia.
 *
 * A diferencia de Snake, comer un pellet incorrecto SÍ cuesta una vida
 * (nunca termina la partida de inmediato, solo agotar las vidas lo hace) —
 * la vida "extra" de Snake (crecer/no crecer) no tiene sentido acá, donde no
 * hay cuerpo que crezca.
 */
export function NumberPacGeneric({
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
  /** Se llama al agotar las vidas o al ganar, con los pellets acertados. */
  onGameOver?: (correctCount: number) => void;
  /** Modo clase: mismo laberinto y fantasma; solo comer un número envía una
   *  respuesta y que te alcance el fantasma no cuenta. */
  exercise?: LessonExercise;
}) {
  const newProblem = () => exercise?.problem ?? getModule(moduleId)!.generateProblem();
  const { lesson, frozen, solved } = lessonArcadeState(exercise);
  const goal = lesson ? (exercise?.rounds ?? 1) : GOAL;
  const [reflexMiss, setReflexMiss] = useState(false);
  // Cada pulsación da un paso. El fantasma espera el primer paso válido,
  // también al volver a empezar después de un choque o de una respuesta.
  const [awaitingInput, setAwaitingInput] = useState(true);
  const waiting = awaitingInput;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [board, setBoard] = useState<Board>({
    player: START_CELL, ghost: GHOST_START, ghost2: null, pellets: [], powerPellet: null,
  });
  // El teclado, los toques y el reloj comparten la posición más reciente,
  // incluso si llegan varios eventos antes del siguiente render de React.
  const boardRef = useRef(board);
  const { player, ghost, ghost2, pellets, powerPellet } = board;
  const [lives, setLives] = useState(LIVES_START);
  const [legacyProblem, setProblem] = useState<Problem>(newProblem);
  const problem = exercise?.problem ?? legacyProblem;
  const [invulnerable, setInvulnerable] = useState(false);
  const [shieldSeconds, setShieldSeconds] = useState(0);
  const [extraShield, setExtraShield] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);
  const [eatenDots, setEatenDotsState] = useState<ReadonlySet<string>>(() => new Set([cellKey(START_CELL)]));
  // Igual que `boardRef`: varias flechas pueden llegar antes del siguiente render.
  const dotsRef = useRef(eatenDots);
  function setEatenDots(next: ReadonlySet<string>) {
    dotsRef.current = next;
    setEatenDotsState(next);
  }
  const cabinetRef = useRef<HTMLDivElement>(null);
  const fx = useArcadeFx({ game: "numberpac", soundOn, solved, cabinetRef, session: exercise?.session });
  const at = (c: Cell) => cellAt(c.x, c.y, GRID_SIZE);

  const movingRef = useRef(false);
  const ghostAccRef = useRef(0);
  const invulnRemainingRef = useRef(0);
  const busyRef = useRef(false); // true mientras se espera onAnswer
  const bonusShieldRef = useRef(false);
  const lastDirRef = useRef<Cell>({ x: 1, y: 0 });

  const wave = waveIndex(exercise?.round ?? correctCount, WAVE_SIZE) + fx.boost;
  const shieldMs = fx.level >= SHORT_SHIELD_LEVEL ? SHORT_SHIELD_MS : INVULN_MS;
  const ghost2Start = () => (fx.level >= SECOND_GHOST_LEVEL ? GHOST2_START : null);
  const ghostTickMs = scaleWithWave(GHOST_TICK_BASE_MS, GHOST_TICK_STEP_MS, wave, GHOST_TICK_FLOOR_MS);
  const pelletCount = Math.round(scaleWithWave(PELLET_COUNT_BASE, PELLET_COUNT_STEP, wave, PELLET_COUNT_MAX));

  function updateBoard(patch: Partial<Board>) {
    const next = { ...boardRef.current, ...patch };
    boardRef.current = next;
    setBoard(next);
  }

  function waitForMove() {
    movingRef.current = false;
    ghostAccRef.current = 0;
    setAwaitingInput(true);
  }

  function spawnRound(currentPlayer: Cell, currentGhost: Cell) {
    const nextProblem = newProblem();
    const spread = Math.max(8, pelletCount * 2);
    const values = exercise ? lessonValues(exercise) : arcadeValues(nextProblem, pelletCount, spread);
    const free = pickFreeCells([START_CELL, currentPlayer, currentGhost, ...(boardRef.current.ghost2 ? [boardRef.current.ghost2] : [])]);
    const cells = mazeChoiceCells(currentPlayer, free, values.length);
    const reachable = reachableMaze(currentPlayer, [...cells, currentGhost]);
    const power = free.find((cell) => reachable.has(cellKey(cell)) && !cells.some((number) => cellKey(cell) === cellKey(number)));
    setProblem(nextProblem);
    updateBoard({
      pellets: cells.slice(0, values.length).map((c, i) => ({ ...c, value: values[i] })),
      powerPellet: power ?? null,
    });
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
    waitForMove();
    invulnRemainingRef.current = 0;
    setShieldSeconds(0);
    setBlocked(false);
    busyRef.current = false;
    bonusShieldRef.current = false;
    setExtraShield(false);
    updateBoard({ player: START_CELL, ghost: GHOST_START, ghost2: ghost2Start() });
    setInvulnerable(false);
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    setEatenDots(new Set([cellKey(START_CELL)]));
    setPhase("playing");
    fx.start();
    spawnRound(START_CELL, GHOST_START);
  }

  function handleGhostHit() {
    if (invulnRemainingRef.current > 0) return;
    fx.hit(at(boardRef.current.player), "¡Bu!");
    if (lesson) {
      // Fallo de reflejos: sin vidas ni respuesta, solo el respiro de siempre.
      setReflexMiss(true);
      waitForMove();
      updateBoard({ player: START_CELL, ghost: GHOST_START, ghost2: ghost2Start() });
      return;
    }
    const remaining = lives - 1;
    setLives(remaining);
    if (remaining <= 0) {
      endGame(false, correctCount);
      return;
    }
    waitForMove();
    updateBoard({ player: START_CELL, ghost: GHOST_START, ghost2: ghost2Start() }); // respiro tras el golpe
  }

  async function resolvePellet(eaten: Candidate, atCell: Cell, ghostAt: Cell) {
    busyRef.current = true;
    updateBoard({ pellets: [] });
    waitForMove();
    setReflexMiss(false);
    if (exercise) {
      fx.pop("¡Elegido!", at(eaten), "info");
      fx.burst(at(eaten), "info");
      try {
        await exercise.onResponse(eaten.value);
      } finally {
        spawnRound(atCell, ghostAt);
        busyRef.current = false;
      }
      return;
    }
    const correct = eaten.value === problem.answer;
    playSound(correct ? "correct" : "wrong", soundOn);
    if (correct) fx.award(ANSWER_POINTS, at(eaten), { sound: "pop" });
    else fx.oops(at(eaten), "✗");
    const stars = await onAnswer(correct);
    if (correct) {
      const next = correctCount + 1;
      setStarsThisRound((s) => s + stars);
      setCorrectCount(next);
      if (next >= GOAL) {
        endGame(true, next);
        return;
      }
      spawnRound(atCell, ghostAt);
      busyRef.current = false;
      return;
    }
    // Incorrecto: cuesta una vida (a diferencia de Snake) pero nunca termina
    // la partida de inmediato — solo agotar las vidas lo hace.
    const remaining = lives - 1;
    setLives(remaining);
    if (remaining <= 0) {
      endGame(false, correctCount);
      return;
    }
    spawnRound(atCell, ghostAt);
    busyRef.current = false;
  }

  function stepPlayer(direction: Cell) {
    if (phase !== "playing" || frozen || solved || busyRef.current) return;
    const current = boardRef.current;
    const newCell = { x: current.player.x + direction.x, y: current.player.y + direction.y };
    if (mazeWall(newCell)) { setBlocked(true); return; }
    setBlocked(false);
    lastDirRef.current = direction;
    movingRef.current = true;
    setAwaitingInput(false);
    updateBoard({ player: newCell });
    if (!dotsRef.current.has(cellKey(newCell))) {
      setEatenDots(new Set(dotsRef.current).add(cellKey(newCell)));
      fx.award(DOT_POINTS, at(newCell), { burst: false, sound: "pop" });
    }

    // Una recompensa por explorar, disponible una vez por ronda después de
    // usar el primer escudo. Nunca bloquea ni obliga a recoger una respuesta.
    if (exercise && (exercise.round ?? 0) > 0 && !bonusShieldRef.current &&
        !current.powerPellet && dotsRef.current.size >= 6) {
      const available = pickFreeCells([newCell, current.ghost, ...current.pellets]);
      const extra = mazeShieldCell(newCell, current.ghost, current.pellets, available);
      if (extra) {
        bonusShieldRef.current = true;
        setExtraShield(true);
        updateBoard({ powerPellet: extra });
        fx.banner("¡Nuevo escudo!", "bonus");
      }
    }

    if (current.powerPellet && cellKey(newCell) === cellKey(current.powerPellet)) {
      updateBoard({ powerPellet: null });
      setExtraShield(false);
      invulnRemainingRef.current = shieldMs;
      setInvulnerable(true);
      setShieldSeconds(Math.ceil(shieldMs / 1000));
      fx.award(SHIELD_POINTS, at(newCell), { label: "¡Escudo!", tone: "info", sound: "combo" });
    }
    if (cellKey(newCell) === cellKey(current.ghost)) {
      if (invulnRemainingRef.current <= 0) {
        handleGhostHit();
        return;
      }
      catchGhost(newCell);
    }
    if (current.ghost2 && cellKey(newCell) === cellKey(current.ghost2)) {
      if (invulnRemainingRef.current <= 0) {
        handleGhostHit();
        return;
      }
      catchGhost(newCell, true);
    }
    const eaten = current.pellets.find((p) => cellKey(p) === cellKey(newCell));
    if (eaten) void resolvePellet(eaten, newCell, current.ghost);
  }

  /** Con escudo, alcanzar al fantasma lo devuelve a su casa y da puntos. */
  function catchGhost(where: Cell, second = false) {
    fx.award(GHOST_POINTS, at(where), { label: `¡Atrapado! +${GHOST_POINTS}`, tone: "bonus", sound: "combo" });
    fx.shake(4);
    updateBoard(second ? { ghost2: GHOST2_START } : { ghost: GHOST_START });
  }

  // Persigue por los pasillos. El escudo permite invertir la persecución.
  function stepGhost() {
    const current = boardRef.current;
    const frightened = invulnRemainingRef.current > 0;
    const next = nextMazeGhost(current.ghost, current.player, frightened);
    // El segundo fantasma embosca: apunta por delante del jugador.
    const next2 = current.ghost2 && nextMazeGhost(current.ghost2, frightened ? current.player : mazeAmbushTarget(current.player, lastDirRef.current), frightened);
    updateBoard({ ghost: next, ghost2: next2 });
    if (cellKey(next) === cellKey(current.player)) {
      if (frightened) catchGhost(next);
      else return handleGhostHit();
    }
    if (next2 && cellKey(next2) === cellKey(current.player)) {
      if (frightened) catchGhost(next2, true);
      else handleGhostHit();
    }
  }

  useGameLoop(
    (dtMs) => {
      if (busyRef.current || !movingRef.current) return;
      if (invulnRemainingRef.current > 0) {
        const previousSeconds = Math.ceil(invulnRemainingRef.current / 1000);
        invulnRemainingRef.current -= dtMs;
        if (invulnRemainingRef.current <= 0) {
          invulnRemainingRef.current = 0;
          setInvulnerable(false);
        }
        const seconds = Math.ceil(invulnRemainingRef.current / 1000);
        if (seconds !== previousSeconds) setShieldSeconds(seconds);
      }

      ghostAccRef.current += dtMs;
      if (ghostAccRef.current >= ghostTickMs) {
        ghostAccRef.current -= ghostTickMs;
        stepGhost();
      }
    },
    { running: phase === "playing" && !frozen && !solved && !waiting },
  );

  useArrowKeys(
    {
      up: () => stepPlayer({ x: 0, y: -1 }),
      down: () => stepPlayer({ x: 0, y: 1 }),
      left: () => stepPlayer({ x: -1, y: 0 }),
      right: () => stepPlayer({ x: 1, y: 0 }),
    },
    { enabled: phase === "playing" && !frozen && !solved },
  );

  function onTouchMove(dx: number, dy: number) {
    if (dx !== 0) stepPlayer({ x: Math.sign(dx), y: 0 });
    else if (dy !== 0) stepPlayer({ x: 0, y: Math.sign(dy) });
  }

  const shownPhase = solved ? "over" : phase;
  const promptFocus = useArcadeFocus(shownPhase === "playing", frozen);
  const shownCount = lesson ? (exercise?.round ?? 0) + Number(solved) : correctCount;
  const shownWin = lesson ? solved : win;
  const progressPct = Math.min(100, (shownCount / goal) * 100);

  return (
    <div ref={cabinetRef} data-game="numberpac" data-paused={Boolean(exercise?.paused || exercise?.disabled)} className="arcade-cabinet relative overflow-hidden rounded-3xl border-4 border-yellow-500 bg-slate-950 p-3 sm:p-6 text-white shadow-2xl">
      {exercise?.controls}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#fde047 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <ArcadeFxLayer fx={fx} scope="cabinet" />
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="mb-2 bg-gradient-to-r from-yellow-300 to-fuchsia-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🟡 Laberinto de números
        </h2>
        <p className="mb-4 text-sm text-yellow-200">¡Rodea las paredes, busca el escudo y recoge tu respuesta!</p>

        {shownPhase === "start" && (
          <div className="space-y-6 py-8">
            <ArcadeIntro game="numberpac" />
            <button
              type="button"
              onClick={start}
              disabled={frozen}
              className="arcade-start-pulse rounded-2xl border-2 border-white bg-gradient-to-r from-yellow-400 to-fuchsia-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-yellow-300">Cada pulsación de una flecha mueve un casillero. El fantasma empieza con tu primer paso.{lesson && " Que te alcance no cuenta como respuesta."}</p>
          </div>
        )}

        {shownPhase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Pellets acertados"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={shownCount}
              aria-valuetext={`${shownCount} de ${goal} pellets acertados`}
              className="h-3 w-full overflow-hidden rounded-full bg-yellow-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-fuchsia-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <ArcadeScoreBar fx={fx} />
            {extraShield && <p role="status" className="text-sm text-fuchsia-200">Ha aparecido un escudo extra. Puedes recogerlo sin pasar por una respuesta.</p>}
            {lesson ? (
              // Sin vidas ni estrellas en la clase: solo avisos, sin recuadro vacío.
              <div className="flex items-center justify-between gap-2 text-sm">
                <ReflexNotice show={reflexMiss} waiting={waiting} />
                {invulnerable && (
                  <span role="status" className="font-bold text-fuchsia-300">
                    <span aria-hidden="true">◇ </span>Escudo · {shieldSeconds}s
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-yellow-700 bg-yellow-950/80 p-3 text-sm">
                <span aria-live="polite">
                  <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
                </span>
                {invulnerable && (
                  <span role="status" className="font-bold text-fuchsia-300">
                    <span aria-hidden="true">◇ </span>Escudo · {shieldSeconds}s
                  </span>
                )}
                <span>
                  <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-yellow-300">{starsThisRound}</strong>
                </span>
              </div>
            )}

            <div className="rounded-2xl border-2 border-fuchsia-400 bg-yellow-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-yellow-300">
                  {problem.flavor}
                </p>
              )}
              <p ref={promptFocus} tabIndex={-1} id={promptId} className={`${gamePromptSize(problem.prompt)} font-black text-fuchsia-200 outline-none`}>
                <PromptText problem={problem} />
              </p>
            </div>

            <div
              aria-hidden="true"
              data-numberpac-board=""
              data-shield={invulnerable}
              data-player-x={player.x} data-player-y={player.y}
              data-ghost-x={ghost.x} data-ghost-y={ghost.y}
              className="arcade-scene arcade-scene-maze relative mx-auto grid aspect-square w-full max-w-[min(100%,36rem,65vh)] overflow-hidden rounded-2xl border-2 border-yellow-700"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
                const x = index % GRID_SIZE, y = Math.floor(index / GRID_SIZE);
                const pellet = pellets.find((p) => p.x === x && p.y === y);
                return (
                  <div key={index} data-cell-x={x} data-cell-y={y} data-value={pellet?.value} data-wall={mazeWall({ x, y }) || undefined} data-power={powerPellet?.x === x && powerPellet.y === y || undefined} className={`relative min-h-0 min-w-0 ${mazeWall({ x, y }) ? "arcade-maze-wall" : eatenDots.has(`${x},${y}`) ? "" : "arcade-maze-floor"}`}>
                    {pellet && (
                      <span className={`arcade-value absolute inset-[8%] z-20 flex justify-center rounded-xl border-2 border-amber-300 bg-amber-950 font-bold text-amber-100 shadow-lg ${ghost.x === x && ghost.y === y ? "items-end pb-1" : "items-center"}`}>
                        <ChoiceText problem={problem} value={pellet.value} />
                      </span>
                    )}
                    {powerPellet?.x === x && powerPellet.y === y && (
                      <span className="absolute inset-[18%] z-10 flex items-center justify-center rounded-full border-2 border-cyan-200 bg-cyan-700 text-2xl font-black text-white shadow-[0_0_16px_#22d3ee80]">◇</span>
                    )}
                    {player.x === x && player.y === y && (
                      <span className={`absolute inset-[8%] z-10 flex items-center justify-center rounded-full ${invulnerable ? "ring-4 ring-cyan-200" : ""}`}><ArcadeSprite kind="explorer" className="size-full" /></span>
                    )}
                    {ghost2 && ghost2.x === x && ghost2.y === y && (
                      <span data-ghost2="" className={`absolute flex items-center justify-center ${pellet ? "bottom-0 left-0 z-30 size-[45%] rounded-full bg-rose-950" : "inset-[8%] z-10"} ${invulnerable ? "opacity-40" : ""}`} style={{ filter: "hue-rotate(140deg) saturate(1.6)" }}><ArcadeSprite kind="ghost" className="size-full" /></span>
                    )}
                    {ghost.x === x && ghost.y === y && (
                      <span className={`${reducedMotion ? "" : "transition-colors duration-150"} absolute flex items-center justify-center ${pellet ? "right-0 top-0 z-30 size-[45%] rounded-full bg-violet-950" : "inset-[8%] z-10"} ${invulnerable ? "opacity-40" : ""}`}><ArcadeSprite kind="ghost" className="size-full" /></span>
                    )}
                  </div>
                );
              })}
              <ArcadeFxLayer fx={fx} />
            </div>

            <p role="status" className="text-xs text-cyan-100">{blocked ? "Hay una pared. Busca otro camino." : `◇ Escudo: ${ghost2 ? "los fantasmas huyen" : "el fantasma huye"} ${Math.round(shieldMs / 100) / 10} segundos y, si lo alcanzas, vuelve a su casa. Recoge las migas para sumar puntos.${ghost2 ? " El fantasma rosa se adelanta a tus pasos." : ""}`}</p>
            <TouchDPad inline repeat={false} disabled={frozen || solved} onMove={onTouchMove} />
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="arcade-win text-6xl">
              {shownWin ? "🏆" : "👻"}
            </div>
            <h3 className="text-3xl font-bold text-fuchsia-200">{shownWin ? "¡Laberinto resuelto!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-yellow-700 bg-yellow-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Pellets acertados:</span>
                <strong className="text-yellow-300">{shownCount}</strong>
              </div>
              <ArcadeFinalScore fx={fx} />
              {!lesson && <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-fuchsia-300">+{starsThisRound} ★</strong>
              </div>}
              {bestScore != null && (
                <div className="flex justify-between border-t border-yellow-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            {!lesson && <button type="button" onClick={start} className="rounded-xl bg-fuchsia-600 px-8 py-3 font-bold text-white hover:bg-fuchsia-500">
              Jugar de nuevo 🔄
            </button>}
          </div>
        )}
      </div>
    </div>
  );
}
