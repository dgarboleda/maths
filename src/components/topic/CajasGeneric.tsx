"use client";

import { useId, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { choiceSet, type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { TouchDPad } from "@/components/level/runtime/TouchDPad";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { lessonArcadeState, lessonLabel, lessonValues } from "@/lib/minigames/lessonArcade";

const COLS = 5;
const ROWS = 6; // la fila 0 es el camión
const BOX_ROW = 3;
const START = { x: Math.floor(COLS / 2), y: ROWS - 1 };
const GOAL = 3;
const LIVES_START = 3;

type Phase = "start" | "playing" | "over";
type Cell = { x: number; y: number };
type Box = Cell & { value: number };

function layout(values: number[]): Box[] {
  return values.slice(0, COLS).map((value, x) => ({ x, y: BOX_ROW, value }));
}

/**
 * Caja numérica (tipo Sokoban) — mismo contrato que el resto de la serie
 * retro (docs/plan-minijuegos-retro.md). Por turnos y sin reloj: nada se
 * mueve si el jugador no pulsa una flecha, así que no hay fallos de
 * reflejos. Se empuja una caja (nunca se tira de ella) y una caja no
 * empuja a otra; la que llega a la fila del camión es la respuesta.
 *
 * Una caja contra la pared de abajo ya no puede subir: «Reiniciar cajas»
 * vuelve a colocarlas sin coste, como en el Sokoban clásico.
 */
export function CajasGeneric({
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
  /** Se llama al agotar las vidas o al ganar, con las entregas correctas. */
  onGameOver?: (correctCount: number) => void;
  /** Modo clase: solo la caja que llega al camión envía una respuesta. */
  exercise?: LessonExercise;
}) {
  const newProblem = () => exercise?.problem ?? getModule(moduleId)!.generateProblem();
  const { lesson, frozen, solved } = lessonArcadeState(exercise);
  const goal = lesson ? 1 : GOAL;
  const promptId = useId();

  const [phase, setPhase] = useState<Phase>("start");
  const [player, setPlayer] = useState<Cell>(START);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [lives, setLives] = useState(LIVES_START);
  const [legacyProblem, setProblem] = useState<Problem>(newProblem);
  const problem = exercise?.problem ?? legacyProblem;
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);
  const candidatesRef = useRef<number[]>([]);
  const busyRef = useRef(false); // true mientras se espera la respuesta

  function resetBoxes() {
    setPlayer(START);
    setBoxes(layout(candidatesRef.current));
  }

  function spawnRound() {
    const nextProblem = newProblem();
    setProblem(nextProblem);
    candidatesRef.current = exercise ? lessonValues(exercise) : choiceSet(nextProblem.answer, Math.max(8, COLS * 2), COLS);
    resetBoxes();
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
    setPhase("playing");
    spawnRound();
  }

  async function resolveRound(correct: boolean) {
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
  }

  async function deliverLesson(value: number) {
    busyRef.current = true;
    try {
      // Se envía la caja entregada: el resultado lo decide el servidor.
      await exercise!.onResponse(value);
    } finally {
      resetBoxes();
      busyRef.current = false;
    }
  }

  const inside = (c: Cell) => c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS;
  const boxAt = (c: Cell) => boxes.findIndex((b) => b.x === c.x && b.y === c.y);

  function move(dx: number, dy: number) {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    const target = { x: player.x + dx, y: player.y + dy };
    if (!inside(target)) return;
    const pushed = boxAt(target);
    if (pushed < 0) {
      setPlayer(target);
      return;
    }
    const beyond = { x: target.x + dx, y: target.y + dy };
    if (!inside(beyond) || boxAt(beyond) >= 0) return; // pared u otra caja
    const box = boxes[pushed];
    setBoxes(boxes.map((b, i) => (i === pushed ? { ...b, ...beyond } : b)));
    setPlayer(target);
    if (beyond.y === 0) {
      playSound("click", soundOn);
      if (lesson) void deliverLesson(box.value);
      else void resolveRound(box.value === problem.answer);
    }
  }

  useArrowKeys(
    {
      up: () => move(0, -1),
      down: () => move(0, 1),
      left: () => move(-1, 0),
      right: () => move(1, 0),
    },
    { enabled: phase === "playing" && !frozen && !solved },
  );

  function onTouchMove(dx: number, dy: number) {
    if (dx !== 0) move(Math.sign(dx), 0);
    else if (dy !== 0) move(0, Math.sign(dy));
  }

  const shownPhase = solved ? "over" : phase;
  const shownCount = lesson ? Number(solved) : correctCount;
  const shownWin = lesson ? solved : win;
  const goalProgressPct = Math.min(100, (shownCount / goal) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border-4 border-orange-500 bg-slate-950 p-6 text-white shadow-2xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#fb923c 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <div className="relative z-10 mx-auto max-w-md text-center">
        <h2 className="mb-2 bg-gradient-to-r from-orange-300 to-sky-400 bg-clip-text text-3xl font-extrabold text-transparent">
          📦 Caja numérica
        </h2>
        <p className="mb-6 text-sm text-orange-200">Empuja hasta el camión la caja con el resultado correcto.</p>

        {shownPhase === "start" && (
          <div className="space-y-6 py-8">
            <div aria-hidden="true" className="animate-bounce text-6xl">
              📦
            </div>
            <button
              type="button"
              onClick={start}
              disabled={frozen}
              className="rounded-2xl border-2 border-white bg-gradient-to-r from-orange-400 to-sky-500 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-orange-300">
              Usa las flechas (o los botones) para moverte. Sin prisa: nada se mueve hasta que tú lo decides.
            </p>
          </div>
        )}

        {shownPhase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Cajas entregadas"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={shownCount}
              aria-valuetext={`${shownCount} de ${goal} cajas entregadas`}
              className="h-3 w-full overflow-hidden rounded-full bg-orange-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-sky-400 transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            {!lesson && (
              <div className="flex items-center justify-between rounded-xl border border-orange-700 bg-orange-950/80 p-3 text-sm">
                <span aria-live="polite">
                  <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-orange-300">{lives}</strong>
                </span>
                <span>
                  <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-sky-300">{starsThisRound}</strong>
                </span>
              </div>
            )}

            <div className="rounded-2xl border-2 border-sky-400 bg-orange-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-orange-300">
                  {problem.flavor}
                </p>
              )}
              <p id={promptId} className="text-2xl font-black text-sky-200 sm:text-3xl">
                {problem.prompt}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="mx-auto grid max-w-sm gap-1 rounded-2xl border-2 border-orange-700 bg-slate-900 p-2"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {Array.from({ length: ROWS * COLS }, (_, i) => {
                const cell = { x: i % COLS, y: Math.floor(i / COLS) };
                const box = boxes[boxAt(cell)];
                const isPlayer = player.x === cell.x && player.y === cell.y;
                return (
                  <div
                    key={i}
                    className={`flex h-11 items-center justify-center rounded-md text-sm font-black ${
                      box ? "bg-orange-400 text-slate-900" : cell.y === 0 ? "bg-sky-900/70 text-sky-200" : "bg-slate-800"
                    }`}
                  >
                    {box ? lessonLabel(exercise, box.value) : isPlayer ? "🧑" : cell.y === 0 ? "🚚" : ""}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={resetBoxes}
              disabled={frozen}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-orange-200 hover:bg-slate-700"
            >
              Reiniciar cajas
            </button>

            <TouchDPad inline onMove={onTouchMove} />
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="text-6xl">
              {shownWin ? "🏆" : "📦"}
            </div>
            <h3 className="text-3xl font-bold text-sky-200">{shownWin ? "¡Caja entregada!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-orange-700 bg-orange-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Cajas entregadas:</span>
                <strong className="text-sky-300">{shownCount}</strong>
              </div>
              {!lesson && (
                <div className="flex justify-between">
                  <span>Estrellas ganadas:</span>
                  <strong className="text-orange-300">+{starsThisRound} ★</strong>
                </div>
              )}
              {bestScore != null && (
                <div className="flex justify-between border-t border-orange-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            {!lesson && (
              <button type="button" onClick={start} className="rounded-xl bg-sky-600 px-8 py-3 font-bold text-white hover:bg-sky-500">
                Jugar de nuevo 🔄
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
