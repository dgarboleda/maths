"use client";

import { useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { choiceSet, shuffle, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { prefersReducedMotion } from "@/lib/motion";
import { useGameLoop } from "@/lib/minigames/useGameLoop";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { scaleWithWave, waveIndex } from "@/lib/minigames/difficultyCurve";
import { TouchDPad } from "@/components/level/runtime/TouchDPad";

const GRID_SIZE = 5;
const GOAL = 3; // pellets correctos para ganar
const WAVE_SIZE = 1;
const LIVES_START = 3;
const PLAYER_TICK_MS = 350;
const GHOST_TICK_BASE_MS = 600;
const GHOST_TICK_STEP_MS = -80;
const GHOST_TICK_FLOOR_MS = 300;
const PELLET_COUNT_BASE = 3;
const PELLET_COUNT_STEP = 1;
const PELLET_COUNT_MAX = 5;
const INVULN_MS = 4000;

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
// El fantasma rebota solo en su propio eje horizontal (mismo criterio que el
// obstáculo de Frogger, Fase 37) — queda confinado a su fila de siempre, no
// explora el resto de la grilla. Elección deliberada, no una limitación: un
// patrón simple y predecible es más justo para un niño que un fantasma con
// IA de persecución, y mantiene la partida jugable sin física nueva.
const GHOST_INITIAL_DIR: Cell = { x: -1, y: 0 };

function cellKey(c: Cell): string {
  return `${c.x},${c.y}`;
}

function pickFreeCells(occupied: Cell[], count: number): Cell[] {
  const taken = new Set(occupied.map(cellKey));
  const free: Cell[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
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
}: {
  moduleId: string;
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
  onWin?: () => void;
  /** `undefined`/`null` = sin marca todavía (nunca se trata como 0). */
  bestScore?: number | null;
  /** Se llama al agotar las vidas o al ganar, con los pellets acertados. */
  onGameOver?: (correctCount: number) => void;
}) {
  const mod = getModule(moduleId)!;
  const promptId = useId();
  const reducedMotion = prefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("start");
  const [player, setPlayer] = useState<Cell>(START_CELL);
  const [ghost, setGhost] = useState<Cell>(GHOST_START);
  const [lives, setLives] = useState(LIVES_START);
  const [problem, setProblem] = useState<Problem>(() => mod.generateProblem());
  const [pellets, setPellets] = useState<Candidate[]>([]);
  const [powerPellet, setPowerPellet] = useState<Cell | null>(null);
  const [invulnerable, setInvulnerable] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);

  const dirRef = useRef<Cell>({ x: 1, y: 0 });
  const ghostDirRef = useRef<Cell>(GHOST_INITIAL_DIR);
  const playerAccRef = useRef(0);
  const ghostAccRef = useRef(0);
  const invulnRemainingRef = useRef(0);
  const busyRef = useRef(false); // true mientras se espera onAnswer

  const wave = waveIndex(correctCount, WAVE_SIZE);
  const ghostTickMs = scaleWithWave(GHOST_TICK_BASE_MS, GHOST_TICK_STEP_MS, wave, GHOST_TICK_FLOOR_MS);
  const pelletCount = Math.round(scaleWithWave(PELLET_COUNT_BASE, PELLET_COUNT_STEP, wave, PELLET_COUNT_MAX));

  function spawnRound(currentPlayer: Cell, currentGhost: Cell) {
    const nextProblem = mod.generateProblem();
    const spread = Math.max(8, pelletCount * 2);
    const values = choiceSet(nextProblem.answer, spread, pelletCount);
    const cells = pickFreeCells([currentPlayer, currentGhost], values.length + 1);
    setProblem(nextProblem);
    setPellets(cells.slice(0, values.length).map((c, i) => ({ ...c, value: values[i] })));
    setPowerPellet(cells[values.length] ?? null);
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
    dirRef.current = { x: 1, y: 0 };
    ghostDirRef.current = GHOST_INITIAL_DIR;
    playerAccRef.current = 0;
    ghostAccRef.current = 0;
    invulnRemainingRef.current = 0;
    busyRef.current = false;
    setPlayer(START_CELL);
    setGhost(GHOST_START);
    setInvulnerable(false);
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    setPhase("playing");
    spawnRound(START_CELL, GHOST_START);
  }

  function handleGhostHit() {
    if (invulnRemainingRef.current > 0) return;
    playSound("wrong", soundOn);
    const remaining = lives - 1;
    setLives(remaining);
    if (remaining <= 0) {
      endGame(false, correctCount);
      return;
    }
    setPlayer(START_CELL); // respiro: aleja al jugador del fantasma tras el golpe
  }

  async function resolvePellet(eaten: Candidate, atCell: Cell, ghostAt: Cell) {
    busyRef.current = true;
    setPellets([]);
    const correct = eaten.value === problem.answer;
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

  function stepPlayer() {
    const newCell = { x: player.x + dirRef.current.x, y: player.y + dirRef.current.y };
    if (newCell.x < 0 || newCell.x >= GRID_SIZE || newCell.y < 0 || newCell.y >= GRID_SIZE) return; // pared: no se mueve, no muere
    setPlayer(newCell);

    if (powerPellet && newCell.x === powerPellet.x && newCell.y === powerPellet.y) {
      setPowerPellet(null);
      invulnRemainingRef.current = INVULN_MS;
      setInvulnerable(true);
    }
    const eaten = pellets.find((p) => p.x === newCell.x && p.y === newCell.y);
    if (eaten) {
      resolvePellet(eaten, newCell, ghost);
      return;
    }
    if (newCell.x === ghost.x && newCell.y === ghost.y) handleGhostHit();
  }

  function stepGhost() {
    let dir = ghostDirRef.current;
    let next = { x: ghost.x + dir.x, y: ghost.y + dir.y };
    if (next.x < 0 || next.x >= GRID_SIZE || next.y < 0 || next.y >= GRID_SIZE) {
      dir = { x: -dir.x, y: -dir.y };
      ghostDirRef.current = dir;
      next = { x: ghost.x + dir.x, y: ghost.y + dir.y };
    }
    setGhost(next);
    if (next.x === player.x && next.y === player.y) handleGhostHit();
  }

  useGameLoop(
    (dtMs) => {
      if (invulnRemainingRef.current > 0) {
        invulnRemainingRef.current -= dtMs;
        if (invulnRemainingRef.current <= 0) {
          invulnRemainingRef.current = 0;
          setInvulnerable(false);
        }
      }

      if (!busyRef.current) {
        playerAccRef.current += dtMs;
        if (playerAccRef.current >= PLAYER_TICK_MS) {
          playerAccRef.current -= PLAYER_TICK_MS;
          stepPlayer();
        }
      }

      ghostAccRef.current += dtMs;
      if (ghostAccRef.current >= ghostTickMs) {
        ghostAccRef.current -= ghostTickMs;
        stepGhost();
      }
    },
    { running: phase === "playing" },
  );

  function trySetDirection(next: Cell) {
    dirRef.current = next;
  }

  useArrowKeys(
    {
      up: () => trySetDirection({ x: 0, y: -1 }),
      down: () => trySetDirection({ x: 0, y: 1 }),
      left: () => trySetDirection({ x: -1, y: 0 }),
      right: () => trySetDirection({ x: 1, y: 0 }),
    },
    { enabled: phase === "playing" },
  );

  function onTouchMove(dx: number, dy: number) {
    if (dx !== 0) trySetDirection({ x: Math.sign(dx), y: 0 });
    else if (dy !== 0) trySetDirection({ x: 0, y: Math.sign(dy) });
  }

  const progressPct = Math.min(100, (correctCount / GOAL) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-yellow-500 bg-slate-950 p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#fde047 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-yellow-300 to-fuchsia-400 bg-clip-text text-3xl font-extrabold text-transparent">
          🟡 Laberinto de números
        </h2>
        <p className="mb-6 text-sm text-yellow-200">¡Recoge el número que resuelve la operación y esquiva al fantasma!</p>

        {phase === "start" && (
          <div className="space-y-6 py-8">
            <div aria-hidden="true" className="animate-bounce text-6xl">
              🟡
            </div>
            <button
              type="button"
              onClick={start}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-yellow-400 to-fuchsia-600 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-yellow-300">Usa las flechas del teclado (o los botones) para moverte.</p>
          </div>
        )}

        {phase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Pellets acertados"
              aria-valuemin={0}
              aria-valuemax={GOAL}
              aria-valuenow={correctCount}
              aria-valuetext={`${correctCount} de ${GOAL} pellets acertados`}
              className="h-3 w-full overflow-hidden rounded-full bg-yellow-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-fuchsia-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-yellow-700 bg-yellow-950/80 p-3 text-sm">
              <span aria-live="polite">
                <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-red-300">{lives}</strong>
              </span>
              {invulnerable && (
                <span role="status" className="font-bold text-fuchsia-300">
                  <span aria-hidden="true">⭐ </span>Invulnerable
                </span>
              )}
              <span>
                <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-yellow-300">{starsThisRound}</strong>
              </span>
            </div>

            <div className="rounded-2xl border-2 border-fuchsia-400 bg-yellow-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-yellow-300">
                  {problem.flavor}
                </p>
              )}
              <p id={promptId} className="text-2xl font-black text-fuchsia-200 sm:text-3xl">
                {problem.prompt}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative mx-auto grid aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-2 border-yellow-700 bg-slate-900"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
            >
              {pellets.map((p) => (
                <div
                  key={`pellet-${p.x}-${p.y}`}
                  className="m-[6%] flex items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-fuchsia-200"
                  style={{ gridColumn: p.x + 1, gridRow: p.y + 1 }}
                >
                  {p.value}
                </div>
              ))}
              {powerPellet && (
                <div
                  className="m-[10%] flex items-center justify-center rounded-full bg-fuchsia-500 text-xs"
                  style={{ gridColumn: powerPellet.x + 1, gridRow: powerPellet.y + 1 }}
                >
                  ⭐
                </div>
              )}
              <div
                className={`${reducedMotion ? "" : "transition-all duration-150"} m-[8%] flex items-center justify-center rounded-full ${
                  invulnerable ? "bg-fuchsia-300" : "bg-yellow-400"
                }`}
                style={{ gridColumn: player.x + 1, gridRow: player.y + 1 }}
              >
                🟡
              </div>
              <div
                className={`${reducedMotion ? "" : "transition-all duration-150"} m-[8%] flex items-center justify-center rounded-full ${
                  invulnerable ? "bg-slate-500 opacity-50" : "bg-slate-200"
                }`}
                style={{ gridColumn: ghost.x + 1, gridRow: ghost.y + 1 }}
              >
                👻
              </div>
            </div>

            <TouchDPad onMove={onTouchMove} />
          </div>
        )}

        {phase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {win ? "🏆" : "👻"}
            </div>
            <h3 className="text-3xl font-bold text-fuchsia-200">{win ? "¡Laberinto resuelto!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-yellow-700 bg-yellow-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Pellets acertados:</span>
                <strong className="text-yellow-300">{correctCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estrellas ganadas:</span>
                <strong className="text-fuchsia-300">+{starsThisRound} ★</strong>
              </div>
              {bestScore != null && (
                <div className="flex justify-between border-t border-yellow-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            <button type="button" onClick={start} className="rounded-xl bg-fuchsia-600 px-8 py-3 font-bold text-white hover:bg-fuchsia-500">
              Jugar de nuevo 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
